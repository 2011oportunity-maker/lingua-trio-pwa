/**
 * Web Speech API Pronunciation Engine with iOS Safari audio unlocking & voice fallback
 */
export class AudioEngine {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.voices = [];
    this.isUnlocked = false;
    this.currentUtterance = null;
    this.rate = 0.95; // slightly relaxed for clear language learning

    if (this.synth) {
      this._loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this._loadVoices();
      }
    }

    // Bind iOS unlock listener
    this._initIOSUnlock();
  }

  _initIOSUnlock() {
    const unlock = () => {
      if (this.isUnlocked) return;
      if (this.synth) {
        // Safe silent utterance to wake up iOS speech audio pipeline
        try {
          const silent = new SpeechSynthesisUtterance(' ');
          silent.volume = 0.01;
          this.synth.speak(silent);
        } catch (e) {
          // ignore
        }
      }
      this.isUnlocked = true;
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('click', unlock, true);
    };

    window.addEventListener('touchstart', unlock, { capture: true, once: true });
    window.addEventListener('click', unlock, { capture: true, once: true });
  }

  _loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices() || [];
  }

  getVoiceForLang(langCode) {
    if (!this.voices || this.voices.length === 0) {
      this._loadVoices();
    }
    const prefix = langCode.toLowerCase().slice(0, 2);
    // Try exact or prefix match
    return (
      this.voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(prefix)) ||
      this.voices.find(v => v.lang && v.lang.toLowerCase().includes(prefix)) ||
      null
    );
  }

  speak(text, lang = 'en', onStart = null, onEnd = null) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }

    try {
      this.synth.cancel(); // Stop any pending speech
    } catch (e) {}

    const cleanText = text.replace(/[\/,\(\)]/g, ' ').trim();
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = 1.0;

    let targetLangCode = 'en-US';
    if (lang === 'ro') targetLangCode = 'ro-RO';
    if (lang === 'ru') targetLangCode = 'ru-RU';
    if (lang === 'en') targetLangCode = 'en-US';

    utterance.lang = targetLangCode;

    const matchedVoice = this.getVoiceForLang(lang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      console.warn('Speech synthesis utterance error:', err);
      if (onEnd) onEnd();
    };

    // Safety timeout in case iOS Safari drops onend
    const wordCount = cleanText.split(/\s+/).length;
    const estimatedDuration = Math.max(1200, wordCount * 600);
    setTimeout(() => {
      if (onEnd) onEnd();
    }, estimatedDuration);

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  setSpeed(speed) {
    this.rate = Math.max(0.5, Math.min(1.5, speed));
  }

  haptic(type = 'light') {
    // Subtle iOS/Android haptic feedback
    if ('vibrate' in navigator) {
      try {
        if (type === 'light') navigator.vibrate(10);
        else if (type === 'medium') navigator.vibrate(25);
        else if (type === 'success') navigator.vibrate([15, 30, 20]);
        else if (type === 'error') navigator.vibrate([30, 40, 30]);
      } catch (e) {}
    }
  }
}

export const audio = new AudioEngine();
