'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — app.js  v4
   المحرك الرئيسي للتطبيق
   ═══════════════════════════════════════════════════ */

/* ─── الحالة ─── */
let isLoading  = false;
let abortCtrl  = null;
let settings   = {};
let sessions   = {};
let searchIdx  = [];

/* ─── التهيئة ─── */
document.addEventListener('DOMContentLoaded', () => {
  /* إخفاء شاشة التحميل بعد تحميل التطبيق */
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) { splash.classList.add('splash-hide'); setTimeout(() => splash.remove(), 600); }
  }, 1200);

  sessions = Store.loadSessions();
  settings = Store.loadSettings();

  /* تهيئة الوحدات */
  Theme.init(settings);
  Chat.init(sessions, settings);
  Voice.init(settings,
    () => { document.getElementById('btnMic')?.classList.add('listening'); },
    () => { document.getElementById('btnMic')?.classList.remove('listening'); }
  );

  buildSearchIndex();
  bindEvents();
  registerSW();

  /* اختصارات لوحة المفاتيح */
  UI.initKeyboard({
    openSearch   : () => openSearchPanel(),
    newChat      : () => { Chat.newChat(); document.getElementById('userInput')?.focus(); },
    focusInput   : () => document.getElementById('userInput')?.focus(),
    toggleSidebar: () => toggleSidebar(),
    exportChat   : () => Store.exportSession(Chat.getActive()),
    dismiss      : () => closeAllPanels(),
  });

  UI.initScrollBtn(document.getElementById('messagesArea'));
  Chat.showWelcome();
  Chat.renderList();

  /* سؤال التثبيت (PWA) */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.add('show');
  });
  document.getElementById('btnInstall')?.addEventListener('click', () => {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
    document.getElementById('installBanner')?.classList.remove('show');
  });
  document.getElementById('btnInstallClose')?.addEventListener('click', () => {
    document.getElementById('installBanner')?.classList.remove('show');
  });

  /* تغيير حجم النافذة */
  window.addEventListener('resize', () => {
    UI.scrollToBottom(document.getElementById('messagesArea'));
  });
});

/* ─── تسجيل Service Worker ─── */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

