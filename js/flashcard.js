import { storage } from './storage.js';
import { audio } from './audio.js';
import { LANGUAGES } from './data.js';

export class FlashcardMode {
  constructor({ container, onStatsUpdate }) {
    this.container = container;
    this.onStatsUpdate = onStatsUpdate;

    this.cards = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.isAnimating = false;
    this.historyStack = []; // for undo

    // Touch gesture state
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.touchCurrentY = 0;
    this.isDragging = false;
    this.activeCardEl = null;

    // Timer state
    this.timerInterval = null;
    this.timerRemaining = 0;

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
      this.cards = all; // fallback
    }

    this.currentIndex = 0;
    this.isFlipped = false;
  }

  shuffle() {
    audio.haptic('light');
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.currentIndex = 0;
    this.isFlipped = false;
    this.renderCard();
  }

  getCurrentCard() {
    if (!this.cards || this.cards.length === 0) return null;
    return this.cards[this.currentIndex % this.cards.length];
  }

  render() {
    const settings = storage.settings;
    const categories = ['All', ...new Set(storage.getAllCards().map(c => c.category))];

    this.container.innerHTML = `
      <div class="flashcard-screen flex flex-col h-full max-w-lg mx-auto px-4 select-none">
        
        <!-- Top Toolbar: Mode Controls & Language Config -->
        <div class="pt-2 pb-3 space-y-2">
          
          <!-- Category Chips Slider -->
          <div class="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 text-xs">
            ${categories.map(cat => `
              <button data-cat="${cat}" class="cat-pill whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition-all ${
                (settings.activeCategory === cat || (!settings.activeCategory && cat === 'All'))
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-750 border border-slate-700/50'
              }">
                ${cat}
              </button>
            `).join('')}
          </div>

          <!-- Language Selector Bar -->
          <div class="bg-slate-900/70 backdrop-blur-md rounded-2xl p-2.5 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div class="flex items-center space-x-1.5">
              <span class="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Prompt:</span>
              <div class="inline-flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                ${['en', 'ro', 'ru'].map(l => `
                  <button data-prompt-lang="${l}" class="px-2 py-1 rounded-md flex items-center space-x-1 transition-all ${
                    settings.promptLang === l ? 'bg-indigo-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                  }">
                    <span>${LANGUAGES[l].flag}</span>
                    <span>${LANGUAGES[l].short}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="flex items-center space-x-1">
              <button id="fc-shuffle-btn" class="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 transition" title="Shuffle">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
              <button id="fc-audio-speed-btn" class="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono text-[11px]" title="Audio Speed">
                ${settings.audioSpeed || 1.0}x
              </button>
            </div>
          </div>

          <!-- Progress Bar & Counter -->
          <div class="flex items-center justify-between px-1 text-[11px] text-slate-400 font-medium">
            <span id="fc-card-counter">Card 1 of ${this.cards.length}</span>
            <div class="w-36 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div id="fc-progress-bar" class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <span id="fc-mastery-badge" class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase tracking-wider">New</span>
          </div>

        </div>

        <!-- 3D Card Stage / Gestures Area -->
        <div class="flex-1 flex items-center justify-center relative min-h-[340px] my-1 touch-none">
          <div id="fc-card-viewport" class="w-full h-full max-h-[420px] relative perspective-1000 flex items-center justify-center">
            <!-- Card inserted here -->
          </div>
        </div>

        <!-- Gesture Hints -->
        <div class="flex items-center justify-between px-4 py-1 text-[11px] text-slate-400 font-medium">
          <span class="flex items-center space-x-1 text-rose-400">
            <span>←</span> <span>Swipe Left: Review</span>
          </span>
          <span class="text-slate-400">Tap card to flip</span>
          <span class="flex items-center space-x-1 text-emerald-400">
            <span>Swipe Right: Known</span> <span>→</span>
          </span>
        </div>

        <!-- SRS Action Buttons (Again, Hard, Good, Easy) -->
        <div class="pb-3 pt-2 grid grid-cols-4 gap-2">
          <button data-rating="again" class="fc-rate-btn flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 active:scale-95 transition">
            <span class="text-xs font-bold uppercase tracking-wider">Again</span>
            <span class="text-[10px] text-rose-400/80 mt-0.5">&lt; 1m</span>
          </button>
          
          <button data-rating="hard" class="fc-rate-btn flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-amber-300 hover:bg-amber-900/60 active:scale-95 transition">
            <span class="text-xs font-bold uppercase tracking-wider">Hard</span>
            <span class="text-[10px] text-amber-400/80 mt-0.5">1d</span>
          </button>
          
          <button data-rating="good" class="fc-rate-btn flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/60 active:scale-95 transition">
            <span class="text-xs font-bold uppercase tracking-wider">Good</span>
            <span class="text-[10px] text-emerald-400/80 mt-0.5">3d</span>
          </button>
          
          <button data-rating="easy" class="fc-rate-btn flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl bg-blue-950/40 border border-blue-800/50 text-blue-300 hover:bg-blue-900/60 active:scale-95 transition">
            <span class="text-xs font-bold uppercase tracking-wider">Easy</span>
            <span class="text-[10px] text-blue-400/80 mt-0.5">5d</span>
          </button>
        </div>

      </div>
    `;

    this.bindEvents();
    this.renderCard();
  }

  bindEvents() {
    // Category pills
    this.container.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        storage.saveSettings({ activeCategory: cat });
        audio.haptic('light');
        this.loadCards();
        this.render();
      });
    });

    // Prompt language switcher
    this.container.querySelectorAll('[data-prompt-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-prompt-lang');
        // If target answers contain prompt lang, adjust target answers
        const curTargets = storage.settings.answerLangs || ['ro', 'ru'];
        const otherLangs = ['en', 'ro', 'ru'].filter(l => l !== lang);
        storage.saveSettings({
          promptLang: lang,
          answerLangs: otherLangs
        });
        audio.haptic('light');
        this.render();
      });
    });

    // Shuffle
    const shuffleBtn = this.container.querySelector('#fc-shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => this.shuffle());
    }

    // Audio Speed toggle
    const speedBtn = this.container.querySelector('#fc-audio-speed-btn');
    if (speedBtn) {
      speedBtn.addEventListener('click', () => {
        const current = storage.settings.audioSpeed || 1.0;
        const next = current === 1.0 ? 0.8 : (current === 0.8 ? 1.2 : 1.0);
        storage.saveSettings({ audioSpeed: next });
        audio.setSpeed(next);
        speedBtn.textContent = `${next}x`;
        audio.haptic('light');
      });
    }

    // SRS buttons
    this.container.querySelectorAll('.fc-rate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rating = btn.getAttribute('data-rating');
        this.handleCardRating(rating);
      });
    });
  }

  renderCard() {
    const cardViewport = this.container.querySelector('#fc-card-viewport');
    if (!cardViewport) return;

    if (this.cards.length === 0) {
      cardViewport.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-400">
          <p class="text-base font-semibold text-slate-200">No cards found in this category.</p>
          <p class="text-xs mt-1">Select another category or add new vocabulary.</p>
        </div>
      `;
      return;
    }

    const card = this.getCurrentCard();
    const settings = storage.settings;
    const promptLang = settings.promptLang || 'en';
    const answerLangs = ['en', 'ro', 'ru'].filter(l => l !== promptLang);

    // Update Counter & Progress
    const counterEl = this.container.querySelector('#fc-card-counter');
    const progressEl = this.container.querySelector('#fc-progress-bar');
    const masteryEl = this.container.querySelector('#fc-mastery-badge');

    if (counterEl) counterEl.textContent = `Card ${this.currentIndex + 1} of ${this.cards.length}`;
    if (progressEl) {
      const pct = Math.round(((this.currentIndex + 1) / this.cards.length) * 100);
      progressEl.style.width = `${pct}%`;
    }
    if (masteryEl) {
      const m = card.mastery || 'new';
      masteryEl.textContent = m;
      if (m === 'mastered') {
        masteryEl.className = 'px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[10px] font-semibold uppercase tracking-wider';
      } else if (m === 'learning') {
        masteryEl.className = 'px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 text-[10px] font-semibold uppercase tracking-wider';
      } else {
        masteryEl.className = 'px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold uppercase tracking-wider';
      }
    }

    // Render the 3D card element
    const cardEl = document.createElement('div');
    cardEl.id = 'active-fc-card';
    cardEl.className = `w-full h-full max-w-[360px] max-h-[380px] flashcard-card relative cursor-pointer select-none transition-transform duration-500 ${this.isFlipped ? 'flipped' : ''}`;

    // Front: Prompt
    // Back: Both target languages
    cardEl.innerHTML = `
      <div class="card-inner w-full h-full relative preserve-3d">
        
        <!-- CARD FRONT -->
        <div class="card-face card-front absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between backface-hidden bg-gradient-to-br from-slate-800/90 to-slate-900/95 border border-slate-700/60 shadow-2xl backdrop-blur-xl">
          
          <!-- Top Row: Category & Sound -->
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/40">
              ${card.category}
            </span>
            <button class="fc-speak-btn p-2 rounded-full bg-slate-700/50 hover:bg-indigo-600 active:scale-90 text-slate-200 transition" data-lang="${promptLang}" data-text="${card[promptLang]}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            </button>
          </div>

          <!-- Middle: Prompt Word -->
          <div class="text-center my-auto py-4">
            <div class="inline-flex items-center space-x-1.5 mb-2 px-2.5 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-300">
              <span class="text-base">${LANGUAGES[promptLang].flag}</span>
              <span class="font-medium">${LANGUAGES[promptLang].label}</span>
            </div>
            <div class="text-3xl font-extrabold tracking-tight text-white mb-2 leading-tight">
              ${card[promptLang]}
            </div>
            ${card.notes ? `<div class="text-xs text-slate-400 italic">${card.notes}</div>` : ''}
          </div>

          <!-- Bottom: Tap to reveal hint -->
          <div class="text-center pt-2 border-t border-slate-700/40 text-xs font-medium text-slate-400 flex items-center justify-center space-x-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span>Tap anywhere to flip</span>
          </div>

          <!-- Stamp Badges for Gesture Swipe Feedback -->
          <div class="swipe-badge swipe-badge-known opacity-0 absolute top-6 right-6 border-2 border-emerald-400 text-emerald-400 font-extrabold px-3 py-1 rounded-xl rotate-12 uppercase tracking-widest text-sm pointer-events-none transition-opacity">
            KNOWN
          </div>
          <div class="swipe-badge swipe-badge-review opacity-0 absolute top-6 left-6 border-2 border-rose-400 text-rose-400 font-extrabold px-3 py-1 rounded-xl -rotate-12 uppercase tracking-widest text-sm pointer-events-none transition-opacity">
            REVIEW
          </div>
        </div>

        <!-- CARD BACK (TARGET LANGUAGES) -->
        <div class="card-face card-back absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-xl">
          
          <!-- Top Row: Prompt reminder -->
          <div class="flex items-center justify-between pb-2 border-b border-indigo-900/50">
            <span class="text-xs text-indigo-300 font-medium flex items-center space-x-1">
              <span>${LANGUAGES[promptLang].flag}</span>
              <span class="font-bold">${card[promptLang]}</span>
            </span>
            <span class="text-[11px] text-slate-400 font-medium">Answers</span>
          </div>

          <!-- Middle: Both Target Answers -->
          <div class="space-y-4 my-auto py-2">
            ${answerLangs.map(langKey => `
              <div class="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/70 flex items-center justify-between">
                <div>
                  <div class="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium mb-0.5">
                    <span>${LANGUAGES[langKey].flag}</span>
                    <span>${LANGUAGES[langKey].label}</span>
                  </div>
                  <div class="text-xl font-bold text-white tracking-wide">
                    ${card[langKey]}
                  </div>
                </div>
                <button class="fc-speak-btn p-2 rounded-full bg-slate-700/60 hover:bg-indigo-600 active:scale-90 text-slate-200 transition" data-lang="${langKey}" data-text="${card[langKey]}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Bottom: Action prompt -->
          <div class="text-center pt-2 border-t border-slate-800 text-[11px] text-indigo-300 font-medium">
            Swipe right if known, or tap a rating below
          </div>

        </div>

      </div>
    `;

    cardViewport.innerHTML = '';
    cardViewport.appendChild(cardEl);
    this.activeCardEl = cardEl;

    // Attach card flip & swipe listeners
    this.attachCardInteractions(cardEl, card, promptLang);
  }

  attachCardInteractions(cardEl, card, promptLang) {
    // Card Flip on Click / Tap (if not dragging)
    let tapStartTime = 0;
    let didMove = false;

    // Speaker buttons (prevent flip when clicking audio)
    cardEl.querySelectorAll('.fc-speak-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-text');
        const lang = btn.getAttribute('data-lang');
        audio.haptic('light');
        btn.classList.add('animate-pulse', 'text-indigo-400');
        audio.speak(text, lang, null, () => {
          btn.classList.remove('animate-pulse', 'text-indigo-400');
        });
      });
    });

    // Touch Swipe Gestures for iPhone
    const onTouchStart = (e) => {
      if (this.isAnimating) return;
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchCurrentX = touch.clientX;
      this.touchCurrentY = touch.clientY;
      this.isDragging = true;
      tapStartTime = Date.now();
      didMove = false;
      cardEl.style.transition = 'none';
    };

    const onTouchMove = (e) => {
      if (!this.isDragging) return;
      const touch = e.touches[0];
      this.touchCurrentX = touch.clientX;
      this.touchCurrentY = touch.clientY;

      const deltaX = this.touchCurrentX - this.touchStartX;
      const deltaY = this.touchCurrentY - this.touchStartY;

      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        didMove = true;
      }

      // Drag resistance & rotation
      const rotateDeg = deltaX * 0.08;
      const flipRotation = this.isFlipped ? 180 : 0;
      cardEl.style.transform = `translate3d(${deltaX}px, ${deltaY * 0.3}px, 0) rotate(${rotateDeg}deg)`;

      // Update stamp badge opacities
      const knownBadge = cardEl.querySelector('.swipe-badge-known');
      const reviewBadge = cardEl.querySelector('.swipe-badge-review');
      const ratio = Math.min(1, Math.abs(deltaX) / 100);

      if (deltaX > 20) {
        if (knownBadge) knownBadge.style.opacity = ratio;
        if (reviewBadge) reviewBadge.style.opacity = 0;
      } else if (deltaX < -20) {
        if (reviewBadge) reviewBadge.style.opacity = ratio;
        if (knownBadge) knownBadge.style.opacity = 0;
      } else {
        if (knownBadge) knownBadge.style.opacity = 0;
        if (reviewBadge) reviewBadge.style.opacity = 0;
      }
    };

    const onTouchEnd = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const deltaX = this.touchCurrentX - this.touchStartX;
      const timeElapsed = Date.now() - tapStartTime;

      const knownBadge = cardEl.querySelector('.swipe-badge-known');
      const reviewBadge = cardEl.querySelector('.swipe-badge-review');
      if (knownBadge) knownBadge.style.opacity = 0;
      if (reviewBadge) reviewBadge.style.opacity = 0;

      // Check if tap (short duration, minimal move)
      if (!didMove || (timeElapsed < 250 && Math.abs(deltaX) < 15)) {
        this.toggleFlip();
        return;
      }

      // Check swipe threshold (> 85px or fast flick)
      const threshold = 85;
      if (deltaX > threshold) {
        // Swiped Right -> Known / Good
        this.flyOff(cardEl, 'right', 'good');
      } else if (deltaX < -threshold) {
        // Swiped Left -> Need Review / Again
        this.flyOff(cardEl, 'left', 'again');
      } else {
        // Snap back
        cardEl.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        cardEl.style.transform = '';
      }
    };

    cardEl.addEventListener('touchstart', onTouchStart, { passive: true });
    cardEl.addEventListener('touchmove', onTouchMove, { passive: true });
    cardEl.addEventListener('touchend', onTouchEnd, { passive: true });

    // Click fallback for desktop mouse testing
    cardEl.addEventListener('click', (e) => {
      if (!didMove) {
        this.toggleFlip();
      }
    });
  }

  toggleFlip() {
    if (this.isAnimating) return;
    audio.haptic('light');
    this.isFlipped = !this.isFlipped;
    if (this.activeCardEl) {
      if (this.isFlipped) {
        this.activeCardEl.classList.add('flipped');
      } else {
        this.activeCardEl.classList.remove('flipped');
      }
    }
  }

  flyOff(cardEl, direction, rating) {
    this.isAnimating = true;
    audio.haptic(rating === 'good' ? 'success' : 'medium');

    const moveX = direction === 'right' ? 500 : -500;
    const rotateDeg = direction === 'right' ? 25 : -25;

    cardEl.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
    cardEl.style.transform = `translate3d(${moveX}px, 0, 0) rotate(${rotateDeg}deg)`;
    cardEl.style.opacity = '0';

    setTimeout(() => {
      this.handleCardRating(rating);
      this.isAnimating = false;
    }, 320);
  }

  handleCardRating(rating) {
    const card = this.getCurrentCard();
    if (!card) return;

    audio.haptic('light');
    storage.recordCardReview(card.id, rating);
    if (this.onStatsUpdate) this.onStatsUpdate();

    // Advance to next card
    this.isFlipped = false;
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.renderCard();
  }
}
