import { storage } from './storage.js';
import { audio } from './audio.js';
import { LANGUAGES } from './data.js';

export class TypingMode {
  constructor({ container, onStatsUpdate }) {
    this.container = container;
    this.onStatsUpdate = onStatsUpdate;

    this.cards = [];
    this.currentIndex = 0;
    this.currentStatus = 'typing'; // 'typing' | 'correct' | 'incorrect'
    this.shiftActive = false;

    this.init();
  }

  init() {
    this.loadCards();
    this.render();
  }

  loadCards() {
    const all = storage.getAllCards();
    const settings = storage.settings;

    if (settings.activeCategory && settings.activeCategory !== 'All') {
      this.cards = all.filter(c => c.category === settings.activeCategory);
    } else {
      this.cards = all;
    }

    if (this.cards.length === 0) {
      this.cards = all;
    }

    this.currentIndex = 0;
    this.currentStatus = 'typing';
  }

  getCurrentCard() {
    if (!this.cards || this.cards.length === 0) return null;
    return this.cards[this.currentIndex % this.cards.length];
  }

  render() {
    const settings = storage.settings;
    // For typing mode:
    // Prompt language default: 'en'
    // Target typing language: default 'ro' (can switch to 'ru' or 'en')
    const promptLang = settings.promptLang || 'en';
    let targetLang = settings.typingTargetLang || (promptLang === 'ro' ? 'en' : 'ro');

    const card = this.getCurrentCard();

    this.container.innerHTML = `
      <div class="typing-screen flex flex-col h-full max-w-lg mx-auto px-4 select-none pb-4">
        
        <!-- Header / Mode Configuration -->
        <div class="pt-2 pb-3 space-y-2">
          <div class="bg-slate-900/70 backdrop-blur-md rounded-2xl p-2.5 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <!-- Prompt & Target Lang Pickers -->
            <div class="flex items-center space-x-2">
              <span class="text-slate-400 text-[11px] font-semibold uppercase">Prompt:</span>
              <span class="font-bold text-white flex items-center space-x-1 bg-slate-800 px-2 py-1 rounded-lg">
                <span>${LANGUAGES[promptLang].flag}</span>
                <span>${LANGUAGES[promptLang].short}</span>
              </span>

              <span class="text-slate-400 text-xs">➔</span>

              <span class="text-slate-400 text-[11px] font-semibold uppercase">Type in:</span>
              <div class="inline-flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                ${['ro', 'ru', 'en'].filter(l => l !== promptLang).map(l => `
                  <button data-type-lang="${l}" class="px-2 py-1 rounded-md flex items-center space-x-1 transition-all ${
                    targetLang === l ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                  }">
                    <span>${LANGUAGES[l].flag}</span>
                    <span>${LANGUAGES[l].short}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Counter -->
            <span class="text-[11px] text-slate-400 font-mono">
              ${this.currentIndex + 1}/${this.cards.length}
            </span>
          </div>
        </div>

        <!-- Question Card Box -->
        <div class="bg-gradient-to-br from-slate-800/90 to-slate-900/95 border border-slate-700/60 rounded-3xl p-6 text-center shadow-xl backdrop-blur-xl relative">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/40">
              ${card.category}
            </span>
            <button id="type-prompt-audio" class="p-2 rounded-full bg-slate-700/50 hover:bg-indigo-600 active:scale-90 text-slate-200 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            </button>
          </div>

          <div class="text-2xl font-black text-white mt-2 mb-1 tracking-tight">
            ${card[promptLang]}
          </div>
          ${card.notes ? `<div class="text-xs text-slate-400 italic mb-1">${card.notes}</div>` : ''}

          <div class="text-xs text-slate-400 mt-2 font-medium">
            Spell in <span class="text-indigo-300 font-semibold">${LANGUAGES[targetLang].label} ${LANGUAGES[targetLang].flag}</span>
          </div>
        </div>

        <!-- Input & Form Area -->
        <div class="mt-4 space-y-3">
          <form id="type-form" class="relative">
            <!-- Note: font-size must be at least 16px to prevent iOS Safari auto-zoom! -->
            <input
              id="type-input"
              type="text"
              class="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-lg font-semibold text-white placeholder-slate-500 shadow-inner outline-none transition duration-200"
              style="font-size: 18px;"
              placeholder="Type ${LANGUAGES[targetLang].label} translation..."
              autocomplete="off"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
            />
            <button
              type="submit"
              id="type-submit-btn"
              class="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm shadow-md transition flex items-center space-x-1"
            >
              <span>Check</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </form>

