import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/word_triplet.dart';
import '../data/starter_pack.dart';

class StorageService extends ChangeNotifier {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  static const String _kCardsKey = 'lingua_cards_v1';
  static const String _kStreakKey = 'lingua_streak_v1';
  static const String _kBestStreakKey = 'lingua_best_streak_v1';
  static const String _kLastDateKey = 'lingua_last_date_v1';
  static const String _kXpKey = 'lingua_xp_v1';
  static const String _kCourseKey = 'lingua_active_course_v1';
  static const String _kLevelKey = 'lingua_selected_level_v1';
  static const String _kInfiniteHeartsKey = 'lingua_infinite_hearts_v1';
  static const String _kCompletedNodesKey = 'lingua_completed_nodes_v1';

  List<WordTriplet> _cards = [];
  int _currentStreak = 0;
  int _bestStreak = 0;
  int _totalXp = 0;
  String _activeCourse = 'ru-ro'; // 'ru-ro', 'ru-en', 'en-ro'
  String _selectedLevel = 'All'; // 'All', 'A1', 'A2', 'B1', 'B2', 'C1'
  bool _infiniteHearts = true; // Unlimited for personal use!
  int _hearts = 5;
  Set<String> _completedNodes = {};

  List<WordTriplet> get cards => _cards;
  int get currentStreak => _currentStreak;
  int get bestStreak => _bestStreak;
  int get totalXp => _totalXp;
  String get activeCourse => _activeCourse;
  String get selectedLevel => _selectedLevel;
  bool get infiniteHearts => _infiniteHearts;
  int get hearts => _hearts;
  Set<String> get completedNodes => _completedNodes;

  String get fromLang => _activeCourse.split('-')[0];
  String get toLang => _activeCourse.split('-')[1];

  List<WordTriplet> get filteredByLevelCards {
    if (_selectedLevel == 'All') return _cards;
    return _cards.where((c) => c.level == _selectedLevel).toList();
  }

