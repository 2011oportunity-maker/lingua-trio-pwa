import { storage } from './storage.js';
import { audio } from './audio.js';
import { duoSound } from './duo-sound.js';
import { COURSES } from './duo-courses.js';
import { DuoLearningTree } from './duo-tree.js';
import { FlashcardMode } from './flashcard.js';
import { TypingMode } from './typing.js';
import { VocabManager } from './vocab.js';
import { StatsScreen } from './stats.js';

class App {
  constructor() {
    this.currentTab = 'learn'; // 'learn' | 'cards' | 'type' | 'vocab' | 'stats'
    this.viewInstances = {};
    this.init();
  }

  init() {
    // Apply saved theme
    if (storage.settings.theme === 'light') {
      document.documentElement.classList.add('light-theme');
    }

    // Set voice speed from saved settings
    if (storage.settings.audioSpeed) {
      audio.setSpeed(storage.settings.audioSpeed);
    }

    this.renderShell();
    this.registerServiceWorker();
    this.switchTab('learn');
    this.checkIOSPWAHint();
  }

  renderShell() {
    const appEl = document.getElementById('app');
    const stats = storage.getStats();
    const courseId = storage.getActiveCourseId();
    const currentCourse = COURSES[courseId] || COURSES['ru-ro'];

    appEl.innerHTML = `
      <!-- Fixed iOS Safe Area Container -->
      <div class="h-full flex flex-col justify-between overflow-hidden relative">
        
        <!-- Duolingo Top Header: Course Flag | Streak (🔥) | XP (⚡) | Hearts (❤️) -->
        <header class="app-header z-30 shrink-0 px-3 pt-2 pb-2.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
          
          <!-- Left: Active Course Flag Switcher Button -->
          <button id="header-course-switcher-btn" class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 active:scale-95 transition shadow-sm">
            <span class="text-base leading-none">${currentCourse.subtitle}</span>
            <span class="text-xs font-bold text-slate-300 hidden xs:inline">${currentCourse.toFlag}</span>
            <span class="text-[10px] text-slate-400">▾</span>
          </button>

          <!-- Right Status Bar: Streak 🔥 | XP ⚡ | Hearts ❤️ -->
          <div class="flex items-center space-x-2">
            <!-- Streak Badge -->
            <div id="header-streak-badge" class="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black cursor-pointer hover:bg-amber-500/20 active:scale-95 transition" title="Streak">
              <span>🔥</span>
              <span id="header-streak-num">${stats.currentStreak}</span>
            </div>

            <!-- Total XP Badge -->
            <div id="header-xp-badge" class="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black hover:bg-indigo-500/20 transition" title="Total XP">
              <span>⚡</span>
              <span id="header-xp-num">${stats.totalXP || 0}</span>
            </div>

            <!-- Hearts Badge -->
            <div id="header-hearts-badge" class="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black cursor-pointer hover:bg-rose-500/20 active:scale-95 transition" title="Hearts (Lives)">
              <span>❤️</span>
              <span id="header-hearts-num">${storage.getHearts()}</span>
            </div>
          </div>
        </header>

        <!-- Main Content View Stage -->
        <main id="app-view-container" class="flex-1 overflow-y-auto relative"></main>

        <!-- iOS Bottom Tab Bar (Duolingo 5-Tab Architecture) -->
        <nav class="app-bottom-bar z-30 shrink-0 px-2 pt-1 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl flex items-center justify-around">
          
          <!-- Learn (Tree) Tab -->
          <button data-tab="learn" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <span class="text-[10px] font-bold">Learn</span>
          </button>

          <!-- Cards (Preserved 3D Flashcards) Tab -->
          <button data-tab="cards" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span class="text-[10px] font-bold">Cards</span>
          </button>

          <!-- Type (Active Recall) Tab -->
          <button data-tab="type" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            <span class="text-[10px] font-bold">Type</span>
          </button>

          <!-- Vocab (Dictionary & CRUD) Tab -->
          <button data-tab="vocab" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            <span class="text-[10px] font-bold">Vocab</span>
          </button>

          <!-- Stats (Profile) Tab -->
          <button data-tab="stats" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <span class="text-[10px] font-bold">Stats</span>
          </button>
        </nav>

        <!-- Course Switcher Modal Container -->
        <div id="app-course-modal-root"></div>

        <!-- iOS Install PWA Banner Modal -->
        <div id="ios-pwa-banner" class="hidden absolute top-16 left-4 right-4 z-40 bg-indigo-950/90 border border-indigo-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between text-xs text-indigo-200">
          <div class="flex items-center space-x-2.5">
            <span class="text-xl">📲</span>
            <div>
              <div class="font-bold text-white">Install on iPhone Home Screen</div>
              <div class="text-[11px] text-indigo-300">Tap Share <span class="text-white font-bold">⎋</span> and select <span class="text-white font-bold">"Add to Home Screen"</span></div>
            </div>
          </div>
          <button id="pwa-banner-close" class="p-1 rounded-lg text-indigo-300 hover:text-white">✕</button>
        </div>

      </div>
    `;

    // Bottom Navigation events
    appEl.querySelectorAll('.tab-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        duoSound.playTap();
        this.switchTab(tab);
      });
    });

    // Course switcher click
    const courseBtn = appEl.querySelector('#header-course-switcher-btn');
    if (courseBtn) {
      courseBtn.addEventListener('click', () => {
        duoSound.playTap();
        this.openCourseModal();
      });
    }

    // Streak badge click jumps to stats
    const streakBadge = appEl.querySelector('#header-streak-badge');
    if (streakBadge) {
      streakBadge.addEventListener('click', () => {
        duoSound.playTap();
        this.switchTab('stats');
      });
    }

    // Hearts badge click
    const heartsBadge = appEl.querySelector('#header-hearts-badge');
    if (heartsBadge) {
      heartsBadge.addEventListener('click', () => {
        duoSound.playTap();
        const currentHearts = storage.getHearts();
        if (currentHearts < 5) {
          if (confirm(`You have ${currentHearts}/5 hearts ❤️. Practice with flashcards to refill your lives?`)) {
            this.switchTab('cards');
          }
        } else {
          alert('You have full hearts! ❤️❤️❤️❤️❤️');
        }
      });
    }

    // PWA banner close
    const bannerClose = appEl.querySelector('#pwa-banner-close');
    if (bannerClose) {
      bannerClose.addEventListener('click', () => {
        const banner = document.getElementById('ios-pwa-banner');
        if (banner) banner.classList.add('hidden');
        sessionStorage.setItem('dismissed_pwa_banner', 'true');
      });
    }
  }

  openCourseModal() {
    const modalRoot = document.getElementById('app-course-modal-root');
    if (!modalRoot) return;

    const currentCourseId = storage.getActiveCourseId();

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 class="text-lg font-black text-white">Select Language Course</h3>
              <p class="text-xs text-slate-400">Choose your base & target language pair</p>
            </div>
            <button id="app-course-modal-close" class="p-1 rounded-lg text-slate-400 hover:text-white">✕</button>
          </div>

          <div class="space-y-2.5 pt-1">
            ${Object.values(COURSES).map(c => `
              <button data-course-choice="${c.id}" class="w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition ${
                currentCourseId === c.id
                  ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800'
              }">
                <div class="flex items-center space-x-3">
                  <div class="text-2xl">${c.subtitle}</div>
                  <div>
                    <div class="font-extrabold text-sm text-white">${c.title}</div>
                    <div class="text-xs text-slate-400">${c.desc}</div>
                  </div>
                </div>
                ${currentCourseId === c.id ? `<span class="text-indigo-400 font-bold text-sm">✓ Active</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    modalRoot.querySelector('#app-course-modal-close').addEventListener('click', () => {
      modalRoot.innerHTML = '';
    });

    modalRoot.querySelectorAll('[data-course-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosenId = btn.getAttribute('data-course-choice');
        duoSound.playTap();
        storage.setActiveCourseId(chosenId);
        modalRoot.innerHTML = '';
        this.renderShell();
        this.switchTab(this.currentTab);
      });
    });
  }

  switchTab(tab) {
    this.currentTab = tab;
    const container = document.getElementById('app-view-container');
    if (!container) return;

    // Update bottom bar highlights
    document.querySelectorAll('.tab-nav-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('text-emerald-400', isTarget);
      btn.classList.toggle('text-slate-400', !isTarget);
      btn.classList.toggle('scale-105', isTarget);
    });

    // Refresh header indicators
    this.refreshHeaderStatus();

    // Render corresponding view
    if (tab === 'learn') {
      this.viewInstances.learn = new DuoLearningTree({
        container,
        onSwitchToFlashcards: () => this.switchTab('cards'),
        onStatsUpdate: () => this.refreshHeaderStatus()
      });
    } else if (tab === 'cards') {
      // PRESERVED Flashcard Mode
      this.viewInstances.cards = new FlashcardMode({
        container,
        onStatsUpdate: () => this.refreshHeaderStatus()
      });
    } else if (tab === 'type') {
      this.viewInstances.type = new TypingMode({
        container,
        onStatsUpdate: () => this.refreshHeaderStatus()
      });
    } else if (tab === 'vocab') {
      this.viewInstances.vocab = new VocabManager({
        container,
        onDataChange: () => this.refreshHeaderStatus()
      });
    } else if (tab === 'stats') {
      this.viewInstances.stats = new StatsScreen({
        container,
        onConfigChange: () => this.refreshHeaderStatus()
      });
    }
  }

  refreshHeaderStatus() {
    const stats = storage.getStats();
    const streakNum = document.getElementById('header-streak-num');
    if (streakNum) streakNum.textContent = stats.currentStreak;

    const xpNum = document.getElementById('header-xp-num');
    if (xpNum) xpNum.textContent = stats.totalXP || 0;

    const heartsNum = document.getElementById('header-hearts-num');
    if (heartsNum) heartsNum.textContent = storage.getHearts();

    const courseBtn = document.getElementById('header-course-switcher-btn');
    if (courseBtn) {
      const course = COURSES[storage.getActiveCourseId()] || COURSES['ru-ro'];
      courseBtn.querySelector('span').textContent = course.subtitle;
    }
  }

  checkIOSPWAHint() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = sessionStorage.getItem('dismissed_pwa_banner');

    if (isIOS && !isStandalone && !dismissed) {
      const banner = document.getElementById('ios-pwa-banner');
      if (banner) {
        setTimeout(() => banner.classList.remove('hidden'), 1500);
      }
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
          console.log('ServiceWorker registered:', reg.scope);
        }).catch(err => {
          console.warn('ServiceWorker registration error:', err);
        });
      });
    }
  }
}

// Initialize on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