/* ─── ربط الأحداث ─── */
function bindEvents() {
  const userInput  = document.getElementById('userInput');
  const btnSend    = document.getElementById('btnSend');
  const btnMic     = document.getElementById('btnMic');
  const btnTheme   = document.getElementById('btnTheme');
  const btnMenu    = document.getElementById('btnMenuToggle');
  const sideOverlay= document.getElementById('sidebarOverlay');
  const sideClose  = document.getElementById('sidebarClose');
  const btnNew     = document.getElementById('btnNewChat');
  const btnCall    = document.getElementById('btnCall');
  const btnVCBig   = document.getElementById('btnVoiceCallBig');
  const btnEndCall = document.getElementById('btnEndCall');
  const btnMute    = document.getElementById('btnMute');
  const waModalEl  = document.getElementById('waModal');
  const waClose    = document.getElementById('waModalClose');
  const waLink     = document.getElementById('waLink');
  const btnSearch  = document.getElementById('btnSearch');
  const btnSettings= document.getElementById('btnSettings');
  const btnStats   = document.getElementById('btnStats');
  const btnShare   = document.getElementById('btnShareChat');
  const btnStop    = document.getElementById('btnStop');
  const charCount  = document.getElementById('charCount');
  const searchInput= document.getElementById('searchInput');
  const searchClose= document.getElementById('searchClose');

  if (waLink) waLink.href = CFG.WA_LINK;

  /* إدخال المستخدم */
  userInput?.addEventListener('input', () => {
    UI.autoResize(userInput);
    UI.updateCharCount(userInput, charCount);
    if (btnSend) btnSend.disabled = !userInput.value.trim() || isLoading;
  });
  userInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  btnSend?.addEventListener('click', sendMessage);

  /* ميكروفون */
  btnMic?.addEventListener('click', () => {
    UI.haptic([15]);
    Voice.startListening(userInput, btnMic, text => {
      if (text.trim()) { userInput.value = text; sendMessage(); }
    });
  });

  /* الثيم */
  btnTheme?.addEventListener('click', () => { Theme.toggle(); UI.haptic([5]); });

  /* الشريط الجانبي */
  btnMenu?.addEventListener('click', toggleSidebar);
  sideOverlay?.addEventListener('click', closeSidebar);
  sideClose?.addEventListener('click', closeSidebar);
  btnNew?.addEventListener('click', () => { Chat.newChat(); document.getElementById('userInput')?.focus(); closeSidebar(); });

  /* بحث */
  btnSearch?.addEventListener('click', openSearchPanel);
  searchClose?.addEventListener('click', closeSearchPanel);
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.trim();
    renderSearchResults(q);
  });

  /* إعدادات */
  btnSettings?.addEventListener('click', toggleSettingsPanel);

  /* إحصائيات */
  btnStats?.addEventListener('click', showStatsPanel);

  /* مشاركة */
  btnShare?.addEventListener('click', () => UI.shareSession(Chat.getActive()));

  /* إيقاف التوليد */
  btnStop?.addEventListener('click', () => { abortCtrl?.abort(); abortCtrl = null; });

  /* المكالمة الصوتية */
  const callUI = getCallUI();
  btnCall?.addEventListener('click', () => initiateCall(callUI));
  btnVCBig?.addEventListener('click', () => initiateCall(callUI));
  btnEndCall?.addEventListener('click', () => endCall(callUI));
  btnMute?.addEventListener('click', () => Voice.toggleMute({
    muteBtn: btnMute,
    status: callUI.status,
    _onAIResponse: callUI._onAIResponse,
  }));

  /* واتساب */
  waClose?.addEventListener('click', () => waModalEl?.classList.remove('active'));
  waModalEl?.addEventListener('click', e => { if (e.target === waModalEl) waModalEl.classList.remove('active'); });

  /* الأسئلة السريعة */
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.prompt;
      if (q === '__contact__') { document.getElementById('waModal')?.classList.add('active'); return; }
      const input = document.getElementById('userInput');
      if (input) { input.value = q; UI.autoResize(input); sendMessage(); }
    });
  });

  /* إعدادات المظهر */
  document.querySelectorAll('[data-font-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-font-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Theme.setFontSize(btn.dataset.fontSize);
    });
  });
  document.querySelectorAll('[data-density]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-density]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Theme.setDensity(btn.dataset.density);
    });
  });
  document.getElementById('accentPicker')?.addEventListener('input', e => {
    Theme.setAccent(e.target.value);
    settings.accent = e.target.value;
  });

  /* إعدادات الصوت */
  document.getElementById('ttsToggle')?.addEventListener('change', e => {
    settings.ttsEnabled = e.target.checked;
    Voice.updateSettings(settings);
    Store.saveSettings(settings);
  });
  document.getElementById('voiceRateSlider')?.addEventListener('input', e => {
    settings.voiceRate = parseFloat(e.target.value);
    document.getElementById('voiceRateVal').textContent = settings.voiceRate.toFixed(1) + 'x';
    Voice.updateSettings(settings);
    Store.saveSettings(settings);
  });
  document.getElementById('autoTitleToggle')?.addEventListener('change', e => {
    settings.autoTitle = e.target.checked;
    Store.saveSettings(settings);
  });

  /* مسح الكل */
  document.getElementById('btnClearAll')?.addEventListener('click', () => {
    if (!confirm('سيتم حذف كل المحادثات والإعدادات. هل أنت متأكد؟')) return;
    Store.clearAll();
    location.reload();
  });
}

