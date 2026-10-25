import { storage } from './storage.js';
import { duoSound } from './duo-sound.js';
import { COURSES, UNIT_CONFIGS } from './duo-courses.js';
import { DuoLessonRunner } from './duo-lesson.js';

export class DuoLearningTree {
  constructor({ container, onSwitchToFlashcards, onStatsUpdate }) {
    this.container = container;
    this.onSwitchToFlashcards = onSwitchToFlashcards;
    this.onStatsUpdate = onStatsUpdate;

    this.activeLessonRunner = null;
    this.init();
  }

  init() {
    this.render();
  }

  getActiveCourse() {
    const courseId = storage.getActiveCourseId();
    return COURSES[courseId] || COURSES['ru-ro'];
  }

  render() {
    const course = this.getActiveCourse();
    const courseState = storage.getCourseState(course.id);
    const completedNodes = courseState.completedNodes || [];

    this.container.innerHTML = `
      <div class="duo-tree-screen flex flex-col h-full max-w-lg mx-auto pb-24 select-none overflow-y-auto">
        
        <!-- Top Course Quick Banner -->
        <div class="sticky top-0 z-20 px-4 py-2.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between">
          <button id="tree-course-selector-btn" class="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-sm transition">
            <span class="text-xl">${course.subtitle}</span>
            <div class="text-left">
              <div class="text-xs font-black text-white leading-tight">${course.title}</div>
              <div class="text-[10px] text-slate-400">Tap to switch course ▾</div>
            </div>
          </button>

          <!-- Quick Refill Hearts Button if hearts < 5 -->
          ${storage.getHearts() < 5 ? `
            <button id="tree-refill-hearts-btn" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-bold hover:bg-rose-900 active:scale-95 transition" title="Practice flashcards to refill lives">
              <span>❤️ ${storage.getHearts()}/5</span>
              <span class="text-[10px] bg-rose-800 px-1.5 py-0.5 rounded-full text-white">+Refill</span>
            </button>
          ` : `
            <div class="flex items-center space-x-1 text-xs font-bold text-slate-400">
              <span class="text-emerald-400">✓ Full Hearts</span>
            </div>
          `}
        </div>

        <!-- Vertical Learning Path (The Tree Roadmap) -->
        <div class="px-4 py-4 space-y-8">
          ${UNIT_CONFIGS.map((unit, unitIdx) => {
            return `
              <div class="unit-block space-y-4">
                
                <!-- Unit Header Banner -->
                <div class="rounded-3xl p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg relative overflow-hidden">
                  <div class="flex items-center justify-between relative z-10">
                    <div>
                      <div class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-100/90">
                        ${unit.title}
                      </div>
                      <div class="text-base font-black mt-0.5">${unit.subtitle}</div>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
                      ${unit.icon}
                    </div>
                  </div>
                  <!-- Background Pattern -->
                  <div class="absolute -right-4 -bottom-6 text-7xl opacity-10 pointer-events-none">
                    ${unit.icon}
                  </div>
                </div>

                <!-- Stepping Stones Path -->
                <div class="py-2 flex flex-col items-center space-y-6 relative">
                  ${unit.nodes.map((node, nodeIdx) => {
                    const isCompleted = completedNodes.includes(node.id);
                    // A node is active if it's the very first uncompleted node
                    const allPreviousCompleted = unit.nodes.slice(0, nodeIdx).every(n => completedNodes.includes(n.id)) &&
                      (unitIdx === 0 || completedNodes.includes(UNIT_CONFIGS[unitIdx - 1].nodes[UNIT_CONFIGS[unitIdx - 1].nodes.length - 1].id));
                    
                    const isActive = !isCompleted && allPreviousCompleted;
                    const isLocked = !isCompleted && !isActive;

                    // Undulating horizontal offsets: 0, -32px, 0, 32px
                    const offsets = ['translate-x-0', '-translate-x-7', 'translate-x-0', 'translate-x-7'];
                    const offsetClass = offsets[nodeIdx % offsets.length];

                    return `
                      <div class="node-wrapper relative flex flex-col items-center ${offsetClass}">
                        
                        <!-- "START" Callout tooltip if Active -->
                        ${isActive ? `
                          <div class="absolute -top-7 animate-bounce bg-white text-slate-950 font-black text-[11px] px-3 py-0.5 rounded-full shadow-lg border border-slate-200 uppercase tracking-wider z-10 pointer-events-none">
                            START
                          </div>
                        ` : ''}

                        <!-- The Stepping Stone Circle -->
                        <button
                          data-node-id="${node.id}"
                          data-unit-id="${unit.id}"
                          data-node-state="${isCompleted ? 'completed' : isActive ? 'active' : 'locked'}"
                          class="duo-stone-btn w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all duration-200 relative select-none ${
                            isCompleted
                              ? 'bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 active:border-b-0 active:translate-y-1 text-slate-900 ring-2 ring-amber-300/60'
                              : isActive
                              ? 'bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 text-white ring-4 ring-emerald-500/40 animate-pulse'
                              : 'bg-slate-800 border-b-4 border-slate-900 text-slate-500 cursor-not-allowed opacity-75'
                          }"
                        >
                          ${isCompleted ? '👑' : isLocked ? '🔒' : node.icon}
                        </button>

                        <!-- Node Title & XP -->
                        <div class="mt-1.5 text-center">
                          <span class="text-xs font-extrabold ${isLocked ? 'text-slate-500' : 'text-slate-200'}">
                            ${node.title}
                          </span>
                        </div>

                      </div>
                    `;
                  }).join('')}

                  <!-- Chest reward at end of unit -->
                  <div class="pt-2 text-center">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-2xl opacity-75">
                      🎁
                    </div>
                  </div>

                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- Node Preview / Start Lesson Modal Root -->
        <div id="tree-node-modal-root"></div>

        <!-- Course Switcher Modal Root -->
        <div id="tree-course-modal-root"></div>

        <!-- Lesson Runner Mount Target -->
        <div id="tree-lesson-runner-mount"></div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Course switcher button
    const courseBtn = this.container.querySelector('#tree-course-selector-btn');
    if (courseBtn) {
      courseBtn.addEventListener('click', () => {
        duoSound.playTap();
        this.openCourseModal();
      });
    }

    // Refill hearts button
    const refillBtn = this.container.querySelector('#tree-refill-hearts-btn');
    if (refillBtn) {
      refillBtn.addEventListener('click', () => {
        duoSound.playTap();
        if (this.onSwitchToFlashcards) this.onSwitchToFlashcards();
      });
    }

    // Stepping Stone taps
    this.container.querySelectorAll('.duo-stone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const state = btn.getAttribute('data-node-state');
        const unitId = btn.getAttribute('data-unit-id');
        const nodeId = btn.getAttribute('data-node-id');

        if (state === 'locked') {
          duoSound.playWrong();
          btn.classList.add('animate-shake');
          setTimeout(() => btn.classList.remove('animate-shake'), 400);
          return;
        }

        duoSound.playTap();
        this.openNodeModal(unitId, nodeId, state);
      });
    });
  }

  openNodeModal(unitId, nodeId, state) {
    const unit = UNIT_CONFIGS.find(u => u.id === unitId);
    const node = unit.nodes.find(n => n.id === nodeId);
    const modalRoot = this.container.querySelector('#tree-node-modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-inner">
            ${node.icon}
          </div>

          <div>
            <h3 class="text-xl font-black text-white">${node.title}</h3>
            <p class="text-xs text-slate-400 mt-1">${unit.title} • ${node.isCrown ? 'Crown Mastery' : 'Lesson Practice'}</p>
          </div>

          <div class="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 flex items-center justify-around text-xs">
            <div>
              <span class="text-slate-400">Reward</span>
              <div class="font-extrabold text-amber-400 text-sm">+${node.xp || 15} XP</div>
            </div>
            <div class="h-6 w-px bg-slate-700"></div>
            <div>
              <span class="text-slate-400">Exercises</span>
              <div class="font-extrabold text-white text-sm">${node.wordCount || 6} Steps</div>
            </div>
          </div>

          <div class="space-y-2 pt-2">
            <button id="modal-start-lesson-btn" class="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 border-b-4 border-emerald-800 font-black text-base uppercase tracking-wider text-white shadow-xl active:scale-95 transition">
              Start (+${node.xp || 15} XP)
            </button>
            <button id="modal-cancel-lesson-btn" class="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    modalRoot.querySelector('#modal-cancel-lesson-btn').addEventListener('click', () => {
      modalRoot.innerHTML = '';
    });

    modalRoot.querySelector('#modal-start-lesson-btn').addEventListener('click', () => {
      modalRoot.innerHTML = '';
      this.launchLesson(unitId, nodeId);
    });
  }

  openCourseModal() {
    const modalRoot = this.container.querySelector('#tree-course-modal-root');
    if (!modalRoot) return;

    const currentCourseId = storage.getActiveCourseId();

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 class="text-lg font-black text-white">Select Language Course</h3>
              <p class="text-xs text-slate-400">Choose which pair you want to practice</p>
            </div>
            <button id="course-modal-close" class="p-1 rounded-lg text-slate-400 hover:text-white">✕</button>
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

    modalRoot.querySelector('#course-modal-close').addEventListener('click', () => {
      modalRoot.innerHTML = '';
    });

    modalRoot.querySelectorAll('[data-course-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosenId = btn.getAttribute('data-course-choice');
        duoSound.playTap();
        storage.setActiveCourseId(chosenId);
        modalRoot.innerHTML = '';
        this.render();
        if (this.onStatsUpdate) this.onStatsUpdate();
      });
    });
  }

  launchLesson(unitId, nodeId) {
    const runnerMount = this.container.querySelector('#tree-lesson-runner-mount');
    if (!runnerMount) return;

    this.activeLessonRunner = new DuoLessonRunner({
      container: runnerMount,
      courseId: storage.getActiveCourseId(),
      unitId,
      nodeId,
      onComplete: () => {
        runnerMount.innerHTML = '';
        this.activeLessonRunner = null;
        this.render();
        if (this.onStatsUpdate) this.onStatsUpdate();
      },
      onExit: () => {
        runnerMount.innerHTML = '';
        this.activeLessonRunner = null;
        this.render();
      },
      onPracticeRefill: () => {
        runnerMount.innerHTML = '';
        this.activeLessonRunner = null;
        if (this.onSwitchToFlashcards) this.onSwitchToFlashcards();
      }
    });
  }
}
