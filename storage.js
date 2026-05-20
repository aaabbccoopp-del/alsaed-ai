'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — storage.js
   إدارة التخزين المحلي (LocalStorage)
   ═══════════════════════════════════════════════════ */

window.Store = (() => {

  /* ── جلسات المحادثات ── */
  function loadSessions() {
    try { return JSON.parse(localStorage.getItem(CFG.STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveSessions(sessions) {
    try { localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify(sessions)); } catch {}
  }

  /* ── الإعدادات ── */
  const DEFAULTS = {
    theme    : 'light',
    fontSize : 'md',
    density  : 'comfortable',
    accent   : '#4f6ef7',
    voiceLang: 'ar',
    voiceRate : 1.0,
    voicePitch: 1.0,
    ttsEnabled: true,
    autoTitle : true,
    soundEffects: true,
  };

  function loadSettings() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(CFG.SETTINGS_KEY) || '{}'));
    } catch { return Object.assign({}, DEFAULTS); }
  }
  function saveSettings(s) {
    try { localStorage.setItem(CFG.SETTINGS_KEY, JSON.stringify(s)); } catch {}
  }

  /* ── المثبتات ── */
  function loadPins() {
    try { return JSON.parse(localStorage.getItem(CFG.PINS_KEY) || '[]'); }
    catch { return []; }
  }
  function savePins(pins) {
    try { localStorage.setItem(CFG.PINS_KEY, JSON.stringify(pins)); } catch {}
  }

  /* ── أدوات مساعدة ── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'الآن';
    if (diffMin < 60) return `${diffMin} د`;
    if (diffMin < 1440) {
      return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  }
  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ── إحصائيات ── */
  function getStats(sessions) {
    const sessArr = Object.values(sessions);
    const totalMsgs = sessArr.reduce((a, s) => a + (s.messages ? s.messages.length : 0), 0);
    const userMsgs  = sessArr.reduce((a, s) =>
      a + (s.messages ? s.messages.filter(m => m.role === 'user').length : 0), 0);
    return { sessions: sessArr.length, totalMsgs, userMsgs };
  }

  /* ── تصدير محادثة ── */
  function exportSession(session) {
    if (!session) return;
    const lines = [`=== ${session.title} ===\n`];
    (session.messages || []).forEach(m => {
      const who = m.role === 'user' ? '👤 أنت' : '🤖 السعيد AI';
      lines.push(`${who}:\n${m.content}\n`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${session.title.replace(/[^\u0600-\u06FFa-z0-9]/gi,'_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ── مسح كل شيء ── */
  function clearAll() {
    localStorage.removeItem(CFG.STORAGE_KEY);
    localStorage.removeItem(CFG.SETTINGS_KEY);
    localStorage.removeItem(CFG.PINS_KEY);
  }

  return { loadSessions, saveSessions, loadSettings, saveSettings,
           loadPins, savePins, uid, formatTime, escHtml, getStats, exportSession, clearAll };
})();
