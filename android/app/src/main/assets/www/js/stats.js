import { storage } from './storage.js';
import { audio } from './audio.js';

export class StatsScreen {
  constructor({ container, onConfigChange }) {
    this.container = container;
    this.onConfigChange = onConfigChange;
    this.init();
  }

  init() {
    this.render();
  }

  render() {
    const stats = storage.getStats();
    const settings = storage.settings;

    const reviewsToday = stats.reviewsToday || 0;
    const correctToday = stats.correctToday || 0;
    const accuracyToday = reviewsToday > 0 ? Math.round((correctToday / reviewsToday) * 100) : 0;

    const totalCards = stats.totalCards || 1;
    const { new: newCount, learning: learningCount, mastered: masteredCount } = stats.masteryBreakdown;

    const newPct = Math.round((newCount / totalCards) * 100);
    const learningPct = Math.round((learningCount / totalCards) * 100);
    const masteredPct = Math.round((masteredCount / totalCards) * 100);

    this.container.innerHTML = `
      <div class="stats-screen flex flex-col h-full max-w-lg mx-auto px-4 pb-20 select-none overflow-y-auto space-y-4 pt-2">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-1">
          <div>
            <h2 class="text-xl font-black text-white tracking-tight">Your Progress</h2>
            <p class="text-xs text-slate-400">Daily practice streak & accuracy metrics</p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            ${stats.todayDate}
          </span>
        </div>

        <!-- Hero Streak Card -->
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-600/20 to-rose-600/20 border border-amber-500/30 p-5 shadow-xl backdrop-blur-xl">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs uppercase font-extrabold tracking-wider text-amber-400 flex items-center space-x-1">
                <span>🔥</span> <span>Daily Streak</span>
              </div>
              <div class="text-4xl font-black text-white mt-1">
                ${stats.currentStreak} <span class="text-lg font-bold text-amber-300">${stats.currentStreak === 1 ? 'day' : 'days'}</span>
              </div>
              <div class="text-xs text-slate-400 mt-1">
                Personal Best: <span class="text-slate-200 font-bold">${stats.bestStreak || 0} days</span>
              </div>
            </div>

            <!-- Big Fire Icon Glow -->
            <div class="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-3xl shadow-inner border border-amber-500/30 animate-pulse">
              🔥
            </div>
          </div>
        </div>

        <!-- Today's Accuracy Breakdown -->
        <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>🎯</span> <span>Today's Practice Session</span>
            </h3>
            <span class="text-sm font-mono font-bold ${accuracyToday >= 80 ? 'text-emerald-400' : accuracyToday >= 50 ? 'text-amber-400' : 'text-slate-400'}">
              ${accuracyToday}% Accuracy
            </span>
          </div>

          <!-- Visual Progress Bar -->
          <div class="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 flex">
            <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${accuracyToday}%"></div>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-1 text-center">
            <div class="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
              <div class="text-xs text-slate-400">Reviewed</div>
              <div class="text-xl font-black text-white mt-0.5">${reviewsToday}</div>
            </div>
            <div class="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
              <div class="text-xs text-emerald-400">Correct</div>
              <div class="text-xl font-black text-emerald-300 mt-0.5">${correctToday}</div>
            </div>
            <div class="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
              <div class="text-xs text-rose-400">Again/Hard</div>
              <div class="text-xl font-black text-rose-300 mt-0.5">${reviewsToday - correctToday}</div>
            </div>
          </div>
        </div>

        <!-- Mastery Level Breakdown -->
        <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>📚</span> <span>Vocabulary Mastery (${totalCards} Cards)</span>
            </h3>
          </div>

          <!-- Multi-segment Progress Bar -->
          <div class="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
            <div class="bg-emerald-500 h-full" style="width: ${masteredPct}%" title="Mastered: ${masteredCount}"></div>
            <div class="bg-amber-500 h-full" style="width: ${learningPct}%" title="Learning: ${learningCount}"></div>
            <div class="bg-slate-600 h-full" style="width: ${newPct}%" title="New: ${newCount}"></div>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-1">
            <div class="flex items-center space-x-2 bg-slate-800/40 p-2 rounded-xl">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <div>
                <div class="text-[10px] text-slate-400 uppercase font-semibold">Mastered</div>
                <div class="text-sm font-bold text-white">${masteredCount} <span class="text-[10px] text-slate-400">(${masteredPct}%)</span></div>
              </div>
            </div>

            <div class="flex items-center space-x-2 bg-slate-800/40 p-2 rounded-xl">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <div>
                <div class="text-[10px] text-slate-400 uppercase font-semibold">Learning</div>
                <div class="text-sm font-bold text-white">${learningCount} <span class="text-[10px] text-slate-400">(${learningPct}%)</span></div>
              </div>
            </div>

            <div class="flex items-center space-x-2 bg-slate-800/40 p-2 rounded-xl">
              <span class="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
              <div>
                <div class="text-[10px] text-slate-400 uppercase font-semibold">New</div>
                <div class="text-sm font-bold text-white">${newCount} <span class="text-[10px] text-slate-400">(${newPct}%)</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Timer / Rapid Fire Settings -->
        <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center space-x-1.5">
            <span>⏱️</span> <span>Timer & Practice Mode</span>
          </h3>
          <p class="text-xs text-slate-400">Add an optional countdown timer for rapid-fire drills.</p>

          <div class="grid grid-cols-3 gap-2">
            ${[
              { id: 'off', label: 'Off', sub: 'Relaxed' },
              { id: '30', label: '30s', sub: 'Sprint' },
              { id: '60', label: '60s', sub: 'Blitz' }
            ].map(m => `
              <button data-timer-mode="${m.id}" class="py-2.5 px-2 rounded-2xl border text-center transition ${
                (settings.timerMode || 'off') === m.id
                  ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }">
                <div class="text-sm">${m.label}</div>
                <div class="text-[10px] text-slate-400">${m.sub}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Appearance & Audio Settings -->
        <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center space-x-1.5">
            <span>⚙️</span> <span>Preferences</span>
          </h3>