          <!-- On-screen Diacritic Toolbar for Romanian -->
          ${targetLang === 'ro' ? `
            <div class="diacritic-toolbar bg-slate-800/80 p-2 rounded-2xl border border-slate-700 flex items-center justify-between space-x-1">
              <div class="text-[10px] uppercase font-bold text-slate-400 px-1">Diacritics:</div>
              <div class="flex items-center space-x-1.5 flex-1 justify-around">
                ${['ă', 'â', 'î', 'ș', 'ț'].map(char => `
                  <button type="button" data-char="${char}" class="diacritic-btn flex-1 py-2 bg-slate-700/80 hover:bg-indigo-600 active:scale-90 text-white font-bold rounded-xl text-lg shadow-sm border border-slate-600 transition">
                    ${char}
                  </button>
                `).join('')}
              </div>
              <button type="button" id="diacritic-shift-btn" class="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 active:scale-90 text-xs font-bold text-slate-300 rounded-xl border border-slate-600 transition">
                ⇧
              </button>
            </div>
          ` : ''}

          <!-- Feedback Result Box (dynamically shown after submit) -->
          <div id="type-feedback" class="hidden rounded-2xl p-4 transition-all"></div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center justify-between pt-1 text-xs">
            <button id="type-hint-btn" class="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-slate-300 hover:bg-slate-700 active:scale-95 transition flex items-center space-x-1">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              <span>Hint</span>
            </button>

            <button id="type-skip-btn" class="px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700 text-slate-300 hover:bg-slate-700 active:scale-95 transition">
              Skip ➔
            </button>
          </div>

        </div>

