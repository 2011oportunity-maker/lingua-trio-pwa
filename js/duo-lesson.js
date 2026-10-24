import { storage } from './storage.js';
import { audio } from './audio.js';
import { duoSound } from './duo-sound.js';
import { generateLessonExercises } from './duo-courses.js';
import { LANGUAGES } from './data.js';

export class DuoLessonRunner {
  constructor({ container, courseId, unitId, nodeId, onComplete, onExit, onPracticeRefill }) {
    this.container = container;
    this.courseId = courseId;
    this.unitId = unitId;
    this.nodeId = nodeId;
    this.onComplete = onComplete;
    this.onExit = onExit;
    this.onPracticeRefill = onPracticeRefill;

    this.lessonData = generateLessonExercises(courseId, unitId, nodeId);
    this.exercises = this.lessonData.exercises;
    this.currentIndex = 0;
    this.hearts = storage.getHearts();
    this.correctCount = 0;
    this.isAnswerChecked = false;
    this.selectedOption = null;
    this.selectedBubbles = [];
    this.matchedPairsCount = 0;
    this.matchSelection = null; // for match-pairs

    this.init();
  }

  init() {
    this.render();
  }

  getCurrentExercise() {
    return this.exercises[this.currentIndex];
  }

  render() {
    const ex = this.getCurrentExercise();
    const progressPct = Math.round((this.currentIndex / this.exercises.length) * 100);
    this.hearts = storage.getHearts();

    this.container.innerHTML = `
      <div class="duo-lesson-screen fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between select-none max-w-lg mx-auto">
        
        <!-- Top App Bar: Close, Progress, Hearts -->
        <header class="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80">
          <!-- Exit Button -->
          <button id="lesson-exit-btn" class="p-2 text-slate-400 hover:text-white rounded-xl active:scale-90 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>

          <!-- Smooth Duolingo Progress Bar -->
          <div class="flex-1 mx-4 bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div id="lesson-progress-fill" class="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
          </div>

          <!-- Hearts Display -->
          <div class="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm">
            <span class="animate-pulse">❤️</span>
            <span id="lesson-hearts-num">${this.hearts}</span>
          </div>
        </header>

        <!-- Exercise Content Stage -->
        <main id="lesson-stage" class="flex-1 px-4 py-4 overflow-y-auto flex flex-col justify-between">
          <!-- Injected dynamically per exercise type -->
        </main>

        <!-- Bottom Action Bar / Feedback Drawer Container -->
        <div id="lesson-footer-container" class="relative">
          <div class="p-4 border-t border-slate-800/80 bg-slate-950/95 flex items-center justify-between">
            <button id="lesson-check-btn" class="duo-btn duo-btn-primary w-full py-3.5 rounded-2xl text-base font-extrabold tracking-wide uppercase shadow-lg transition opacity-50 cursor-not-allowed">
              Check
            </button>
          </div>
          <!-- Sliding Feedback Drawer inserted here -->
          <div id="lesson-feedback-drawer" class="hidden"></div>
        </div>

        <!-- Out of Hearts Modal Root -->
        <div id="out-of-hearts-modal-root"></div>

      </div>
    `;

    this.bindGlobalEvents();
    this.renderExerciseStage();
  }

