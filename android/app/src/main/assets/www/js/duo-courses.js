import { STARTER_VOCABULARY, CATEGORIES, LANGUAGES } from './data.js';

export const COURSES = {
  'ru-ro': {
    id: 'ru-ro',
    from: 'ru',
    to: 'ro',
    fromFlag: '🇷🇺',
    toFlag: '🇷🇴',
    title: 'Румынский с русского',
    subtitle: '🇷🇺 ➔ 🇷🇴',
    desc: 'Изучайте румынский язык на русском'
  },
  'ru-en': {
    id: 'ru-en',
    from: 'ru',
    to: 'en',
    fromFlag: '🇷🇺',
    toFlag: '🇬🇧',
    title: 'Английский с русского',
    subtitle: '🇷🇺 ➔ 🇬🇧',
    desc: 'Изучайте английский язык на русском'
  },
  'en-ro': {
    id: 'en-ro',
    from: 'en',
    to: 'ro',
    fromFlag: '🇬🇧',
    toFlag: '🇷🇴',
    title: 'Romanian from English',
    subtitle: '🇬🇧 ➔ 🇷🇴',
    desc: 'Learn Romanian starting from English'
  }
};

export const UNIT_CONFIGS = [
  {
    id: 'unit-1',
    category: 'Everyday & Phrases',
    title: 'Unit 1: Everyday & Phrases',
    subtitle: 'Greetings, polite expressions & basics',
    icon: '💬',
    themeColor: 'emerald',
    nodes: [
      { id: 'u1-n1', title: 'Greetings', icon: '👋', xp: 10, wordCount: 5 },
      { id: 'u1-n2', title: 'Polite Phrases', icon: '🙏', xp: 10, wordCount: 5 },
      { id: 'u1-n3', title: 'Daily Dialogue', icon: '🗣️', xp: 15, wordCount: 6 },
      { id: 'u1-n4', title: 'Unit 1 Crown', icon: '👑', xp: 20, wordCount: 8, isCrown: true }
    ]
  },
  {
    id: 'unit-2',
    category: 'Food, Cafe & Kitchen',
    title: 'Unit 2: Food & Kitchen',
    subtitle: 'Bakery, drinks, meals & restaurant',
    icon: '🍕',
    themeColor: 'amber',
    nodes: [
      { id: 'u2-n1', title: 'Breakfast & Cafe', icon: '☕', xp: 10, wordCount: 5 },
      { id: 'u2-n2', title: 'Bakery Staples', icon: '🍞', xp: 10, wordCount: 5 },
      { id: 'u2-n3', title: 'Dinner & Dining', icon: '🍽️', xp: 15, wordCount: 6 },
      { id: 'u2-n4', title: 'Unit 2 Crown', icon: '👑', xp: 20, wordCount: 8, isCrown: true }
    ]
  },
  {
    id: 'unit-3',
    category: 'Travel & Navigation',
    title: 'Unit 3: Travel & Transit',
    subtitle: 'Airport, navigation, hotel & directions',
    icon: '✈️',
    themeColor: 'sky',
    nodes: [
      { id: 'u3-n1', title: 'Getting Around', icon: '🚆', xp: 10, wordCount: 5 },
      { id: 'u3-n2', title: 'Directions', icon: '🧭', xp: 10, wordCount: 5 },
      { id: 'u3-n3', title: 'Hotel & Passport', icon: '🏨', xp: 15, wordCount: 6 },
      { id: 'u3-n4', title: 'Unit 3 Crown', icon: '👑', xp: 20, wordCount: 8, isCrown: true }
    ]
  },
  {
    id: 'unit-4',
    category: 'Time, Days & Numbers',
    title: 'Unit 4: Time & Numbers',
    subtitle: 'Calendar, weekdays & counting',
    icon: '⏰',
    themeColor: 'purple',
    nodes: [
      { id: 'u4-n1', title: 'Numbers 1-10', icon: '🔢', xp: 10, wordCount: 5 },
      { id: 'u4-n2', title: 'Days of the Week', icon: '📅', xp: 10, wordCount: 5 },
      { id: 'u4-n3', title: 'Clock & Today', icon: '⏳', xp: 15, wordCount: 6 },
      { id: 'u4-n4', title: 'Unit 4 Crown', icon: '👑', xp: 20, wordCount: 8, isCrown: true }
    ]
  },
  {
    id: 'unit-5',
    category: 'People & Family',
    title: 'Unit 5: People & Home',
    subtitle: 'Family members, friends & home life',
    icon: '👨‍👩‍👧',
    themeColor: 'rose',
    nodes: [
      { id: 'u5-n1', title: 'Family Members', icon: '❤️', xp: 10, wordCount: 5 },
      { id: 'u5-n2', title: 'Friends & Home', icon: '🏡', xp: 10, wordCount: 5 },
      { id: 'u5-n3', title: 'Unit 5 Crown', icon: '👑', xp: 20, wordCount: 7, isCrown: true }
    ]
  },
  {
    id: 'unit-6',
    category: 'Actions & Common Verbs',
    title: 'Unit 6: Essential Verbs',
    subtitle: 'Key actions to speak fluently',
    icon: '⚡',
    themeColor: 'indigo',
    nodes: [
      { id: 'u6-n1', title: 'Wants & Needs', icon: '💡', xp: 10, wordCount: 5 },
      { id: 'u6-n2', title: 'Daily Actions', icon: '🏃', xp: 10, wordCount: 5 },
      { id: 'u6-n3', title: 'Unit 6 Crown', icon: '👑', xp: 20, wordCount: 7, isCrown: true }
    ]
  }
];

