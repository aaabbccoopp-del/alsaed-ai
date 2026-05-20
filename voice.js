'use strict';
/* ═══════════════════════════════════════════════════
   السعيد AI — voice.js
   نظام الصوت: TTS عالي الجودة + تعرف على الكلام
   ═══════════════════════════════════════════════════ */

window.Voice = (() => {
  let settings;
  let currentAudio = null;
  let isSpeaking   = false;
  let recognition  = null;
  let isListening  = false;

  /* ─────────────────── TTS عالي الجودة ─────────────────── */

  /**
   * النطق بصوت StreamElements (AWS Polly) — جودة عالية جداً
   * إذا فشل يرجع لصوت المتصفح كبديل
   */
  async function speak(text, langOverride) {
    if (!text || !settings.ttsEnabled) return;
    stopSpeaking();

    const cleanText = text.replace(/[#*`_~>|]/g, '').replace(/\s+/g,' ').trim().slice(0, 500);
    if (!cleanText) return;

    const lang  = langOverride || settings.voiceLang || CFG.detectLang(cleanText);
    const vCfg  = CFG.VOICES[lang] || CFG.VOICES['ar'];

    isSpeaking = true;
    _onStart();

    try {
      await _streamElementsTTS(cleanText, vCfg.voice);
    } catch {
      try { await _browserTTS(cleanText, vCfg.lang); }
      catch { _onEnd(); }
    }
  }

  async function _streamElementsTTS(text, voice) {
    return new Promise((resolve, reject) => {
      const url = `${CFG.TTS_API}?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audio.playbackRate = settings.voiceRate || 1.0;
      currentAudio = audio;
      audio.onended = () => { isSpeaking = false; _onEnd(); resolve(); };
      audio.onerror = () => reject(new Error('StreamElements TTS failed'));
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(reject);
    });
  }

  function _browserTTS(text, lang) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) return reject(new Error('no TTS'));
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang  = lang || 'ar-SA';
      utt.rate  = settings.voiceRate  || 1.0;
      utt.pitch = settings.voicePitch || 1.0;

      /* اختر أفضل صوت متاح */
      const voices = window.speechSynthesis.getVoices();
      const best = voices.find(v => v.lang.startsWith(lang?.split('-')[0] || 'ar') && v.localService)
                || voices.find(v => v.lang.startsWith(lang?.split('-')[0] || 'ar'));
      if (best) utt.voice = best;

      utt.onend   = () => { isSpeaking = false; _onEnd(); resolve(); };
      utt.onerror = reject;
      window.speechSynthesis.speak(utt);
    });
  }

  function stopSpeaking() {
    if (currentAudio) { currentAudio.pause(); currentAudio.src = ''; currentAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    isSpeaking = false;
    _onEnd();
  }

  /* ─────────────────── تعرف على الكلام ─────────────────── */

  function initRecognition(onResult, onEnd) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;
    const rec = new SpeechRec();
    rec.continuous       = false;
    rec.interimResults   = true;
    rec.lang             = 'ar-EG';
    rec.maxAlternatives  = 1;

    rec.onresult = e => {
      let interim = '', final = '';
      for (let r of e.results) {
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      onResult(final || interim, r?.isFinal);
    };
    rec.onend  = onEnd;
    rec.onerror = () => { isListening = false; onEnd?.(); };
    return rec;
  }

  function startListening(inputEl, btnEl, onDone) {
    if (!inputEl) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) { UI.toast('متصفحك لا يدعم الميكروفون 😕', 'warn'); return; }
    if (isListening) { stopListening(); return; }

    recognition = new SpeechRec();
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = 'ar-EG';

    let finalTranscript = '';
    recognition.onstart  = () => { isListening = true; btnEl?.classList.add('listening'); };
    recognition.onresult = e => {
      let interim = '';
      finalTranscript = '';
      for (let r of e.results) {
        if (r.isFinal) finalTranscript += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (inputEl) inputEl.value = finalTranscript || interim;
      UI.autoResize(inputEl);
    };
    recognition.onend = () => {
      isListening = false;
      btnEl?.classList.remove('listening');
      if (finalTranscript && onDone) onDone(finalTranscript);
    };
    recognition.onerror = () => {
      isListening = false;
      btnEl?.classList.remove('listening');
    };
    recognition.start();
  }

  function stopListening() {
    if (recognition) { try { recognition.stop(); } catch {} }
    isListening = false;
  }

  /* ─────────────────── مكالمة صوتية ─────────────────── */

  let callActive    = false;
  let callMuted     = false;
  let callTimerRef  = null;
  let callSeconds   = 0;
  let callRecog     = null;
  let callMessages  = [];
  let callProcessing= false;

  function startCall(ui, onAIResponse) {
    callActive   = true;
    callMuted    = false;
    callMessages = [];
    callSeconds  = 0;

    ui.overlay.classList.add('active');
    ui.status.textContent  = 'متصل...';
    ui.timer.textContent   = '00:00';

    /* مؤقت المكالمة */
    callTimerRef = setInterval(() => {
      callSeconds++;
      const m = String(Math.floor(callSeconds / 60)).padStart(2,'0');
      const s = String(callSeconds % 60).padStart(2,'0');
      ui.timer.textContent = `${m}:${s}`;
    }, 1000);

    /* ترحيب أولي */
    const greeting = 'أهلاً! أنا السعيد AI. تكلم معايا وأنا هجاوبك على طول! 😊';
    ui.aiText.textContent  = greeting;
    ui.userText.textContent = '';
    _callSpeak(greeting, ui, () => _startCallListening(ui, onAIResponse));
    UI.playEffect('callStart');
  }

  function _callSpeak(text, ui, onDone) {
    ui.status.textContent = '🔊 بيتكلم...';
    ui.wave.classList.add('speaking');
    speak(text).then(() => {
      ui.wave.classList.remove('speaking');
      onDone?.();
    }).catch(() => {
      ui.wave.classList.remove('speaking');
      onDone?.();
    });
  }

  function _startCallListening(ui, onAIResponse) {
    if (!callActive || callMuted || callProcessing) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      ui.status.textContent = 'متصفحك لا يدعم الصوت 😕';
      return;
    }
    callRecog = new SpeechRec();
    callRecog.lang = 'ar-EG';
    callRecog.continuous = false;
    callRecog.interimResults = false;

    ui.status.textContent = '🎤 اتكلم...';

    callRecog.onresult = e => {
      const transcript = e.results[0][0].transcript;
      ui.userText.textContent = transcript;
      callProcessing = true;
      ui.status.textContent = '⌛ بيفكر...';
      onAIResponse(transcript, callMessages, replyText => {
        callMessages.push({ role: 'user', content: transcript });
        callMessages.push({ role: 'assistant', content: replyText });
        ui.aiText.textContent = replyText;
        callProcessing = false;
        if (callActive) _callSpeak(replyText, ui, () => _startCallListening(ui, onAIResponse));
      });
    };
    callRecog.onerror = () => {
      if (callActive && !callMuted) setTimeout(() => _startCallListening(ui, onAIResponse), 800);
    };
    callRecog.onend = () => {
      if (callActive && !callMuted && !callProcessing) {
        setTimeout(() => _startCallListening(ui, onAIResponse), 400);
      }
    };
    try { callRecog.start(); } catch {}
  }

  function endCall() {
    callActive = false;
    callProcessing = false;
    clearInterval(callTimerRef);
    if (callRecog) { try { callRecog.stop(); } catch {} callRecog = null; }
    stopSpeaking();
  }

  function toggleMute(ui) {
    callMuted = !callMuted;
    ui.muteBtn.classList.toggle('active', callMuted);
    ui.status.textContent = callMuted ? '🔇 صامت' : '🎤 اتكلم...';
    if (!callMuted) _startCallListening(ui, ui._onAIResponse);
  }

  /* ─────────────────── callbacks ─────────────────── */
  let _onStart = () => {};
  let _onEnd   = () => {};

  function init(s, onStart, onEnd) {
    settings = s;
    _onStart = onStart || (() => {});
    _onEnd   = onEnd   || (() => {});
  }

  function updateSettings(s) { settings = s; }

  return {
    init, updateSettings,
    speak, stopSpeaking,
    startListening, stopListening,
    startCall, endCall, toggleMute,
    get isSpeaking() { return isSpeaking; },
    get callActive()  { return callActive; },
  };
})();