  bindGlobalEvents() {
    const exitBtn = this.container.querySelector('#lesson-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        if (confirm('Leave lesson? Your current lesson progress will be lost.')) {
          duoSound.playTap();
          if (this.onExit) this.onExit();
        }
      });
    }

    const checkBtn = this.container.querySelector('#lesson-check-btn');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        if (this.isAnswerChecked) return;
        this.evaluateCurrentAnswer();
      });
    }
  }

  setCheckButtonEnabled(enabled) {
    const btn = this.container.querySelector('#lesson-check-btn');
    if (!btn) return;
    if (enabled) {
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
      btn.classList.add('active:scale-95');
      btn.removeAttribute('disabled');
    } else {
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      btn.classList.remove('active:scale-95');
      btn.setAttribute('disabled', 'true');
    }
  }

  renderExerciseStage() {
    const stage = this.container.querySelector('#lesson-stage');
    if (!stage) return;
    const ex = this.getCurrentExercise();
    this.isAnswerChecked = false;
    this.selectedOption = null;
    this.selectedBubbles = [];
    this.setCheckButtonEnabled(false);

    // Render based on exercise type
    if (ex.type === 'multiple-choice') {
      this.renderMultipleChoice(stage, ex);
    } else if (ex.type === 'word-bank') {
      this.renderWordBank(stage, ex);
    } else if (ex.type === 'match-pairs') {
      this.renderMatchPairs(stage, ex);
    } else if (ex.type === 'typing') {
      this.renderTyping(stage, ex);
    }
  }

  // --- Exercise Type 1: Multiple Choice ---
  renderMultipleChoice(stage, ex) {
    stage.innerHTML = `
      <div class="space-y-4">
        <h2 class="text-lg font-black text-white tracking-tight">${ex.instruction}</h2>
        
        <!-- Prompt Box -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div class="flex items-center space-x-3">
            <button id="ex-speak-btn" class="p-3 rounded-2xl bg-indigo-600 text-white shadow-md active:scale-90 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            </button>
            <div>
              <span class="text-xs text-slate-400 font-semibold uppercase">${LANGUAGES[ex.promptLang].label}</span>
              <div class="text-2xl font-black text-white">${ex.prompt}</div>
            </div>
          </div>
        </div>

        <!-- 4 Chunky Choice Buttons -->
        <div class="grid grid-cols-1 gap-2.5 pt-2">
          ${ex.options.map((opt, idx) => `
            <button data-opt-idx="${idx}" class="duo-choice-card w-full text-left p-4 rounded-2xl bg-slate-900 border-2 border-slate-700/80 hover:border-indigo-500 font-bold text-base text-white flex items-center justify-between shadow transition active:scale-[0.98]">
              <span>${opt.text}</span>
              <span class="w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center text-xs text-slate-400 font-mono">${idx + 1}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Speak audio
    const speakBtn = stage.querySelector('#ex-speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        duoSound.playTap();
        audio.speak(ex.prompt, ex.promptLang);
      });
      // Auto-play pronunciation once if listening
      if (ex.isListeningPrompt) {
        setTimeout(() => audio.speak(ex.prompt, ex.promptLang), 200);
      }
    }

    // Option selection
    stage.querySelectorAll('.duo-choice-card').forEach(btn => {
      btn.addEventListener('click', () => {
        duoSound.playTap();
        stage.querySelectorAll('.duo-choice-card').forEach(b => {
          b.classList.remove('border-indigo-500', 'bg-indigo-950/40', 'ring-2', 'ring-indigo-500/50');
        });
        btn.classList.add('border-indigo-500', 'bg-indigo-950/40', 'ring-2', 'ring-indigo-500/50');
        const idx = parseInt(btn.getAttribute('data-opt-idx'));
        this.selectedOption = ex.options[idx];
        this.setCheckButtonEnabled(true);
      });
    });
  }

  // --- Exercise Type 2: Word Bank / Bubble Builder ---
  renderWordBank(stage, ex) {
    stage.innerHTML = `
      <div class="space-y-4">
        <h2 class="text-lg font-black text-white tracking-tight">${ex.instruction}</h2>
        
        <!-- Prompt Box -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span class="text-xs text-slate-400 font-semibold uppercase">${LANGUAGES[ex.promptLang].label}</span>
            <div class="text-2xl font-black text-white">${ex.prompt}</div>
          </div>
          <button id="ex-speak-prompt-btn" class="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white active:scale-90 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          </button>
        </div>

        <!-- Answer Sentence Line (Selected Bubbles drop here) -->
        <div class="min-h-[72px] p-3 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-700 flex flex-wrap gap-2 items-center" id="answer-bubble-area">
          <span class="text-xs text-slate-500 italic" id="answer-placeholder">Tap words below to assemble your answer...</span>
        </div>

        <!-- Word Bank of available bubbles -->
        <div class="pt-2">
          <div class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Word Bank:</div>
          <div class="flex flex-wrap gap-2.5" id="word-bank-area">
            ${ex.bubbles.map(b => `
              <button data-bubble-id="${b.id}" data-bubble-word="${b.word}" class="duo-word-bubble px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 font-bold text-base text-white shadow-md transition">
                ${b.word}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Speak prompt
    const spk = stage.querySelector('#ex-speak-prompt-btn');
    if (spk) {
      spk.addEventListener('click', () => audio.speak(ex.prompt, ex.promptLang));
    }

    // Bubble click handling
    const bankArea = stage.querySelector('#word-bank-area');
    const answerArea = stage.querySelector('#answer-bubble-area');
    const placeholder = stage.querySelector('#answer-placeholder');

    bankArea.querySelectorAll('.duo-word-bubble').forEach(btn => {
      btn.addEventListener('click', () => {
        duoSound.playTap();
        const id = btn.getAttribute('data-bubble-id');
        const word = btn.getAttribute('data-bubble-word');

        // Add to answer line
        this.selectedBubbles.push({ id, word });
        btn.classList.add('opacity-20', 'pointer-events-none');

        // Re-render answer bubbles
        this.refreshAnswerBubbles(answerArea, placeholder, bankArea);
      });
    });
  }

  refreshAnswerBubbles(answerArea, placeholder, bankArea) {
    if (placeholder) {
      placeholder.style.display = this.selectedBubbles.length > 0 ? 'none' : 'block';
    }

    // Keep placeholder, clear old bubble elements
    const oldBtns = answerArea.querySelectorAll('.placed-bubble');
    oldBtns.forEach(b => b.remove());

    this.selectedBubbles.forEach((item, index) => {
      const bubbleEl = document.createElement('button');
      bubbleEl.className = 'placed-bubble px-4 py-2.5 rounded-2xl bg-indigo-600 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 font-bold text-base text-white shadow-md transition animate-fade-in';
      bubbleEl.textContent = item.word;
      bubbleEl.addEventListener('click', () => {
        duoSound.playTap();
        // Return to bank
        this.selectedBubbles.splice(index, 1);
        const originalBtn = bankArea.querySelector(`[data-bubble-id="${item.id}"]`);
        if (originalBtn) originalBtn.classList.remove('opacity-20', 'pointer-events-none');
        this.refreshAnswerBubbles(answerArea, placeholder, bankArea);
      });
      answerArea.appendChild(bubbleEl);
    });

    this.setCheckButtonEnabled(this.selectedBubbles.length > 0);
  }

  // --- Exercise Type 3: Match the Pairs Grid ---
  renderMatchPairs(stage, ex) {
    this.matchedPairsCount = 0;
    this.matchSelection = null;

    // Combine left and right into one shuffled or 2-column grid
    stage.innerHTML = `
      <div class="space-y-4">
        <h2 class="text-lg font-black text-white tracking-tight">${ex.instruction}</h2>
        <p class="text-xs text-slate-400">Tap pairs that correspond to each other.</p>

        <div class="grid grid-cols-2 gap-2.5 pt-2" id="pairs-grid">
          ${[...ex.leftItems, ...ex.rightItems].sort(() => Math.random() - 0.5).map(item => `
            <button data-pair-card-id="${item.cardId}" data-item-id="${item.id}" class="duo-pair-card p-4 min-h-[64px] rounded-2xl bg-slate-900 border-2 border-slate-700/80 hover:border-indigo-400 active:scale-95 font-bold text-sm text-white flex items-center justify-center text-center shadow transition">
              ${item.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const grid = stage.querySelector('#pairs-grid');
    grid.querySelectorAll('.duo-pair-card').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('matched')) return;
        duoSound.playTap();

        if (!this.matchSelection) {
          // First tap
          this.matchSelection = btn;
          btn.classList.add('border-indigo-500', 'bg-indigo-950/60', 'ring-2', 'ring-indigo-500/50');
        } else if (this.matchSelection === btn) {
          // Deselect
          btn.classList.remove('border-indigo-500', 'bg-indigo-950/60', 'ring-2', 'ring-indigo-500/50');
          this.matchSelection = null;
        } else {
          // Second tap: compare pair card IDs
          const cardId1 = this.matchSelection.getAttribute('data-pair-card-id');
          const cardId2 = btn.getAttribute('data-pair-card-id');
          const firstBtn = this.matchSelection;

          if (cardId1 === cardId2) {
            // MATCH!
            duoSound.playCorrect();
            firstBtn.classList.remove('border-indigo-500', 'bg-indigo-950/60', 'ring-2', 'ring-indigo-500/50');
            firstBtn.classList.add('matched', 'border-emerald-500', 'bg-emerald-950/40', 'text-emerald-400', 'opacity-60', 'pointer-events-none');
            btn.classList.add('matched', 'border-emerald-500', 'bg-emerald-950/40', 'text-emerald-400', 'opacity-60', 'pointer-events-none');
            this.matchedPairsCount += 1;
            this.matchSelection = null;

            if (this.matchedPairsCount === ex.pairs.length) {
              // All pairs matched!
              this.setCheckButtonEnabled(true);
              setTimeout(() => this.evaluateCurrentAnswer(), 300);
            }
          } else {
            // Mismatch
            duoSound.playWrong();
            firstBtn.classList.add('border-rose-500', 'bg-rose-950/50');
            btn.classList.add('border-rose-500', 'bg-rose-950/50');
            setTimeout(() => {
              firstBtn.classList.remove('border-rose-500', 'bg-rose-950/50', 'border-indigo-500', 'bg-indigo-950/60', 'ring-2', 'ring-indigo-500/50');
              btn.classList.remove('border-rose-500', 'bg-rose-950/50');
            }, 450);
            this.matchSelection = null;
          }
        }
      });
    });
  }

  // --- Exercise Type 4: Typing / Active Recall ---
  renderTyping(stage, ex) {
    stage.innerHTML = `
      <div class="space-y-4">
        <h2 class="text-lg font-black text-white tracking-tight">${ex.instruction}</h2>

        <!-- Prompt -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span class="text-xs text-slate-400 font-semibold uppercase">${LANGUAGES[ex.promptLang].label}</span>
            <div class="text-2xl font-black text-white">${ex.prompt}</div>
          </div>
          <button id="ex-speak-typing-btn" class="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white active:scale-90 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          </button>
        </div>

        <!-- Input (min 16px font-size to prevent iOS zoom) -->
        <div class="space-y-2">
          <input
            id="ex-typing-input"
            type="text"
            class="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-lg font-bold text-white placeholder-slate-500 shadow-inner outline-none transition"
            style="font-size: 18px;"
            placeholder="Type ${LANGUAGES[ex.targetLang].label} translation..."
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
          />

          <!-- Romanian Diacritics Toolbar if target is Romanian -->
          ${ex.targetLang === 'ro' ? `
            <div class="bg-slate-800/80 p-2 rounded-2xl border border-slate-700 flex items-center justify-between space-x-1.5">
              <span class="text-[10px] uppercase font-bold text-slate-400 px-1">Diacritics:</span>
              <div class="flex items-center space-x-1 flex-1 justify-around">
                ${['ă', 'â', 'î', 'ș', 'ț'].map(char => `
                  <button type="button" data-insert-char="${char}" class="flex-1 py-1.5 bg-slate-700 hover:bg-indigo-600 active:scale-90 text-white font-bold rounded-xl text-lg shadow-sm border border-slate-600 transition">
                    ${char}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const input = stage.querySelector('#ex-typing-input');
    if (input) {
      setTimeout(() => input.focus(), 150);
      input.addEventListener('input', () => {
        this.setCheckButtonEnabled(input.value.trim().length > 0);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim().length > 0) {
          e.preventDefault();
          this.evaluateCurrentAnswer();
        }
      });
    }

    // Diacritic insertion
    stage.querySelectorAll('[data-insert-char]').forEach(btn => {
      btn.addEventListener('click', () => {
        duoSound.playTap();
        const char = btn.getAttribute('data-insert-char');
        const start = input.selectionStart || input.value.length;
        const end = input.selectionEnd || input.value.length;
        input.value = input.value.substring(0, start) + char + input.value.substring(end);
        input.selectionStart = input.selectionEnd = start + char.length;
        input.focus();
        this.setCheckButtonEnabled(true);
      });
    });

    const spk = stage.querySelector('#ex-speak-typing-btn');
    if (spk) {
      spk.addEventListener('click', () => audio.speak(ex.prompt, ex.promptLang));
    }
  }

  // --- Evaluation & Bottom Feedback Drawer ---
  evaluateCurrentAnswer() {
    this.isAnswerChecked = true;
    const ex = this.getCurrentExercise();
    let isCorrect = false;
    let expectedText = ex.correctAnswer || '';

    if (ex.type === 'multiple-choice') {
      isCorrect = this.selectedOption && this.selectedOption.isCorrect;
    } else if (ex.type === 'word-bank') {
      const assembled = this.selectedBubbles.map(b => b.word).join(' ').trim().toLowerCase();
      const targetClean = ex.correctAnswer.trim().toLowerCase();
      isCorrect = assembled === targetClean;
    } else if (ex.type === 'match-pairs') {
      isCorrect = true; // passed when all matched
    } else if (ex.type === 'typing') {
      const input = this.container.querySelector('#ex-typing-input');
      const val = (input ? input.value : '').trim().toLowerCase().replace(/[\.,\?!]/g, '');
      const expectedClean = expectedText.trim().toLowerCase().replace(/[\.,\?!]/g, '');
      isCorrect = val === expectedClean;
    }

    if (isCorrect) {
      this.correctCount += 1;
      duoSound.playCorrect();
      audio.haptic('success');
      this.showFeedbackDrawer(true, expectedText);
    } else {
      // Deduct a Heart
      this.hearts = storage.loseHeart();
      const heartsEl = this.container.querySelector('#lesson-hearts-num');
      if (heartsEl) heartsEl.textContent = this.hearts;

      duoSound.playWrong();
      audio.haptic('error');
      this.showFeedbackDrawer(false, expectedText);

      // Check for zero hearts
      if (this.hearts <= 0) {
        setTimeout(() => this.showOutOfHeartsModal(), 1200);
      }
    }
  }

  showFeedbackDrawer(isCorrect, expectedText) {
    const drawer = this.container.querySelector('#lesson-feedback-drawer');
    const footerBtn = this.container.querySelector('#lesson-check-btn');
    if (footerBtn) footerBtn.style.display = 'none';

    drawer.className = `p-4 border-t-4 transition-all duration-300 animate-fade-in ${
      isCorrect
        ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
        : 'bg-rose-950/95 border-rose-500 text-rose-200'
    }`;
    drawer.classList.remove('hidden');

    drawer.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-lg ${
              isCorrect ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-rose-500 text-white font-black'
            }">
              ${isCorrect ? '✓' : '✕'}
            </div>
            <div>
              <div class="font-extrabold text-base text-white">
                ${isCorrect ? 'Nicely done!' : 'Correct solution:'}
              </div>
              ${!isCorrect ? `<div class="text-sm font-bold text-white mt-0.5">${expectedText}</div>` : ''}
            </div>
          </div>

          <button id="drawer-speak-btn" class="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          </button>
        </div>

        <button id="drawer-continue-btn" class="w-full py-3.5 rounded-2xl font-black text-base uppercase tracking-wider text-white shadow-lg active:scale-95 transition ${
          isCorrect
            ? 'bg-emerald-600 hover:bg-emerald-500 border-b-4 border-emerald-800'
            : 'bg-rose-600 hover:bg-rose-500 border-b-4 border-rose-800'
        }">
          Continue
        </button>
      </div>
    `;

    // Speak audio in target language
    const speakBtn = drawer.querySelector('#drawer-speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        const ex = this.getCurrentExercise();
        audio.speak(expectedText, ex.targetLang);
      });
    }

    const continueBtn = drawer.querySelector('#drawer-continue-btn');
    continueBtn.addEventListener('click', () => {
      duoSound.playTap();
      this.advanceToNextStep();
    });
    continueBtn.focus();
  }

  advanceToNextStep() {
    this.currentIndex += 1;
    if (this.currentIndex >= this.exercises.length) {
      this.finishLesson();
    } else {
      // Hide drawer, show check button
      const drawer = this.container.querySelector('#lesson-feedback-drawer');
      const footerBtn = this.container.querySelector('#lesson-check-btn');
      if (drawer) drawer.classList.add('hidden');
      if (footerBtn) footerBtn.style.display = 'block';

      // Update progress bar
      const pct = Math.round((this.currentIndex / this.exercises.length) * 100);
      const fill = this.container.querySelector('#lesson-progress-fill');
      if (fill) fill.style.width = `${pct}%`;

      this.renderExerciseStage();
    }
  }

  showOutOfHeartsModal() {
    const modalRoot = this.container.querySelector('#out-of-hearts-modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div class="text-5xl animate-bounce">💔</div>
          <h3 class="text-xl font-black text-white">Out of Hearts!</h3>
          <p class="text-xs text-slate-400">
            You've run out of lives for this lesson. Practice with Flashcards to refill your hearts, or take a quick break!
          </p>

          <div class="space-y-2 pt-2">
            <button id="modal-practice-flashcards-btn" class="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 border-b-4 border-indigo-800 font-bold text-sm text-white shadow-lg active:scale-95 transition">
              Practice Flashcards (+1 Heart)
            </button>
            <button id="modal-refill-now-btn" class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition">
              Refill All 5 Hearts Now
            </button>
            <button id="modal-exit-lesson-btn" class="w-full py-2.5 text-xs text-slate-400 hover:text-white transition">
              End Lesson
            </button>
          </div>
        </div>
      </div>
    `;

    modalRoot.querySelector('#modal-practice-flashcards-btn').addEventListener('click', () => {
      if (this.onPracticeRefill) this.onPracticeRefill();
    });

    modalRoot.querySelector('#modal-refill-now-btn').addEventListener('click', () => {
      storage.refillHearts();
      modalRoot.innerHTML = '';
      this.hearts = 5;
      const heartsEl = this.container.querySelector('#lesson-hearts-num');
      if (heartsEl) heartsEl.textContent = '5';
    });

    modalRoot.querySelector('#modal-exit-lesson-btn').addEventListener('click', () => {
      if (this.onExit) this.onExit();
    });
  }

  finishLesson() {
    duoSound.playComplete();
    const earnedXP = this.lessonData.xpReward || 15;
    storage.completeLessonNode(this.courseId, this.unitId, this.nodeId, earnedXP);

    const accuracyPct = Math.round((this.correctCount / this.exercises.length) * 100);

    const stage = this.container.querySelector('#lesson-stage');
    const footer = this.container.querySelector('#lesson-footer-container');
    if (footer) footer.style.display = 'none';

    stage.innerHTML = `
      <div class="my-auto text-center space-y-6 py-6 animate-fade-in">
        <div class="text-6xl animate-bounce">🏆</div>
        <div>
          <h2 class="text-2xl font-black text-white tracking-tight">Lesson Complete!</h2>
          <p class="text-xs text-emerald-400 font-bold mt-1">Crown Mastered • XP Earned</p>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div class="text-xs text-amber-400 uppercase font-extrabold flex items-center justify-center space-x-1">
              <span>⚡</span> <span>Total XP</span>
            </div>
            <div class="text-2xl font-black text-white mt-1">+${earnedXP}</div>
          </div>

          <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div class="text-xs text-emerald-400 uppercase font-extrabold flex items-center justify-center space-x-1">
              <span>🎯</span> <span>Accuracy</span>
            </div>
            <div class="text-2xl font-black text-white mt-1">${accuracyPct}%</div>
          </div>
        </div>

        <div class="pt-4 max-w-xs mx-auto">
          <button id="lesson-done-btn" class="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 border-b-4 border-emerald-800 font-black text-base uppercase tracking-wider text-white shadow-xl active:scale-95 transition">
            Continue to Tree ➔
          </button>
        </div>
      </div>
    `;

    const doneBtn = stage.querySelector('#lesson-done-btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        if (this.onComplete) this.onComplete();
      });
    }
  }
}
