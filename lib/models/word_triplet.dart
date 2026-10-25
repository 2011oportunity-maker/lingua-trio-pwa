class WordTriplet {
  final String id;
  final String category;
  final String level; // 'A1', 'A2', 'B1', 'B2', 'C1'
  final String en;
  final String ro;
  final String ru;
  final String notes;

  String mastery; // 'new', 'learning', 'mastered'
  int reviewCount;
  int correctCount;
  int streak;
  DateTime? lastReviewed;
  DateTime? nextReviewDate;
  int intervalDays;
  double easeFactor;

  WordTriplet({
    required this.id,
    required this.category,
    this.level = 'A1',
    required this.en,
    required this.ro,
    required this.ru,
    this.notes = '',
    this.mastery = 'new',
    this.reviewCount = 0,
    this.correctCount = 0,
    this.streak = 0,
    this.lastReviewed,
    this.nextReviewDate,
    this.intervalDays = 1,
    this.easeFactor = 2.5,
  });

  String getWord(String langCode) {
    switch (langCode.toLowerCase()) {
      case 'ro':
        return ro;
      case 'ru':
        return ru;
      case 'en':
      default:
        return en;
    }
  }

  /// SM-2 Spaced Repetition calculation
  void recordReview(String rating) {
    reviewCount++;
    lastReviewed = DateTime.now();

    // Rating: 'again' (1), 'hard' (2), 'good' (3), 'easy' (4)
    if (rating == 'again') {
      streak = 0;
      intervalDays = 1;
      mastery = 'learning';
      easeFactor = (easeFactor - 0.2).clamp(1.3, 2.5);
    } else if (rating == 'hard') {
      streak = (streak > 0) ? streak : 1;
      intervalDays = (intervalDays * 1.2).round().clamp(1, 100);
      mastery = 'learning';
      easeFactor = (easeFactor - 0.15).clamp(1.3, 2.5);
    } else if (rating == 'good') {
      streak++;
      correctCount++;
      if (streak == 1) {
        intervalDays = 1;
      } else if (streak == 2) {
        intervalDays = 3;
      } else {
        intervalDays = (intervalDays * easeFactor).round();
      }
      mastery = (streak >= 3) ? 'mastered' : 'learning';
    } else if (rating == 'easy') {
      streak += 2;
      correctCount++;
      intervalDays = ((intervalDays == 1 ? 4 : intervalDays * easeFactor) * 1.3).round();
      easeFactor = (easeFactor + 0.15).clamp(1.3, 3.0);
      mastery = 'mastered';
    }

    nextReviewDate = DateTime.now().add(Duration(days: intervalDays));
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category': category,
      'level': level,
      'en': en,
      'ro': ro,
      'ru': ru,
      'notes': notes,
      'mastery': mastery,
      'reviewCount': reviewCount,
      'correctCount': correctCount,
      'streak': streak,
      'lastReviewed': lastReviewed?.toIso8601String(),
      'nextReviewDate': nextReviewDate?.toIso8601String(),
      'intervalDays': intervalDays,
      'easeFactor': easeFactor,
    };
  }

  factory WordTriplet.fromJson(Map<String, dynamic> json) {
    return WordTriplet(
      id: json['id'] as String,
      category: json['category'] as String? ?? 'General',
      level: json['level'] as String? ?? 'A1',
      en: json['en'] as String? ?? '',
      ro: json['ro'] as String? ?? '',
      ru: json['ru'] as String? ?? '',
      notes: json['notes'] as String? ?? '',
      mastery: json['mastery'] as String? ?? 'new',
      reviewCount: json['reviewCount'] as int? ?? 0,
      correctCount: json['correctCount'] as int? ?? 0,
      streak: json['streak'] as int? ?? 0,
      lastReviewed: json['lastReviewed'] != null ? DateTime.tryParse(json['lastReviewed']) : null,
      nextReviewDate: json['nextReviewDate'] != null ? DateTime.tryParse(json['nextReviewDate']) : null,
      intervalDays: json['intervalDays'] as int? ?? 1,
      easeFactor: (json['easeFactor'] as num?)?.toDouble() ?? 2.5,
    );
  }
}
