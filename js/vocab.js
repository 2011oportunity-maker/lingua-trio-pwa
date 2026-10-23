import { storage } from './storage.js';
import { audio } from './audio.js';
import { CATEGORIES, LANGUAGES } from './data.js';

export class VocabManager {
  constructor({ container, onDataChange }) {
    this.container = container;
    this.onDataChange = onDataChange;
    this.searchTerm = '';
    this.selectedCategory = 'All';
    this.editingCardId = null;

    this.init();
  }

  init() {
    this.render();
  }

  getFilteredCards() {
    let cards = storage.getAllCards();

    if (this.selectedCategory !== 'All') {
      cards = cards.filter(c => c.category === this.selectedCategory);
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      cards = cards.filter(c =>
        (c.en && c.en.toLowerCase().includes(q)) ||
        (c.ro && c.ro.toLowerCase().includes(q)) ||
        (c.ru && c.ru.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    return cards;
  }

  render() {
    const allCards = storage.getAllCards();
    const categories = ['All', ...new Set(allCards.map(c => c.category))];
    const filtered = this.getFilteredCards();

    this.container.innerHTML = `
      <div class="vocab-screen flex flex-col h-full max-w-lg mx-auto px-4 pb-20 select-none">
        
        <!-- Header & Action Row -->
        <div class="pt-2 pb-3 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-black text-white tracking-tight">Vocabulary Bank</h2>
              <p class="text-xs text-slate-400">${allCards.length} tri-lingual triplets stored</p>
            </div>
            <div class="flex items-center space-x-2">
              <button id="vocab-backup-btn" class="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95 border border-slate-700 transition" title="Backup / Restore">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              </button>
              <button id="vocab-add-btn" class="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 active:scale-95 shadow-md flex items-center space-x-1 transition">
                <span>+ Add Word</span>
              </button>
            </div>
          </div>

          <!-- Search Input (>= 16px font-size to prevent iOS zoom) -->
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input
              id="vocab-search-input"
              type="text"
              class="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 text-base outline-none shadow-inner"
              style="font-size: 16px;"
              placeholder="Search EN, RO, or RU..."
              value="${this.searchTerm}"
              autocomplete="off"
            />
          </div>

          <!-- Category filter slider -->
          <div class="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
            ${categories.map(cat => `
              <button data-filter-cat="${cat}" class="whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition-all ${
                this.selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-750 border border-slate-700/50'
              }">
                ${cat}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Cards List -->
        <div class="flex-1 overflow-y-auto space-y-2.5 pr-0.5 pb-6">
          ${filtered.length === 0 ? `
            <div class="text-center py-12 text-slate-500">
              <p class="text-base font-semibold">No words match your search.</p>
              <p class="text-xs mt-1">Try a different keyword or add a new card.</p>
            </div>
          ` : filtered.map(card => `
            <div class="vocab-item bg-slate-900/80 hover:bg-slate-850 border border-slate-800/80 rounded-2xl p-3.5 shadow-sm transition">
              <div class="flex items-center justify-between pb-2 border-b border-slate-800/60 text-xs">
                <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-900/50">
                  ${card.category}
                </span>
                <div class="flex items-center space-x-1.5">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    card.mastery === 'mastered' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    card.mastery === 'learning' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-slate-800 text-slate-400'
                  }">
                    ${card.mastery || 'new'}
                  </span>
                  <button data-edit-id="${card.id}" class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button data-delete-id="${card.id}" class="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <!-- 3 Languages Triplet Display -->
              <div class="grid grid-cols-3 gap-2 pt-2.5">
                <!-- English -->
                <div class="flex items-center justify-between bg-slate-800/40 p-2 rounded-xl">
                  <div class="truncate">
                    <div class="text-[10px] text-slate-400 flex items-center space-x-1">
                      <span>🇬🇧</span> <span class="font-bold">EN</span>
                    </div>
                    <div class="font-bold text-slate-100 text-sm truncate" title="${card.en}">${card.en}</div>
                  </div>
                  <button data-speak-text="${card.en}" data-speak-lang="en" class="p-1 rounded-full text-slate-400 hover:text-white active:scale-90">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  </button>
                </div>

                <!-- Romanian -->
                <div class="flex items-center justify-between bg-slate-800/40 p-2 rounded-xl">
                  <div class="truncate">
                    <div class="text-[10px] text-slate-400 flex items-center space-x-1">
                      <span>🇷🇴</span> <span class="font-bold">RO</span>
                    </div>
                    <div class="font-bold text-amber-300 text-sm truncate" title="${card.ro}">${card.ro}</div>
                  </div>
                  <button data-speak-text="${card.ro}" data-speak-lang="ro" class="p-1 rounded-full text-slate-400 hover:text-white active:scale-90">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  </button>
                </div>

                <!-- Russian -->
                <div class="flex items-center justify-between bg-slate-800/40 p-2 rounded-xl">
                  <div class="truncate">
                    <div class="text-[10px] text-slate-400 flex items-center space-x-1">
                      <span>🇷🇺</span> <span class="font-bold">RU</span>
                    </div>
                    <div class="font-bold text-rose-300 text-sm truncate" title="${card.ru}">${card.ru}</div>
                  </div>
                  <button data-speak-text="${card.ru}" data-speak-lang="ru" class="p-1 rounded-full text-slate-400 hover:text-white active:scale-90">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  </button>
                </div>
              </div>

              ${card.notes ? `
                <div class="mt-2 text-[11px] text-slate-400 italic px-1">
                  ${card.notes}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Add / Edit Modal Container -->
        <div id="vocab-modal-root"></div>

        <!-- Backup / Restore Modal Container -->
        <div id="vocab-backup-modal-root"></div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Search input
    const searchInput = this.container.querySelector('#vocab-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.renderListOnly();
      });
    }

    // Category filter pills
    this.container.querySelectorAll('[data-filter-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.getAttribute('data-filter-cat');
        audio.haptic('light');
        this.render();
      });
    });