/**
 * Generates an interactive lesson (5-8 steps) for a given node and active course.
 */
export function generateLessonExercises(courseId, unitId, nodeId) {
  const course = COURSES[courseId] || COURSES['ru-ro'];
  const fromLang = course.from; // base language e.g. 'ru'
  const toLang = course.to;     // target language e.g. 'ro'

  const unit = UNIT_CONFIGS.find(u => u.id === unitId) || UNIT_CONFIGS[0];
  const node = unit.nodes.find(n => n.id === nodeId) || unit.nodes[0];

  // Get words matching this unit category
  const allCards = STARTER_VOCABULARY;
  let pool = allCards.filter(c => c.category === unit.category);
  if (pool.length === 0) pool = allCards.slice(0, 15);

  // Shuffle pool
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const targetWords = shuffled.slice(0, Math.min(node.wordCount || 6, shuffled.length));

  const exercises = [];

  // Exercise 1: Multiple Choice (Base -> Target)
  const w1 = targetWords[0] || pool[0];
  const distractors1 = pool.filter(c => c.id !== w1.id).sort(() => Math.random() - 0.5).slice(0, 3);
  const mc1Options = [w1, ...distractors1].sort(() => Math.random() - 0.5).map(c => ({
    text: c[toLang],
    isCorrect: c.id === w1.id,
    card: c
  }));
  exercises.push({
    type: 'multiple-choice',
    instruction: `Select the correct translation:`,
    prompt: w1[fromLang],
    promptLang: fromLang,
    targetLang: toLang,
    correctAnswer: w1[toLang],
    options: mc1Options,
    card: w1
  });

  // Exercise 2: Word Bank / Bubble Builder
  const w2 = targetWords[1] || pool[1];
  // Break target word/phrase into tokens + 2 distractor tokens
  const wordsInTarget = w2[toLang].split(/\s+/);
  const distractorCards = pool.filter(c => c.id !== w2.id).slice(0, 3);
  const distractorWords = distractorCards.flatMap(c => c[toLang].split(/\s+/)).slice(0, 2);
  const allBubbles = [...wordsInTarget, ...distractorWords]
    .map((word, idx) => ({ id: `b-${idx}-${word}`, word }))
    .sort(() => Math.random() - 0.5);

  exercises.push({
    type: 'word-bank',
    instruction: `Tap the words to form the translation:`,
    prompt: w2[fromLang],
    promptLang: fromLang,
    targetLang: toLang,
    correctAnswer: w2[toLang],
    bubbles: allBubbles,
    expectedTokens: wordsInTarget,
    card: w2
  });

  // Exercise 3: Match the Pairs Grid (4 pairs)
  const matchSet = pool.slice(0, 4);
  const baseCards = matchSet.map(c => ({ id: `base-${c.id}`, cardId: c.id, text: c[fromLang], lang: fromLang }));
  const targetCards = matchSet.map(c => ({ id: `tgt-${c.id}`, cardId: c.id, text: c[toLang], lang: toLang }));
  exercises.push({
    type: 'match-pairs',
    instruction: `Tap the matching pairs:`,
    pairs: matchSet,
    leftItems: baseCards.sort(() => Math.random() - 0.5),
    rightItems: targetCards.sort(() => Math.random() - 0.5)
  });

  // Exercise 4: Multiple Choice (Target listening -> Base)
  const w3 = targetWords[2] || pool[2];
  const distractors3 = pool.filter(c => c.id !== w3.id).sort(() => Math.random() - 0.5).slice(0, 3);
  const mc3Options = [w3, ...distractors3].sort(() => Math.random() - 0.5).map(c => ({
    text: c[fromLang],
    isCorrect: c.id === w3.id,
    card: c
  }));
  exercises.push({
    type: 'multiple-choice',
    instruction: `What does this mean?`,
    prompt: w3[toLang],
    promptLang: toLang,
    targetLang: fromLang,
    isListeningPrompt: true,
    correctAnswer: w3[fromLang],
    options: mc3Options,
    card: w3
  });

  // Exercise 5: Typing / Active Recall
  const w4 = targetWords[3] || pool[3];
  exercises.push({
    type: 'typing',
    instruction: `Type in ${LANGUAGES[toLang].label}:`,
    prompt: w4[fromLang],
    promptLang: fromLang,
    targetLang: toLang,
    correctAnswer: w4[toLang],
    notes: w4.notes,
    card: w4
  });

  // Exercise 6: Crown / Final word bank drill
  const w5 = targetWords[4] || pool[4] || targetWords[0];
  const w5Tokens = w5[toLang].split(/\s+/);
  const w5Distractors = pool.filter(c => c.id !== w5.id).slice(0, 2).flatMap(c => c[toLang].split(/\s+/)).slice(0, 2);
  const w5Bubbles = [...w5Tokens, ...w5Distractors].map((w, i) => ({ id: `wb5-${i}-${w}`, word: w })).sort(() => Math.random() - 0.5);

  exercises.push({
    type: 'word-bank',
    instruction: `Final Challenge: Build the sentence:`,
    prompt: w5[fromLang],
    promptLang: fromLang,
    targetLang: toLang,
    correctAnswer: w5[toLang],
    bubbles: w5Bubbles,
    expectedTokens: w5Tokens,
    card: w5
  });

  return {
    course,
    unit,
    node,
    xpReward: node.xp || 15,
    exercises
  };
}