/* ─── إرسال الرسالة ─── */
async function sendMessage() {
  const input   = document.getElementById('userInput');
  const btnSend = document.getElementById('btnSend');
  const btnStop = document.getElementById('btnStop');
  if (!input) return;
  const text = input.value.trim();
  if (!text || isLoading) return;

  /* تحقق من كلمات التواصل */
  if (CFG.CONTACT_KW.some(k => text.toLowerCase().includes(k))) {
    document.getElementById('waModal')?.classList.add('active');
  }

  /* تجهيز الجلسة */
  if (!Chat.getActiveId()) {
    const id = Chat.createSession();
    Chat.loadSession(id);
  }
  const sid = Chat.getActiveId();

  /* تسمية تلقائية عند أول رسالة */
  const sess = Chat.getSessions()[sid];
  if (sess && sess.messages.length === 0) Chat.autoTitle(sid, text);

  /* أضف رسالة المستخدم */
  const userMsg = Chat.addMessage(sid, 'user', text);
  Chat.appendBubble(userMsg, true);
  if (settings.soundEffects) UI.playEffect('send');

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('charCount').textContent = '';
  if (btnSend) btnSend.disabled = true;

  /* مؤشر الكتابة */
  UI.showTypingIndicator(document.getElementById('messagesList'));

  isLoading = true;
  abortCtrl = new AbortController();
  if (btnStop) btnStop.classList.add('show');

  const messages = (sess?.messages || [])
    .slice(0, -1)
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: text });

  try {
    const resp = await fetch(CFG.AI_ENDPOINT, {
      method : 'POST',
      signal : abortCtrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model   : 'openai',
        stream  : true,
        messages: [{ role: 'system', content: CFG.SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    UI.removeTypingIndicator();
    const bubbleEl = Chat.createStreamingBubble();
    let fullText = '';

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const j = JSON.parse(data);
          const delta = j.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            Chat.updateStreamingBubble(bubbleEl, MD.render(fullText));
          }
        } catch {}
      }
    }

    /* حفظ الرد النهائي */
    Chat.finalizeStreamingBubble(bubbleEl);
    const aiMsg = Chat.addMessage(sid, 'assistant', fullText);
    Chat.updateStreamingMsg(sid, fullText);

    /* استبدل فقاعة البث بفقاعة حقيقية */
    const streamRow = document.getElementById('streamRow');
    if (streamRow && aiMsg) {
      streamRow.remove();
      Chat.appendBubble(aiMsg);
    }

    if (settings.soundEffects) UI.playEffect('recv');
    if (settings.ttsEnabled)   Voice.speak(fullText);

    buildSearchIndex();

  } catch (err) {
    UI.removeTypingIndicator();
    if (err.name !== 'AbortError') {
      const errMsg = Chat.addMessage(sid, 'assistant', '⚠️ حدث خطأ في الاتصال. تحقق من الإنترنت وحاول مرة أخرى.');
      Chat.appendBubble(errMsg, true);
    }
  } finally {
    isLoading = false;
    abortCtrl = null;
    if (btnSend) btnSend.disabled = false;
    if (btnStop) btnStop.classList.remove('show');
    buildSearchIndex();
  }
}

/* ─── المكالمة الصوتية ─── */
function getCallUI() {
  return {
    overlay : document.getElementById('callOverlay'),
    status  : document.getElementById('callStatus'),
    timer   : document.getElementById('callTimer'),
    wave    : document.getElementById('callWave'),
    aiText  : document.getElementById('transcriptAI'),
    userText: document.getElementById('transcriptUser'),
    muteBtn : document.getElementById('btnMute'),
  };
}

function initiateCall(ui) {
  Voice.startCall(ui, async (userText, history, onReply) => {
    const msgs = [
      { role: 'system', content: CFG.SYSTEM_PROMPT + '\nأجب بإيجاز شديد كأنك في مكالمة هاتفية.' },
      ...history.slice(-6),
      { role: 'user', content: userText },
    ];
    try {
      const resp = await fetch(CFG.AI_ENDPOINT, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ model: 'openai', stream: false, messages: msgs }),
      });
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'لم أفهم، ممكن تعيد؟';
      onReply(reply);
    } catch { onReply('في مشكلة في الاتصال، حاول تاني.'); }
  });
}