          <!-- Theme -->
          <div class="flex items-center justify-between py-1">
            <span class="text-xs font-medium text-slate-300">Theme</span>
            <div class="inline-flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button data-theme="dark" class="px-3 py-1.5 rounded-lg transition ${settings.theme !== 'light' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}">
                🌙 Dark
              </button>
              <button data-theme="light" class="px-3 py-1.5 rounded-lg transition ${settings.theme === 'light' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}">
                ☀️ Light
              </button>
            </div>
          </div>

          <!-- Speech Voice Rate -->
          <div class="flex items-center justify-between py-1 border-t border-slate-800/80 pt-2">
            <div>
              <div class="text-xs font-medium text-slate-300">Pronunciation Speed</div>
              <div class="text-[10px] text-slate-400">Slow for learning, normal for natural speech</div>
            </div>
            <select id="stats-voice-speed" class="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none">
              <option value="0.75" ${settings.audioSpeed === 0.75 ? 'selected' : ''}>0.75x (Slow)</option>
              <option value="0.9" ${settings.audioSpeed === 0.9 ? 'selected' : ''}>0.9x (Relaxed)</option>
              <option value="1.0" ${(!settings.audioSpeed || settings.audioSpeed === 1.0) ? 'selected' : ''}>1.0x (Normal)</option>
              <option value="1.2" ${settings.audioSpeed === 1.2 ? 'selected' : ''}>1.2x (Fast)</option>
            </select>
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Timer mode buttons
    this.container.querySelectorAll('[data-timer-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-timer-mode');
        storage.saveSettings({ timerMode: mode });
        audio.haptic('light');
        this.render();
      });
    });

    // Theme toggle
    this.container.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        storage.saveSettings({ theme });
        document.documentElement.classList.toggle('light-theme', theme === 'light');
        audio.haptic('light');
        this.render();
      });
    });

    // Speech speed
    const speedSelect = this.container.querySelector('#stats-voice-speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        const speed = parseFloat(e.target.value);
        storage.saveSettings({ audioSpeed: speed });
        audio.setSpeed(speed);
        audio.haptic('light');
      });
    }
  }
}
