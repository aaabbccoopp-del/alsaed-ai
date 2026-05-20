'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — chat.js
   إدارة الجلسات والرسائل وعرضها
   ═══════════════════════════════════════════════════ */

window.Chat = (() => {
  let sessions   = {};
  let pins       = [];
  let activeId   = null;
  let settings   = {};

  /* ─── عناصر DOM ─── */
  let _listEl, _welcomeEl, _msgsEl, _titleEl, _areaEl;

  function init(s, sets) {
    sessions  = s;
    settings  = sets;
    pins      = Store.loadPins();
    _listEl   = document.getElementById('messagesList');
    _welcomeEl= document.getElementById('welcomeScreen');
    _msgsEl   = document.getElementById('messagesArea');
    _titleEl  = document.getElementById('headerTitle');
    _areaEl   = document.getElementById('messagesArea');
  }

  /* ─── الجلسات ─── */
  function createSession() {
    const id = Store.uid();
    sessions[id] = { id, title: 'محادثة جديدة', messages: [], createdAt: Date.now() };
    Store.saveSessions(sessions);
    return id;
  }

  function deleteSession(id) {
    delete sessions[id];
    Store.saveSessions(sessions);
    if (activeId === id) { activeId = null; showWelcome(); }
    renderList();
  }

  function loadSession(id) {
    if (!sessions[id]) return;
    activeId = id;
    _titleEl.textContent = sessions[id].title;
    renderMessages();
    renderList();
  }

  function newChat() {
    activeId = null;
    _titleEl.textContent = CFG.APP_NAME;
    showWelcome();
    renderList();
  }

  function togglePin(id) {
    if (pins.includes(id)) pins = pins.filter(p => p !== id);
    else pins.unshift(id);
    Store.savePins(pins);
    renderList();
  }

  function getActive() { return sessions[activeId] || null; }
  function getActiveId() { return activeId; }
  function getSessions() { return sessions; }

  /* ─── تسمية تلقائية ─── */
  function autoTitle(id, firstUserMsg) {
    if (!sessions[id] || !settings.autoTitle) return;
    const title = firstUserMsg.trim().slice(0, 35) + (firstUserMsg.length > 35 ? '…' : '');
    sessions[id].title = title;
    _titleEl.textContent = title;
    Store.saveSessions(sessions);
    renderList();
  }

  /* ─── الرسائل ─── */
  function addMessage(id, role, content) {
    if (!sessions[id]) return null;
    const msg = { id: Store.uid(), role, content, timestamp: Date.now() };
    sessions[id].messages.push(msg);
    Store.saveSessions(sessions);
    return msg;
  }

  function deleteMessage(sessionId, msgId) {
    if (!sessions[sessionId]) return;
    sessions[sessionId].messages = sessions[sessionId].messages.filter(m => m.id !== msgId);
    Store.saveSessions(sessions);
    const el = document.querySelector(`[data-mid="${msgId}"]`);
    if (el) el.classList.add('deleting');
    setTimeout(() => { el?.remove(); }, 300);
  }

  function editMessage(sessionId, msgId, newContent) {
    if (!sessions[sessionId]) return;
    const msg = sessions[sessionId].messages.find(m => m.id === msgId);
    if (!msg) return;
    msg.content = newContent;
    msg.edited  = true;
    Store.saveSessions(sessions);
    const bubble = document.querySelector(`[data-mid="${msgId}"] .msg-bubble`);
    if (bubble) bubble.innerHTML = `<p>${Store.escHtml(newContent)}</p><span class="edited-tag">✏️ معدّل</span>`;
  }

  function updateStreamingMsg(id, content) {
    if (!sessions[id] || !sessions[id].messages.length) return;
    const last = sessions[id].messages[sessions[id].messages.length - 1];
    if (last.role === 'assistant') { last.content = content; Store.saveSessions(sessions); }
  }

  /* ─── عرض القائمة ─── */
  function renderList() {
    const listEl = document.getElementById('sessionsList');
    const emptyEl= document.getElementById('sessionsEmpty');
    if (!listEl) return;
    document.querySelectorAll('.session-item').forEach(e => e.remove());

    const allSess = Object.values(sessions);
    emptyEl.style.display = allSess.length === 0 ? 'flex' : 'none';

    /* الثابتة أولاً ثم الباقي مرتبة بالتاريخ */
    const pinned   = allSess.filter(s => pins.includes(s.id)).sort((a,b) => b.createdAt - a.createdAt);
    const unpinned = allSess.filter(s => !pins.includes(s.id)).sort((a,b) => b.createdAt - a.createdAt);
    [...pinned, ...unpinned].forEach(s => {
      const div = document.createElement('div');
      div.className = 'session-item' + (s.id === activeId ? ' active' : '');
      const isPinned = pins.includes(s.id);
      div.innerHTML = `
        <svg class="session-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="session-title">${isPinned ? '📌 ' : ''}${Store.escHtml(s.title)}</span>
        <div class="session-actions">
          <button class="sess-act pin-btn" title="${isPinned ? 'فك التثبيت' : 'تثبيت'}">
            ${isPinned ? '📌' : '📍'}
          </button>
          <button class="sess-act exp-btn" title="تصدير">💾</button>
          <button class="sess-act del-btn" title="حذف">✕</button>
        </div>`;
      div.addEventListener('click', e => {
        if (e.target.closest('.session-actions')) return;
        loadSession(s.id);
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('show');
      });
      div.querySelector('.pin-btn').addEventListener('click', e => { e.stopPropagation(); togglePin(s.id); });
      div.querySelector('.exp-btn').addEventListener('click', e => { e.stopPropagation(); Store.exportSession(s); });
      div.querySelector('.del-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('حذف هذه المحادثة؟')) return;
        deleteSession(s.id);
      });
      listEl.appendChild(div);
    });
  }

  /* ─── عرض الرسائل ─── */
  function showWelcome() {
    _welcomeEl.style.display = 'flex';
    _listEl.innerHTML = '';
    typeWelcomeTitle();
  }

  function typeWelcomeTitle() {
    const el = document.getElementById('welcomeTitle');
    if (!el) return;
    const text = 'مرحباً! كيف يمكنني مساعدتك؟ 👋';
    el.textContent = '';
    let i = 0;
    const iv = setInterval(() => {
      if (i >= text.length) { clearInterval(iv); return; }
      el.textContent += text[i++];
    }, 35);
  }

  function renderMessages() {
    const session = sessions[activeId];
    if (!session || !session.messages.length) { showWelcome(); return; }
    _welcomeEl.style.display = 'none';
    _listEl.innerHTML = '';
    session.messages.forEach(msg => appendBubble(msg));
    UI.scrollToBottom(_areaEl);
  }

  function appendBubble(msg, animate = false) {
    _welcomeEl.style.display = 'none';
    const row = document.createElement('div');
    row.className = `msg-row ${msg.role}${animate ? ' msg-new' : ''}`;
    row.dataset.mid = msg.id;

    const content = msg.role === 'assistant'
      ? MD.render(msg.content)
      : `<p>${Store.escHtml(msg.content)}</p>`;

    const avatarHtml = msg.role === 'user'
      ? `<div class="msg-avatar-user">👤</div>`
      : `<div class="msg-avatar"><img src="avatar.png" alt="AI"></div>`;

    const editedTag = msg.edited ? '<span class="edited-tag">✏️ معدّل</span>' : '';
    const actionsHtml = `
      <div class="msg-actions">
        <button class="msg-act-btn copy-btn" data-raw="${encodeURIComponent(msg.content)}" title="نسخ">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> نسخ
        </button>
        ${msg.role === 'assistant' ? `<button class="msg-act-btn speak-btn" data-raw="${encodeURIComponent(msg.content)}" title="استمع">🔊 استمع</button>` : ''}
        ${msg.role === 'user' ? `<button class="msg-act-btn edit-btn" data-mid="${msg.id}" title="تعديل">✏️ تعديل</button>` : ''}
        <button class="msg-act-btn del-msg-btn" data-mid="${msg.id}" title="حذف">🗑️</button>
        <span class="msg-time">${Store.formatTime(msg.timestamp)}</span>
      </div>`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    contentDiv.innerHTML = `
      <div class="msg-bubble">${content}${editedTag}</div>
      ${actionsHtml}`;

    /* أحداث الأزرار */
    contentDiv.querySelector('.copy-btn').addEventListener('click', function() {
      const txt = decodeURIComponent(this.dataset.raw);
      navigator.clipboard.writeText(txt).then(() => {
        this.textContent = '✓ تم!';
        setTimeout(() => { this.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> نسخ`; }, 2000);
        UI.toast('تم النسخ', 'success');
      }).catch(()=>{});
    });

    contentDiv.querySelector('.speak-btn')?.addEventListener('click', function() {
      if (Voice.isSpeaking) { Voice.stopSpeaking(); this.textContent = '🔊 استمع'; return; }
      this.textContent = '⏹ إيقاف';
      Voice.speak(decodeURIComponent(this.dataset.raw)).then(() => { this.textContent = '🔊 استمع'; });
    });

    contentDiv.querySelector('.edit-btn')?.addEventListener('click', function() {
      const mid = this.dataset.mid;
      const session = sessions[activeId];
      if (!session) return;
      const m = session.messages.find(x => x.id === mid);
      if (!m) return;
      const bubble = row.querySelector('.msg-bubble');
      const old = m.content;
      bubble.innerHTML = `<textarea class="inline-edit">${Store.escHtml(old)}</textarea><div class="edit-actions"><button class="msg-act-btn save-edit">💾 حفظ</button><button class="msg-act-btn cancel-edit">إلغاء</button></div>`;
      bubble.querySelector('.save-edit').addEventListener('click', () => {
        const newVal = bubble.querySelector('.inline-edit').value.trim();
        if (newVal && newVal !== old) editMessage(activeId, mid, newVal);
        else renderMessages();
      });
      bubble.querySelector('.cancel-edit').addEventListener('click', () => renderMessages());
    });

    contentDiv.querySelector('.del-msg-btn').addEventListener('click', function() {
      deleteMessage(activeId, this.dataset.mid);
    });

    /* أزرار نسخ الكود */
    contentDiv.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = decodeURIComponent(btn.dataset.raw || '');
        navigator.clipboard.writeText(raw).then(() => {
          btn.textContent = '✓ تم!';
          setTimeout(() => { btn.textContent = '📋 نسخ'; }, 2000);
        }).catch(()=>{});
      });
    });

    row.innerHTML = '';
    if (msg.role === 'user') {
      row.appendChild(contentDiv);
      row.insertAdjacentHTML('afterbegin', avatarHtml);
    } else {
      row.insertAdjacentHTML('afterbegin', avatarHtml);
      row.appendChild(contentDiv);
    }

    _listEl.appendChild(row);
    if (animate) UI.scrollToBottom(_areaEl);
    return row;
  }

  /* ─── فقاعة البث ─── */
  function createStreamingBubble() {
    _welcomeEl.style.display = 'none';
    UI.removeTypingIndicator();
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    row.id = 'streamRow';
    row.innerHTML = `
      <div class="msg-avatar"><img src="avatar.png" alt="AI"></div>
      <div class="msg-content">
        <div class="msg-bubble" id="streamBubble"><span class="cursor-blink">|</span></div>
      </div>`;
    _listEl.appendChild(row);
    UI.scrollToBottom(_areaEl);
    return document.getElementById('streamBubble');
  }

  function updateStreamingBubble(bubbleEl, html) {
    bubbleEl.innerHTML = html + '<span class="cursor-blink">|</span>';
    UI.scrollToBottom(_areaEl);
  }

  function finalizeStreamingBubble(bubbleEl) {
    const cursor = bubbleEl.querySelector('.cursor-blink');
    if (cursor) cursor.remove();
    /* أضف أزرار نسخ الكود */
    bubbleEl.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = decodeURIComponent(btn.dataset.raw || '');
        navigator.clipboard.writeText(raw).then(() => {
          btn.textContent = '✓ تم!';
          setTimeout(() => { btn.textContent = '📋 نسخ'; }, 2000);
        }).catch(()=>{});
      });
    });
  }

  return {
    init, createSession, deleteSession, loadSession, newChat,
    togglePin, getActive, getActiveId, getSessions,
    autoTitle, addMessage, deleteMessage, editMessage,
    updateStreamingMsg, renderList, showWelcome, renderMessages,
    appendBubble, createStreamingBubble, updateStreamingBubble, finalizeStreamingBubble,
    typeWelcomeTitle,
  };
})();