  void setSelectedLevel(String level) async {
    _selectedLevel = level;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLevelKey, level);
    notifyListeners();
  }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    // 1. Load Cards
    final String? rawCards = prefs.getString(_kCardsKey);
    if (rawCards != null && rawCards.isNotEmpty) {
      try {
        final List<dynamic> decoded = jsonDecode(rawCards);
        _cards = decoded.map((e) => WordTriplet.fromJson(e as Map<String, dynamic>)).toList();

        // Merge any new starter cards and ensure level is updated
        final existingMap = {for (var c in _cards) c.id: c};
        for (final item in kStarterPack) {
          if (!existingMap.containsKey(item.id)) {
            _cards.add(item);
          } else {
            final existing = existingMap[item.id]!;
            if (existing.level != item.level || existing.category != item.category) {
              final idx = _cards.indexOf(existing);
              if (idx != -1) {
                _cards[idx] = WordTriplet(
                  id: existing.id,
                  category: item.category,
                  level: item.level,
                  en: item.en,
                  ro: item.ro,
                  ru: item.ru,
                  notes: existing.notes.isNotEmpty ? existing.notes : item.notes,
                  mastery: existing.mastery,
                  reviewCount: existing.reviewCount,
                  correctCount: existing.correctCount,
                  streak: existing.streak,
                  lastReviewed: existing.lastReviewed,
                  nextReviewDate: existing.nextReviewDate,
                  intervalDays: existing.intervalDays,
                  easeFactor: existing.easeFactor,
                );
              }
            }
          }
        }
      } catch (e) {
        debugPrint('Error decoding cards: $e');
        _cards = List.from(kStarterPack);
      }
    } else {
      _cards = List.from(kStarterPack);
      await saveCards();
    }

    // 2. Load Streak & Stats
    _currentStreak = prefs.getInt(_kStreakKey) ?? 0;
    _bestStreak = prefs.getInt(_kBestStreakKey) ?? 0;
    _totalXp = prefs.getInt(_kXpKey) ?? 0;
    _activeCourse = prefs.getString(_kCourseKey) ?? 'ru-ro';
    _selectedLevel = prefs.getString(_kLevelKey) ?? 'All';
    _infiniteHearts = prefs.getBool(_kInfiniteHeartsKey) ?? true;
    _completedNodes = (prefs.getStringList(_kCompletedNodesKey) ?? []).toSet();

    _updateStreakOnLaunch(prefs);
    notifyListeners();
  }

  void _updateStreakOnLaunch(SharedPreferences prefs) {
    final String? lastDateStr = prefs.getString(_kLastDateKey);
    final todayStr = _formatDate(DateTime.now());

    if (lastDateStr != null && lastDateStr != todayStr) {
      final lastDate = DateTime.tryParse(lastDateStr);
      if (lastDate != null) {
        final diffDays = DateTime.now().difference(lastDate).inDays;
        if (diffDays > 1) {
          _currentStreak = 0; // broken streak
          prefs.setInt(_kStreakKey, 0);
        }
      }
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  Future<void> saveCards() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = _cards.map((c) => c.toJson()).toList();
    await prefs.setString(_kCardsKey, jsonEncode(jsonList));
    notifyListeners();
  }

  void recordCardReview(WordTriplet card, String rating) {
    card.recordReview(rating);
    addXp(rating == 'easy' ? 4 : rating == 'good' ? 3 : 1);
    recordDailyActivity();
    saveCards();
  }

  void addXp(int amount) async {
    _totalXp += amount;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kXpKey, _totalXp);
    notifyListeners();
  }

  void recordDailyActivity() async {
    final prefs = await SharedPreferences.getInstance();
    final todayStr = _formatDate(DateTime.now());
    final lastDateStr = prefs.getString(_kLastDateKey);

    if (lastDateStr != todayStr) {
      if (lastDateStr != null) {
        final last = DateTime.tryParse(lastDateStr);
        if (last != null && DateTime.now().difference(last).inDays == 1) {
          _currentStreak++;
        } else {
          _currentStreak = 1;
        }
      } else {
        _currentStreak = 1;
      }

      if (_currentStreak > _bestStreak) {
        _bestStreak = _currentStreak;
        await prefs.setInt(_kBestStreakKey, _bestStreak);
      }

      await prefs.setString(_kLastDateKey, todayStr);
      await prefs.setInt(_kStreakKey, _currentStreak);
      notifyListeners();
    }
  }

  void setActiveCourse(String courseId) async {
    _activeCourse = courseId;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kCourseKey, courseId);
    notifyListeners();
  }

  void toggleInfiniteHearts() async {
    _infiniteHearts = !_infiniteHearts;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kInfiniteHeartsKey, _infiniteHearts);
    notifyListeners();
  }

  void completeNode(String nodeId, int earnedXp) async {
    _completedNodes.add(nodeId);
    addXp(earnedXp);
    recordDailyActivity();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_kCompletedNodesKey, _completedNodes.toList());
    notifyListeners();
  }

  void addCustomCard({
    required String en,
    required String ro,
    required String ru,
    required String category,
    String level = 'A1',
    String notes = '',
  }) {
    final newCard = WordTriplet(
      id: 'custom-${DateTime.now().millisecondsSinceEpoch}',
      category: category,
      level: level,
      en: en.trim(),
      ro: ro.trim(),
      ru: ru.trim(),
      notes: notes.trim(),
    );
    _cards.insert(0, newCard);
    saveCards();
  }

  void deleteCard(String id) {
    _cards.removeWhere((c) => c.id == id);
    saveCards();
  }

  void updateCard(WordTriplet updated) {
    final idx = _cards.indexWhere((c) => c.id == updated.id);
    if (idx != -1) {
      _cards[idx] = updated;
      saveCards();
    }
  }

  String exportJson() {
    return jsonEncode(_cards.map((c) => c.toJson()).toList());
  }

  bool importJson(String jsonStr) {
    try {
      final List<dynamic> decoded = jsonDecode(jsonStr);
      _cards = decoded.map((e) => WordTriplet.fromJson(e as Map<String, dynamic>)).toList();
      saveCards();
      return true;
    } catch (e) {
      debugPrint('Import error: $e');
      return false;
    }
  }
}
