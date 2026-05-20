'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — theme.js
   إدارة المظهر: الثيم، حجم الخط، الكثافة، اللون
   ═══════════════════════════════════════════════════ */

window.Theme = (() => {
  let settings;

  function init(s) {
    settings = s;
    apply();
  }

  function apply() {
    const { theme, fontSize, density, accent } = settings;

    /* ثيم داكن/فاتح */
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', prefersDark);
    } else {
      document.body.classList.toggle('dark', theme === 'dark');
    }

    /* حجم الخط */
    const sizes = { sm: '13px', md: '15px', lg: '17px' };
    document.documentElement.style.setProperty('--font-size-base', sizes[fontSize] || '15px');

    /* الكثافة */
    const gaps = { compact: '12px', comfortable: '20px', spacious: '30px' };
    document.documentElement.style.setProperty('--msg-gap', gaps[density] || '20px');

    /* لون التمييز */
    if (accent) {
      document.documentElement.style.setProperty('--primary', accent);
      document.documentElement.style.setProperty('--primary-h', shadeColor(accent, -15));
      document.documentElement.style.setProperty('--primary-glow', hexToRgba(accent, 0.22));
      document.documentElement.style.setProperty('--user-bubble', accent);
    }

    /* تحديث أيقونة الثيم */
    updateThemeIcon(theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme);
  }

  function toggle() {
    const cur = document.body.classList.contains('dark') ? 'dark' : 'light';
    settings.theme = cur === 'dark' ? 'light' : 'dark';
    apply();
    Store.saveSettings(settings);
  }

  function setFontSize(size) {
    settings.fontSize = size;
    apply();
    Store.saveSettings(settings);
  }

  function setDensity(d) {
    settings.density = d;
    apply();
    Store.saveSettings(settings);
  }

  function setAccent(color) {
    settings.accent = color;
    apply();
    Store.saveSettings(settings);
  }

  function updateThemeIcon(t) {
    const el = document.getElementById('iconTheme');
    if (!el) return;
    el.innerHTML = t === 'dark'
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }

  /* أدوات الألوان */
  function shadeColor(hex, pct) {
    const n = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + pct));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct));
    const b = Math.min(255, Math.max(0, (n & 0xff) + pct));
    return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;
  }
  function hexToRgba(hex, alpha) {
    const n = parseInt(hex.replace('#',''), 16);
    return `rgba(${n>>16},${(n>>8)&0xff},${n&0xff},${alpha})`;
  }

  /* مراقبة تغيير ثيم النظام */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings && settings.theme === 'system') apply();
  });

  return { init, apply, toggle, setFontSize, setDensity, setAccent };
})();