    // Add button
    const addBtn = this.container.querySelector('#vocab-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        audio.haptic('light');
        this.openCardModal(null);
      });
    }

    // Backup button
    const backupBtn = this.container.querySelector('#vocab-backup-btn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        audio.haptic('light');
        this.openBackupModal();
      });
    }

    // Edit buttons
    this.container.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-id');
        audio.haptic('light');
        this.openCardModal(id);
      });
    });

    // Delete buttons
    this.container.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        const card = storage.getCard(id);
        if (confirm(`Delete card "${card.en} / ${card.ro} / ${card.ru}"?`)) {
          audio.haptic('medium');
          storage.deleteCard(id);
          if (this.onDataChange) this.onDataChange();
          this.render();
        }
      });
    });

    // Pronunciation speak buttons
    this.container.querySelectorAll('[data-speak-text]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak-text');
        const lang = btn.getAttribute('data-speak-lang');
        audio.haptic('light');
        audio.speak(text, lang);
      });
    });
  }

  renderListOnly() {
    // Refresh only the list without replacing whole DOM
    const filtered = this.getFilteredCards();
    const listEl = this.container.querySelector('.vocab-screen > .flex-1');
    if (!listEl) {
      this.render();
      return;
    }
    // Re-render
    this.render();
  }

  openCardModal(cardId = null) {
    const isEdit = !!cardId;
    const card = isEdit ? storage.getCard(cardId) : {
      en: '',
      ro: '',
      ru: '',
      category: this.selectedCategory !== 'All' ? this.selectedCategory : 'Everyday & Greetings',
      notes: ''
    };

    const modalRoot = this.container.querySelector('#vocab-modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 class="text-lg font-black text-white">${isEdit ? 'Edit Word Triplet' : 'Add New Word Triplet'}</h3>
            <button id="modal-close-btn" class="p-1 rounded-lg text-slate-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <form id="card-modal-form" class="space-y-3">
            <!-- Category -->
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Category</label>
              <select id="modal-card-category" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-base outline-none">
                ${CATEGORIES.map(c => `
                  <option value="${c}" ${card.category === c ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>

            <!-- English -->
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1 flex items-center space-x-1">
                <span>🇬🇧</span> <span>English Word / Phrase</span>
              </label>
              <input
                id="modal-card-en"
                type="text"
                class="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-white text-base outline-none"
                style="font-size: 16px;"
                placeholder="e.g. Hello"
                value="${card.en || ''}"
                required
              />
            </div>

            <!-- Romanian with Diacritic Quick Bar -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-semibold uppercase text-slate-400 flex items-center space-x-1">
                  <span>🇷🇴</span> <span>Romanian Translation</span>
                </label>
                <!-- Mini Diacritic bar for Romanian -->
                <div class="flex items-center space-x-1">
                  ${['ă', 'â', 'î', 'ș', 'ț'].map(char => `
                    <button type="button" data-modal-char="${char}" class="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-indigo-600 text-xs font-bold text-white transition">
                      ${char}
                    </button>
                  `).join('')}
                </div>
              </div>
              <input
                id="modal-card-ro"
                type="text"
                class="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white text-base outline-none"
                style="font-size: 16px;"
                placeholder="e.g. Bună"
                value="${card.ro || ''}"
                required
              />
            </div>

            <!-- Russian -->
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1 flex items-center space-x-1">
                <span>🇷🇺</span> <span>Russian Translation</span>
              </label>
              <input
                id="modal-card-ru"
                type="text"
                class="w-full bg-slate-800 border border-slate-700 focus:border-rose-500 rounded-xl px-3 py-2.5 text-white text-base outline-none"
                style="font-size: 16px;"
                placeholder="e.g. Привет"
                value="${card.ru || ''}"
                required
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Context / Memory Tip</label>
              <input
                id="modal-card-notes"
                type="text"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 text-sm outline-none"
                style="font-size: 16px;"
                placeholder="e.g. Informal greeting among friends"
                value="${card.notes || ''}"
              />
            </div>

            <div class="pt-3 flex space-x-2">
              <button type="button" id="modal-cancel-btn" class="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300 transition">
                Cancel
              </button>
              <button type="submit" class="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 transition">
                ${isEdit ? 'Save Changes' : 'Add Triplet'}
              </button>
            </div>
          </form>

        </div>
      </div>
    `;

    // Diacritic buttons inside modal
    const roInput = modalRoot.querySelector('#modal-card-ro');
    modalRoot.querySelectorAll('[data-modal-char]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const char = btn.getAttribute('data-modal-char');
        const start = roInput.selectionStart || roInput.value.length;
        const end = roInput.selectionEnd || roInput.value.length;
        roInput.value = roInput.value.substring(0, start) + char + roInput.value.substring(end);
        roInput.selectionStart = roInput.selectionEnd = start + char.length;
        roInput.focus();
      });
    });

    const closeModal = () => {
      modalRoot.innerHTML = '';
    };

    modalRoot.querySelector('#modal-close-btn').addEventListener('click', closeModal);
    modalRoot.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);

    const form = modalRoot.querySelector('#card-modal-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const en = modalRoot.querySelector('#modal-card-en').value.trim();
      const ro = modalRoot.querySelector('#modal-card-ro').value.trim();
      const ru = modalRoot.querySelector('#modal-card-ru').value.trim();
      const category = modalRoot.querySelector('#modal-card-category').value;
      const notes = modalRoot.querySelector('#modal-card-notes').value.trim();

      if (!en || !ro || !ru) {
        alert('Please fill out all three languages (English, Romanian, Russian).');
        return;
      }

      audio.haptic('success');
      if (isEdit) {
        storage.updateCard(cardId, { en, ro, ru, category, notes });
      } else {
        storage.addCard({ en, ro, ru, category, notes });
      }

      if (this.onDataChange) this.onDataChange();
      closeModal();
      this.render();
    });
  }

  openBackupModal() {
    const backupModalRoot = this.container.querySelector('#vocab-backup-modal-root');
    if (!backupModalRoot) return;

    backupModalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 class="text-lg font-black text-white">Backup & Restore</h3>
            <button id="backup-modal-close" class="p-1 rounded-lg text-slate-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Export Section -->
          <div class="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-2">
            <h4 class="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>📤</span> <span>Export Vocabulary (JSON)</span>
            </h4>
            <p class="text-xs text-slate-400">Save all cards, custom words, and mastery progress to a file.</p>
            <div class="flex space-x-2 pt-1">
              <button id="backup-download-btn" class="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow transition">
                Download JSON File
              </button>
              <button id="backup-copy-btn" class="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-xs text-slate-200 transition">
                Copy JSON
              </button>
            </div>
          </div>

          <!-- Import Section -->
          <div class="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-2">
            <h4 class="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>📥</span> <span>Import / Restore (JSON)</span>
            </h4>
            <p class="text-xs text-slate-400">Upload a previously exported backup file or paste JSON.</p>
            
            <input type="file" id="backup-file-input" accept=".json,application/json" class="hidden" />
            <button id="backup-upload-btn" class="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-650 font-bold text-xs text-slate-200 border border-slate-600 transition flex items-center justify-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              <span>Choose Backup File...</span>
            </button>

            <textarea
              id="backup-paste-area"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-300 font-mono h-20 outline-none"
              placeholder="Or paste JSON content here..."
            ></textarea>
            <button id="backup-apply-paste-btn" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-indigo-300 border border-indigo-900/40 transition">
              Apply Pasted JSON
            </button>
          </div>

          <!-- Reset Defaults -->
          <div class="pt-2">
            <button id="backup-reset-defaults-btn" class="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-bold text-xs transition">
              Reset to Starter Pack (~42 Words)
            </button>
          </div>

        </div>
      </div>
    `;

    const closeBackup = () => {
      backupModalRoot.innerHTML = '';
    };

    backupModalRoot.querySelector('#backup-modal-close').addEventListener('click', closeBackup);

    // Download JSON
    backupModalRoot.querySelector('#backup-download-btn').addEventListener('click', () => {
      audio.haptic('light');
      const data = storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linguatrio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Copy JSON
    backupModalRoot.querySelector('#backup-copy-btn').addEventListener('click', () => {
      audio.haptic('light');
      navigator.clipboard.writeText(storage.exportData()).then(() => {
        alert('Backup JSON copied to clipboard!');
      });
    });

    // File input
    const fileInput = backupModalRoot.querySelector('#backup-file-input');
    backupModalRoot.querySelector('#backup-upload-btn').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = storage.importData(event.target.result);
        if (res.success) {
          audio.haptic('success');
          alert(`Successfully imported ${res.count} vocabulary cards!`);
          if (this.onDataChange) this.onDataChange();
          closeBackup();
          this.render();
        } else {
          audio.haptic('error');
          alert('Import failed: ' + res.error);
        }
      };
      reader.readAsText(file);
    });

    // Apply paste
    backupModalRoot.querySelector('#backup-apply-paste-btn').addEventListener('click', () => {
      const text = backupModalRoot.querySelector('#backup-paste-area').value.trim();
      if (!text) return;
      const res = storage.importData(text);
      if (res.success) {
        audio.haptic('success');
        alert(`Successfully imported ${res.count} vocabulary cards!`);
        if (this.onDataChange) this.onDataChange();
        closeBackup();
        this.render();
      } else {
        audio.haptic('error');
        alert('Import failed: ' + res.error);
      }
    });

    // Reset defaults
    backupModalRoot.querySelector('#backup-reset-defaults-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset to the original starter pack? Custom words will be replaced.')) {
        audio.haptic('medium');
        storage.resetToDefaults();
        if (this.onDataChange) this.onDataChange();
        closeBackup();
        this.render();
      }
    });
  }
}