      </div>
    `;

    this.bindEvents();
    // Auto-focus input
    const input = this.container.querySelector('#type-input');
    if (input) {
      setTimeout(() => input.focus(), 150);
    }
  }

  bindEvents() {
    const card = this.getCurrentCard();
    const settings = storage.settings;
    const promptLang = settings.promptLang || 'en';
    const targetLang = settings.typingTargetLang || (promptLang === 'ro' ? 'en' : 'ro');

    // Switch target typing lang
    this.container.querySelectorAll('[data-type-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-type-lang');
        storage.saveSettings({ typingTargetLang: lang });
        audio.haptic('light');
        this.render();
      });
    });

    // Prompt audio
    const audioBtn = this.container.querySelector('#type-prompt-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        audio.haptic('light');
        audio.speak(card[promptLang], promptLang);
      });
    }

    // Diacritic Buttons insertion
    const input = this.container.querySelector('#type-input');
    this.container.querySelectorAll('.diacritic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        audio.haptic('light');
        const char = btn.getAttribute('data-char');
        this.insertCharacter(input, char);
      });
    });

    // Diacritic Shift (Caps)
    const shiftBtn = this.container.querySelector('#diacritic-shift-btn');
    if (shiftBtn) {
      shiftBtn.addEventListener('click', () => {
        this.shiftActive = !this.shiftActive;
        shiftBtn.classList.toggle('bg-indigo-600', this.shiftActive);
        shiftBtn.classList.toggle('text-white', this.shiftActive);
        this.container.querySelectorAll('.diacritic-btn').forEach(btn => {
          const base = btn.getAttribute('data-char');
          const newChar = this.shiftActive ? base.toUpperCase() : base.toLowerCase();
          btn.setAttribute('data-char', newChar);
          btn.textContent = newChar;
        });
      });
    }

    // Submit / Check Form
    const form = this.container.querySelector('#type-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.checkAnswer();
      });
    }

    // Hint Button
    const hintBtn = this.container.querySelector('#type-hint-btn');
    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        const expected = card[targetLang];
        // Reveal first letter and length
        input.value = expected.slice(0, 2);
        input.focus();
        audio.haptic('light');
      });
    }

    // Skip Button
    const skipBtn = this.container.querySelector('#type-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.advanceCard(false);
      });
    }
  }

  insertCharacter(input, char) {
    if (!input) return;
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;
    input.value = val.substring(0, start) + char + val.substring(end);
    input.selectionStart = input.selectionEnd = start + char.length;
    input.focus();
  }

  normalize(str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/[\.,\?!;:"'\(\)\-]/g, '')
      .replace(/\s+/g, ' ');
  }

  // Remove diacritics for forgiving accent check
  stripDiacritics(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ț/g, 't')
      .replace(/ș/g, 's')
      .replace(/Ț/g, 'T')
      .replace(/Ș/g, 'S');
  }

  checkAnswer() {
    const input = this.container.querySelector('#type-input');
    const feedbackEl = this.container.querySelector('#type-feedback');
    const card = this.getCurrentCard();
    const settings = storage.settings;
    const promptLang = settings.promptLang || 'en';
    const targetLang = settings.typingTargetLang || (promptLang === 'ro' ? 'en' : 'ro');

    const userText = input.value.trim();
    if (!userText) {
      input.focus();
      return;
    }

    const expected = card[targetLang];
    const normUser = this.normalize(userText);
    const normExp = this.normalize(expected);

    const isExact = normUser === normExp;
    const isClose = !isExact && this.stripDiacritics(normUser) === this.stripDiacritics(normExp);

    feedbackEl.classList.remove('hidden', 'bg-emerald-950/70', 'border-emerald-700/60', 'bg-amber-950/70', 'border-amber-700/60', 'bg-rose-950/70', 'border-rose-700/60');

    if (isExact) {
      // 100% Correct
      audio.haptic('success');
      audio.speak(expected, targetLang);
      storage.recordCardReview(card.id, 'good');
      if (this.onStatsUpdate) this.onStatsUpdate();

      feedbackEl.className = 'rounded-2xl p-4 bg-emerald-950/70 border border-emerald-600/70 text-emerald-200 mt-2 space-y-2';
      feedbackEl.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xl">🎉</span>
            <span class="font-bold text-sm text-emerald-300">Perfect! Exact match</span>
          </div>
          <button id="type-listen-btn" class="p-1.5 rounded-full bg-emerald-800/60 text-emerald-200 hover:bg-emerald-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          </button>
        </div>
        <div class="text-base font-bold text-white">${expected}</div>
        <button id="type-continue-btn" class="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-sm shadow transition">
          Continue ➔
        </button>
      `;
    } else if (isClose) {
      // Missing diacritics warning
      audio.haptic('medium');
      audio.speak(expected, targetLang);
      storage.recordCardReview(card.id, 'hard');
      if (this.onStatsUpdate) this.onStatsUpdate();

      feedbackEl.className = 'rounded-2xl p-4 bg-amber-950/70 border border-amber-600/70 text-amber-200 mt-2 space-y-2';
      feedbackEl.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="text-xl">💡</span>
          <span class="font-bold text-sm text-amber-300">Almost! Watch the diacritics</span>
        </div>
        <div class="text-sm">You typed: <span class="line-through text-slate-400">${userText}</span></div>
        <div class="text-base font-bold text-white">Correct: <span class="text-amber-300 underline">${expected}</span></div>
        <button id="type-continue-btn" class="w-full mt-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white text-sm shadow transition">
          Continue ➔
        </button>
      `;
    } else {
      // Incorrect
      audio.haptic('error');
      storage.recordCardReview(card.id, 'again');
      if (this.onStatsUpdate) this.onStatsUpdate();

      feedbackEl.className = 'rounded-2xl p-4 bg-rose-950/70 border border-rose-600/70 text-rose-200 mt-2 space-y-2';
      feedbackEl.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xl">❌</span>
            <span class="font-bold text-sm text-rose-300">Not quite</span>
          </div>
          <button id="type-listen-btn" class="p-1.5 rounded-full bg-rose-800/60 text-rose-200 hover:bg-rose-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          </button>
        </div>
        <div class="text-sm">Correct answer: <span class="font-bold text-white">${expected}</span></div>
        <div class="flex space-x-2 pt-1">
          <button id="type-override-btn" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 font-medium">
            I was right
          </button>
          <button id="type-continue-btn" class="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white text-xs shadow transition">
            Continue ➔
          </button>
        </div>
      `;
    }

    // Bind continue & audio in feedback
    const contBtn = feedbackEl.querySelector('#type-continue-btn');
    if (contBtn) {
      contBtn.addEventListener('click', () => {
        this.advanceCard(true);
      });
      contBtn.focus();
    }

    const listenBtn = feedbackEl.querySelector('#type-listen-btn');
    if (listenBtn) {
      listenBtn.addEventListener('click', () => {
        audio.speak(expected, targetLang);
      });
    }

    const overrideBtn = feedbackEl.querySelector('#type-override-btn');
    if (overrideBtn) {
      overrideBtn.addEventListener('click', () => {
        storage.recordCardReview(card.id, 'good');
        if (this.onStatsUpdate) this.onStatsUpdate();
        this.advanceCard(true);
      });
    }
  }

  advanceCard(wasAnswered) {
    audio.haptic('light');
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.render();
  }
}
