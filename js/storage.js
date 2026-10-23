import { STARTER_VOCABULARY } from './data.js';

const STORAGE_KEYS = {
  VOCAB: 'linguatrio_vocab_v1',
  STATS: 'linguatrio_stats_v1',
  SETTINGS: 'linguatrio_settings_v1'
};

const DEFAULT_SETTINGS = {
  promptLang: 'en',
  answerLangs: ['ro', 'ru'], // array of 1 or 2 target languages
  activeCategory: 'All',
  timerMode: 'off', // 'off' | '30' | '60' | 'per-card'
  audioSpeed: 1.0,
  theme: 'dark'
};

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class StorageManager {
  constructor() {
    this.vocab = this._loadVocab();
    this.stats = this._loadStats();
    this.settings = this._loadSettings();
  }

  // --- Vocabulary Management ---

  _loadVocab() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VOCAB);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse vocab from localStorage', e);
    }
    // Initialize defaults with metadata
    const initialized = STARTER_VOCABULARY.map(item => ({
      ...item,
      mastery: 'new', // 'new' | 'learning' | 'mastered'
      reviewCount: 0,
      correctCount: 0,
      streak: 0,
      lastReviewed: null
    }));
    this._saveVocab(initialized);
    return initialized;
  }

  _saveVocab(cards = this.vocab) {
    this.vocab = cards;
    try {
      localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(cards));
    } catch (e) {
      console.error('Storage full or unavailable', e);
    }
  }

  getAllCards() {
    return [...this.vocab];
  }

  getCard(id) {
    return this.vocab.find(c => c.id === id) || null;
  }

  addCard({ en, ro, ru, category, notes }) {
    const newCard = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      category: category || 'Everyday & Greetings',
      en: (en || '').trim(),
      ro: (ro || '').trim(),
      ru: (ru || '').trim(),
      notes: (notes || '').trim(),
      mastery: 'new',
      reviewCount: 0,
      correctCount: 0,
      streak: 0,
      lastReviewed: null,
      createdAt: new Date().toISOString()
    };
    this.vocab.unshift(newCard);
    this._saveVocab();
    return newCard;
  }

  updateCard(id, updates) {
    const idx = this.vocab.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.vocab[idx] = {
      ...this.vocab[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._saveVocab();
    return this.vocab[idx];
  }

  deleteCard(id) {
    const initialLen = this.vocab.length;
    this.vocab = this.vocab.filter(c => c.id !== id);
    if (this.vocab.length !== initialLen) {
      this._saveVocab();
      return true;
    }
    return false;
  }

  recordCardReview(id, rating) {
    // rating: 'again' | 'hard' | 'good' | 'easy'
    const card = this.getCard(id);
    if (!card) return null;

    const isCorrect = rating === 'good' || rating === 'easy';
    const newReviewCount = (card.reviewCount || 0) + 1;
    let newStreak = card.streak || 0;
    let newCorrectCount = card.correctCount || 0;
    let mastery = card.mastery || 'new';

    if (rating === 'again') {
      newStreak = 0;
      mastery = 'learning';
    } else if (rating === 'hard') {
      newStreak = Math.max(1, newStreak);
      mastery = 'learning';
    } else if (rating === 'good') {
      newStreak += 1;
      newCorrectCount += 1;
      mastery = newStreak >= 3 ? 'mastered' : 'learning';
    } else if (rating === 'easy') {
      newStreak += 2;
      newCorrectCount += 1;
      mastery = 'mastered';
    }

    const updated = this.updateCard(id, {
      reviewCount: newReviewCount,
      correctCount: newCorrectCount,
      streak: newStreak,
      mastery,
      lastReviewed: new Date().toISOString()
    });

    this.updateDailyActivity(isCorrect);
    return updated;
  }

  resetToDefaults() {
    const initialized = STARTER_VOCABULARY.map(item => ({
      ...item,
      mastery: 'new',
      reviewCount: 0,
      correctCount: 0,
      streak: 0,
      lastReviewed: null
    }));
    this._saveVocab(initialized);
    return initialized;
  }

  exportData() {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      cards: this.vocab,
      stats: this.stats,
      settings: this.settings
    }, null, 2);
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.cards) || data.cards.length === 0) {
        return { success: false, error: 'Invalid backup file: missing cards array.' };
      }
      // Sanitize imported cards
      const sanitized = data.cards.map(c => ({
        id: c.id || ('card-' + Math.random().toString(36).substr(2, 9)),
        category: c.category || 'Everyday & Greetings',
        en: String(c.en || '').trim(),
        ro: String(c.ro || '').trim(),
        ru: String(c.ru || '').trim(),
        notes: String(c.notes || ''),
        mastery: ['new', 'learning', 'mastered'].includes(c.mastery) ? c.mastery : 'new',
        reviewCount: Number(c.reviewCount) || 0,
        correctCount: Number(c.correctCount) || 0,
        streak: Number(c.streak) || 0,
        lastReviewed: c.lastReviewed || null
      }));

      this._saveVocab(sanitized);

      if (data.stats && typeof data.stats === 'object') {
        this.stats = { ...this._loadStats(), ...data.stats };
        this._saveStats();
      }

      return { success: true, count: sanitized.length };
    } catch (e) {
      return { success: false, error: 'JSON parse error: ' + e.message };
    }
  }

  // --- Gamification & Stats ---

  _loadStats() {
    const today = getTodayString();
    const defaults = {
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: null,
      reviewsToday: 0,
      correctToday: 0,
      todayDate: today,
      totalReviews: 0,
      totalCorrect: 0,
      history: {} // { 'YYYY-MM-DD': { reviews: X, correct: Y } }
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATS);
      if (raw) {
        const parsed = JSON.parse(raw);
        const stats = { ...defaults, ...parsed };
        // Check if today changed
        if (stats.todayDate !== today) {
          stats.todayDate = today;
          stats.reviewsToday = 0;
          stats.correctToday = 0;
        }
        return stats;
      }
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
    return defaults;
  }

  _saveStats() {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(this.stats));
    } catch (e) {
      console.error('Failed to save stats', e);
    }
  }

  getStats() {
    const today = getTodayString();
    if (this.stats.todayDate !== today) {
      this.stats.todayDate = today;
      this.stats.reviewsToday = 0;
      this.stats.correctToday = 0;
      this._saveStats();
    }

    // Calculate mastery totals
    const counts = { new: 0, learning: 0, mastered: 0 };
    for (const card of this.vocab) {
      counts[card.mastery || 'new'] = (counts[card.mastery || 'new'] || 0) + 1;
    }

    return {
      ...this.stats,
      masteryBreakdown: counts,
      totalCards: this.vocab.length
    };
  }

  updateDailyActivity(isCorrect) {
    const today = getTodayString();
    const stats = this.stats;

    // Check streak logic
    if (stats.lastActiveDate !== today) {
      if (stats.lastActiveDate) {
        const last = new Date(stats.lastActiveDate);
        const cur = new Date(today);
        const diffDays = Math.round((cur - last) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day!
          stats.currentStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          stats.currentStreak = 1;
        }
      } else {
        stats.currentStreak = 1;
      }

      stats.lastActiveDate = today;
      stats.todayDate = today;
      stats.reviewsToday = 0;
      stats.correctToday = 0;
    }

    if (stats.currentStreak > (stats.bestStreak || 0)) {
      stats.bestStreak = stats.currentStreak;
    }

    stats.reviewsToday += 1;
    stats.totalReviews = (stats.totalReviews || 0) + 1;
    if (isCorrect) {
      stats.correctToday += 1;
      stats.totalCorrect = (stats.totalCorrect || 0) + 1;
    }

    // Save in history map
    if (!stats.history) stats.history = {};
    if (!stats.history[today]) {
      stats.history[today] = { reviews: 0, correct: 0 };
    }
    stats.history[today].reviews += 1;
    if (isCorrect) stats.history[today].correct += 1;

    this._saveStats();
  }

  // --- Settings ---

  _loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    return this.settings;
  }
}

export const storage = new StorageManager();