function endCall(ui) {
  Voice.endCall();
  if (ui.overlay) ui.overlay.classList.remove('active');
}

/* ─── لوحة البحث ─── */
function openSearchPanel() {
  const panel = document.getElementById('searchPanel');
  if (!panel) return;
  panel.classList.add('open');
  setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
}
function closeSearchPanel() {
  document.getElementById('searchPanel')?.classList.remove('open');
}

function buildSearchIndex() {
  searchIdx = UI.buildSearchIndex(Chat.getSessions());
}

function renderSearchResults(query) {
  const container = document.getElementById('searchResults');
  if (!container) return;
  if (!query) { container.innerHTML = ''; return; }
  const results = UI.searchIndex(searchIdx, query);
  if (!results.length) {
    container.innerHTML = '<div class="search-empty">لا توجد نتائج</div>';
    return;
  }
  container.innerHTML = results.map(r => `
    <div class="search-result" data-sid="${r.sessionId}">
      <div class="sr-session">${Store.escHtml(r.sessionTitle)}</div>
      <div class="sr-snippet">${UI.highlight(r.content.slice(0, 80), query)}…</div>
      <div class="sr-role">${r.role === 'user' ? '👤 أنت' : '🤖 السعيد AI'}</div>
    </div>`).join('');
  container.querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('click', () => {
      Chat.loadSession(el.dataset.sid);
      closeSearchPanel();
    });
  });
}

/* ─── لوحة الإعدادات ─── */
function toggleSettingsPanel() {
  const p = document.getElementById('settingsPanel');
  if (!p) return;
  const isOpen = p.classList.contains('open');
  closeAllPanels();
  if (!isOpen) {
    p.classList.add('open');
    syncSettingsUI();
  }
}

function syncSettingsUI() {
  const s = settings;
  document.querySelectorAll('[data-font-size]').forEach(b =>
    b.classList.toggle('active', b.dataset.fontSize === s.fontSize));
  document.querySelectorAll('[data-density]').forEach(b =>
    b.classList.toggle('active', b.dataset.density === s.density));
  const picker = document.getElementById('accentPicker');
  if (picker) picker.value = s.accent || '#4f6ef7';
  const ttsToggle = document.getElementById('ttsToggle');
  if (ttsToggle) ttsToggle.checked = !!s.ttsEnabled;
  const rateSlider = document.getElementById('voiceRateSlider');
  if (rateSlider) { rateSlider.value = s.voiceRate || 1; document.getElementById('voiceRateVal').textContent = (s.voiceRate||1).toFixed(1)+'x'; }
  const autoTitle = document.getElementById('autoTitleToggle');
  if (autoTitle) autoTitle.checked = s.autoTitle !== false;
}

/* ─── الإحصائيات ─── */
function showStatsPanel() {
  const panel = document.getElementById('statsPanel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  closeAllPanels();
  if (!isOpen) {
    const stats = Store.getStats(Chat.getSessions());
    const el = document.getElementById('statsContent');
    if (el) el.innerHTML = `
      <div class="stat-item"><span class="stat-num">${stats.sessions}</span><span class="stat-label">محادثة</span></div>
      <div class="stat-item"><span class="stat-num">${stats.totalMsgs}</span><span class="stat-label">رسالة كلية</span></div>
      <div class="stat-item"><span class="stat-num">${stats.userMsgs}</span><span class="stat-label">رسائلك أنت</span></div>
      <div class="stat-item"><span class="stat-num">${stats.totalMsgs - stats.userMsgs}</span><span class="stat-label">ردود الذكاء</span></div>`;
    panel.classList.add('open');
  }
}

/* ─── إغلاق كل اللوحات ─── */
function closeAllPanels() {
  ['searchPanel','settingsPanel','statsPanel'].forEach(id =>
    document.getElementById(id)?.classList.remove('open'));
}

/* ─── الشريط الجانبي ─── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) closeSidebar();
  else { sidebar.classList.add('open'); overlay?.classList.add('show'); }
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
}
