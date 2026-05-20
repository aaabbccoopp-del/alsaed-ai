'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — config.js
   الإعدادات والثوابت العامة
   ═══════════════════════════════════════════════════ */

window.CFG = {
  APP_NAME    : 'السعيد AI',
  APP_VER     : '4.0.0',
  DEV_NAME    : 'أحمد سعيد',
  DEV_PHONE   : '201090844039',
  AI_ENDPOINT : 'https://text.pollinations.ai/openai',
  TTS_API     : 'https://api.streamelements.com/kappa/v2/speech',
  STORAGE_KEY : 'saeed_ai_v4_sessions',
  SETTINGS_KEY: 'saeed_ai_v4_settings',
  PINS_KEY    : 'saeed_ai_v4_pins',

  SYSTEM_PROMPT: `أنت السعيد AI، مساعد ذكي وودود تتكلم بالعربية المصرية البسيطة بأسلوب حيوي ومرح.
استخدم الإيموجي بشكل طبيعي في ردودك 😊✨.
إذا سألك أحد عن اسمك قل: "أنا السعيد AI مساعدك الذكي!".
إذا سألك أحد من طورك أو من برمجك أو مين عملك قل: "طورني وبرمجني أحمد سعيد 👨‍💻".
إذا سألك أحد كيف يتواصل مع المطور قل: "هفتحلك واتساب المطور أحمد سعيد دلوقتي! 📱".
في وضع المكالمة الصوتية اجعل ردودك قصيرة وطبيعية كأنك في محادثة هاتفية.
ادعم جميع اللغات واللهجات العربية والأجنبية وأجب بنفس لغة المستخدم.`,

  WA_MSG: encodeURIComponent('مرحباً أحمد سعيد، أنا مستخدم تطبيق السعيد AI وأريد التواصل معك.'),

  get WA_LINK() {
    return `https://wa.me/${this.DEV_PHONE}?text=${this.WA_MSG}`;
  },

  CONTACT_KW: ['تواصل','واتساب','whatsapp','اتصل','ابعت','contact','المطور'],

  /* خرائط اللغات والأصوات — StreamElements (AWS Polly) */
  VOICES: {
    ar: { label: 'عربي',      voice: 'Zeina',    lang: 'ar' },
    en: { label: 'English',   voice: 'Joanna',   lang: 'en' },
    fr: { label: 'Français',  voice: 'Celine',   lang: 'fr' },
    de: { label: 'Deutsch',   voice: 'Marlene',  lang: 'de' },
    es: { label: 'Español',   voice: 'Conchita', lang: 'es' },
    it: { label: 'Italiano',  voice: 'Carla',    lang: 'it' },
    pt: { label: 'Português', voice: 'Ines',     lang: 'pt' },
    ru: { label: 'Русский',   voice: 'Tatyana',  lang: 'ru' },
    ja: { label: '日本語',     voice: 'Mizuki',   lang: 'ja' },
    ko: { label: '한국어',     voice: 'Seoyeon',  lang: 'ko' },
    zh: { label: '中文',       voice: 'Zhiyu',    lang: 'zh' },
    tr: { label: 'Türkçe',    voice: 'Filiz',    lang: 'tr' },
    nl: { label: 'Nederlands',voice: 'Lotte',    lang: 'nl' },
    pl: { label: 'Polski',    voice: 'Ewa',      lang: 'pl' },
    sv: { label: 'Svenska',   voice: 'Astrid',   lang: 'sv' },
    no: { label: 'Norsk',     voice: 'Liv',      lang: 'no' },
    da: { label: 'Dansk',     voice: 'Naja',     lang: 'da' },
    ro: { label: 'Română',    voice: 'Carmen',   lang: 'ro' },
  },

  /* اكتشاف اللغة من النص */
  detectLang(text) {
    if (!text) return 'ar';
    const t = text.trim();
    if (/[\u0600-\u06FF]/.test(t))       return 'ar';
    if (/[\u4E00-\u9FFF]/.test(t))       return 'zh';
    if (/[\u3040-\u30FF]/.test(t))       return 'ja';
    if (/[\uAC00-\uD7A3]/.test(t))       return 'ko';
    if (/[\u0400-\u04FF]/.test(t))       return 'ru';
    const w = t.toLowerCase().slice(0, 60);
    if (/\b(le|la|les|un|une|des|je|tu|il|nous|vous|ils)\b/.test(w)) return 'fr';
    if (/\b(der|die|das|ein|eine|ich|du|wir|sie|und|ist)\b/.test(w)) return 'de';
    if (/\b(el|la|los|un|una|yo|tu|es|son|para)\b/.test(w))          return 'es';
    if (/\b(il|la|le|un|una|io|tu|noi|voi|sono)\b/.test(w))          return 'it';
    if (/\b(o|a|os|as|um|uma|eu|tu|ele|nos|para)\b/.test(w))         return 'pt';
    if (/\b(ve|bir|bu|da|de|en|ben|sen|biz|için)\b/.test(w))         return 'tr';
    return 'en';
  },

  QUICK_PROMPTS: [
    { icon: '🤔', text: 'من طورك؟',                query: 'من طورك؟ من برمجك؟' },
    { icon: '🧠', text: 'شرح الذكاء الاصطناعي',    query: 'اشرح لي الذكاء الاصطناعي ببساطة' },
    { icon: '✍️', text: 'اكتب قصيدة',              query: 'اكتب لي قصيدة عربية جميلة عن الأمل' },
    { icon: '⏰', text: 'إدارة الوقت',              query: 'ما هي أفضل 5 نصائح لإدارة الوقت؟' },
    { icon: '💻', text: 'مثال برمجي',               query: 'اكتب كود Python لطباعة جدول الضرب' },
    { icon: '📱', text: 'تواصل مع المطور',           query: '__contact__' },
  ],
};
