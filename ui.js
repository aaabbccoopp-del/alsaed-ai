'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — ui.js
   أدوات واجهة المستخدم: توست، اختصارات، سكرول، بحث
   ═══════════════════════════════════════════════════ */

window.UI = (() => {

  /* ════════════════ توست الإشعارات ════════════════ */
  let toastTimer = null;
  function toast(msg, type = 'info', duration = 3000) {
    let el = document.getElementById('toastEl');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toastEl';
      el.className = 'toast-wrap';
      document.body.appendChild(el);
    }
    clearTimeout(toastTimer);
    const icons = { info:'💡', success:'✅', error:'❌', warn:'⚠️' };
    el.innerHTML = `<span class="toast-icon">${icons[type]||'💡'}</span><span class="toast-msg">${Store.escHtml(msg)}</span>`;
    el.className = `toast-wrap toast-${type} toast-show`;
    toastTimer = setTimeout(() => { el.classList.remove('toast-show'); }, duration);
  }

  /* ════════════════ هزّ الجهاز (Haptic) ════════════ */
  function haptic(pattern = [10]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  /* ════════════════ زر اسكرول للأسفل ════════════════ */
  function initScrollBtn(areaEl) {
    const btn = document.getElementById('btnScrollBottom');
    if (!btn || !areaEl) return;
    areaEl.addEventListener('scroll', () => {
      const nearBottom = areaEl.scrollHeight - areaEl.scrollTop - areaEl.clientHeight < 120;
      btn.classList.toggle('show', !nearBottom);
    });
    btn.addEventListener('click', () => scrollToBottom(areaEl));
  }
  function scrollToBottom(areaEl) {
    if (!areaEl) return;
    areaEl.scrollTo({ top: areaEl.scrollHeight, behavior: 'smooth' });
  }

  /* ════════════════ بحث عالمي ════════════════ */
  function buildSearchIndex(sessions) {
    const idx = [];
    Object.values(sessions).forEach(s => {
      (s.messages || []).forEach(m => {
        idx.push({ sessionId: s.id, sessionTitle: s.title, role: m.role, content: m.content, ts: m.timestamp });
      });
    });
    return idx;
  }
  function searchIndex(idx, query) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return idx.filter(r => r.content.toLowerCase().includes(q)).slice(0, 40);
  }

  /* ════════════════ بحث في محادثة ════════════════ */
  function searchInMessages(messages, query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return (messages || []).filter(m => m.content.toLowerCase().includes(q));
  }

  /* ════════════════ مؤشر الكتابة ════════════════ */
  function showTypingIndicator(listEl) {
    removeTypingIndicator();
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    row.id = 'typingRow';
    row.innerHTML = `
      <div class="msg-avatar"><img src="avatar.png" alt="AI"></div>
      <div class="msg-content"><div class="msg-bubble typing-bubble">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div></div>`;
    listEl.appendChild(row);
    listEl.parentElement.scrollTo({ top: listEl.parentElement.scrollHeight, behavior:'smooth' });
  }
  function removeTypingIndicator() {
    const el = document.getElementById('typingRow');
    if (el) el.remove();
  }

  /* ════════════════ اختصارات لوحة المفاتيح ════════════════ */
  function initKeyboard(callbacks) {
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k') { e.preventDefault(); callbacks.openSearch?.(); }
        if (e.key === 'n') { e.preventDefault(); callbacks.newChat?.(); }
        if (e.key === '/') { e.preventDefault(); callbacks.focusInput?.(); }
        if (e.key === 'b') { e.preventDefault(); callbacks.toggleSidebar?.(); }
        if (e.key === 'e') { e.preventDefault(); callbacks.exportChat?.(); }
      }
      if (e.key === 'Escape') { callbacks.dismiss?.(); }
    });
  }

  /* ════════════════ عداد الحروف ════════════════ */
  function updateCharCount(inputEl, counterEl) {
    if (!inputEl || !counterEl) return;
    const len = inputEl.value.length;
    counterEl.textContent = len > 0 ? `${len} حرف` : '';
    counterEl.classList.toggle('warn', len > 3000);
  }

  /* ════════════════ تكبير النص تلقائياً ════════════════ */
  function autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }

  /* ════════════════ تأثيرات الأصوات ════════════════ */
  function playEffect(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'send') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'recv') {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'callStart') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}
  }

  /* ════════════════ مشاركة المحادثة ════════════════ */
  function shareSession(session) {
    if (!session) return;
    const text = (session.messages || [])
      .map(m => `${m.role === 'user' ? '👤 أنت' : '🤖 السعيد AI'}:\n${m.content}`)
      .join('\n\n');
    if (navigator.share) {
      navigator.share({ title: session.title, text }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(() => toast('تم نسخ المحادثة', 'success')).catch(()=>{});
    }
  }

  /* ════════════════ تعليم النص المبحوث ════════════════ */
  function highlight(text, query) {
    if (!query) return Store.escHtml(text);
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return Store.escHtml(text).replace(re, '<mark class="search-mark">$1</mark>');
  }

  return { toast, haptic, initScrollBtn, scrollToBottom,
           buildSearchIndex, searchIndex, searchInMessages,
           showTypingIndicator, removeTypingIndicator,
           initKeyboard, updateCharCount, autoResize,
           playEffect, shareSession, highlight };
})();
