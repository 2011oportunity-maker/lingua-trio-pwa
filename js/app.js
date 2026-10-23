import { storage } from './storage.js';
import { audio } from './audio.js';
import { FlashcardMode } from './flashcard.js';
import { TypingMode } from './typing.js';
import { VocabManager } from './vocab.js';
import { StatsScreen } from './stats.js';

class App {
  constructor() {
    this.currentTab = 'cards'; // 'cards' | 'type' | 'vocab' | 'stats'
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
    this.switchTab('cards');
    this.checkIOSPWAHint();
  }

  renderShell() {
    const appEl = document.getElementById('app');
    const stats = storage.getStats();

    appEl.innerHTML = `
      <!-- Fixed iOS Safe Area Container -->
      <div class="h-full flex flex-col justify-between overflow-hidden relative">
        
        <!-- Header: Top Safe Area -->
        <header class="app-header z-30 shrink-0 px-4 pt-2 pb-2.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-base shadow-md">
              🌍
            </div>
            <div>
              <div class="flex items-center space-x-1.5">
                <h1 class="text-base font-black tracking-tight text-white leading-none">LinguaTrio</h1>
                <div class="flex items-center space-x-0.5 text-xs">
                  <span>🇬🇧</span>
                  <span>🇷🇴</span>
                  <span>🇷🇺</span>
                </div>
              </div>
              <p class="text-[10px] text-slate-400 font-medium">3-Language Flashcards</p>
            </div>
          </div>

          <!-- Right Header Badge: Streak -->
          <div id="header-streak-badge" class="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer hover:bg-amber-500/20 transition">
            <span>🔥</span>
            <span id="header-streak-num">${stats.currentStreak}</span>
            <span class="text-[10px] text-amber-400/80 font-normal">streak</span>
          </div>
        </header>

        <!-- Main Content Area -->
        <main id="app-view-container" class="flex-1 overflow-y-auto relative"></main>

        <!-- iOS Bottom Tab Bar -->
        <nav class="app-bottom-bar z-30 shrink-0 px-2 pt-1 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl flex items-center justify-around">
          <button data-tab="cards" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span class="text-[11px] font-semibold">Cards</span>
          </button>

          <button data-tab="type" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            <span class="text-[11px] font-semibold">Type</span>
          </button>

          <button data-tab="vocab" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <span class="text-[11px] font-semibold">Vocab</span>
          </button>

          <button data-tab="stats" class="tab-nav-btn flex-1 flex flex-col items-center py-1.5 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <span class="text-[11px] font-semibold">Stats</span>
          </button>
        </nav>

        <!-- iOS Install PWA Banner Modal (if not standalone) -->
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
        audio.haptic('light');
        this.switchTab(tab);
      });
    });

    // Streak badge click jumps to stats
    const streakBadge = appEl.querySelector('#header-streak-badge');
    if (streakBadge) {
      streakBadge.addEventListener('click', () => {
        audio.haptic('light');
        this.switchTab('stats');
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

  switchTab(tab) {
    this.currentTab = tab;
    const container = document.getElementById('app-view-container');
    if (!container) return;

    // Update bottom bar highlights
    document.querySelectorAll('.tab-nav-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('text-indigo-400', isTarget);
      btn.classList.toggle('text-slate-400', !isTarget);
      btn.classList.toggle('scale-105', isTarget);
    });

    // Refresh streak in header
    this.refreshHeaderStreak();

    // Render corresponding view
    if (tab === 'cards') {
      this.viewInstances.cards = new FlashcardMode({
        container,
        onStatsUpdate: () => this.refreshHeaderStreak()
      });
    } else if (tab === 'type') {
      this.viewInstances.type = new TypingMode({
        container,
        onStatsUpdate: () => this.refreshHeaderStreak()
      });
    } else if (tab === 'vocab') {
      this.viewInstances.vocab = new VocabManager({
        container,
        onDataChange: () => this.refreshHeaderStreak()
      });
    } else if (tab === 'stats') {
      this.viewInstances.stats = new StatsScreen({
        container,
        onConfigChange: () => this.refreshHeaderStreak()
      });
    }
  }

  refreshHeaderStreak() {
    const stats = storage.getStats();
    const streakNum = document.getElementById('header-streak-num');
    if (streakNum) {
      streakNum.textContent = stats.currentStreak;
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
