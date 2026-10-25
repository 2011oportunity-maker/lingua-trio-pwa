import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/word_triplet.dart';
import '../services/storage_service.dart';
import '../services/tts_service.dart';
import '../data/starter_pack.dart';
import '../widgets/diacritic_bar.dart';

class TreeScreen extends StatefulWidget {
  const TreeScreen({Key? key}) : super(key: key);

  @override
  State<TreeScreen> createState() => _TreeScreenState();
}

class _TreeScreenState extends State<TreeScreen> {
  final StorageService _storage = StorageService();

  void _openCourseSelector() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select Language Course', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 16),
                _buildCourseItem('ru-ro', '🇷🇺 ➔ 🇷🇴', 'Румынский с русского', 'Учите румынский язык на русском'),
                const SizedBox(height: 8),
                _buildCourseItem('ru-en', '🇷🇺 ➔ 🇬🇧', 'Английский с русского', 'Учите английский язык на русском'),
                const SizedBox(height: 8),
                _buildCourseItem('en-ro', '🇬🇧 ➔ 🇷🇴', 'Romanian from English', 'Learn Romanian starting from English'),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCourseItem(String id, String badge, String title, String subtitle) {
    final isSelected = _storage.activeCourse == id;

    return ListTile(
      tileColor: isSelected ? Theme.of(context).colorScheme.primaryContainer.withOpacity(0.5) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor.withOpacity(0.1),
        ),
      ),
      leading: Text(badge, style: const TextStyle(fontSize: 24)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      trailing: isSelected ? const Icon(Icons.check_circle_rounded, color: Colors.green) : null,
      onTap: () {
        HapticFeedback.selectionClick();
        _storage.setActiveCourse(id);
        Navigator.pop(context);
        setState(() {});
      },
    );
  }

  void _startLesson(String unitCategory, String nodeTitle) {
    HapticFeedback.lightImpact();
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => InteractiveLessonView(category: unitCategory, nodeTitle: nodeTitle),
    )).then((_) => setState(() {}));
  }

  String _getCategoryLevel(String cat) {
    try {
      final match = _storage.cards.firstWhere((c) => c.category == cat);
      return match.level;
    } catch (_) {
      try {
        final match = kStarterPack.firstWhere((c) => c.category == cat);
        return match.level;
      } catch (_) {
        return 'A1';
      }
    }
  }

  Color _getLevelColor(String level) {
    switch (level) {
      case 'A1':
        return Colors.teal;
      case 'A2':
        return Colors.blue;
      case 'B1':
        return Colors.amber.shade800;
      case 'B2':
        return Colors.deepOrange;
      case 'C1':
        return Colors.purple;
      default:
        return Colors.indigo;
    }
  }

  List<String> get _displayedCategories {
    final cats = kCategories.where((c) => c != 'All').toList();
    if (_storage.selectedLevel == 'All') return cats;
    return cats.where((c) => _getCategoryLevel(c) == _storage.selectedLevel).toList();
  }

  @override
  Widget build(BuildContext context) {
    final activeCourse = _storage.activeCourse;
    final flags = activeCourse == 'ru-ro'
        ? '🇷🇺 ➔ 🇷🇴'
        : activeCourse == 'ru-en'
            ? '🇷🇺 ➔ 🇬🇧'
            : '🇬🇧 ➔ 🇷🇴';

    final categories = _displayedCategories;

    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          onTap: _openCourseSelector,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(flags, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                const Icon(Icons.arrow_drop_down_rounded),
              ],
            ),
          ),
        ),
        actions: [
          // Streak
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Chip(
              avatar: const Text('🔥'),
              label: Text('${_storage.currentStreak}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          // XP
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Chip(
              avatar: const Text('⚡'),
              label: Text('${_storage.totalXp}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          // Hearts (Infinite)
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Chip(
              avatar: const Text('❤️'),
              label: Text(_storage.infiniteHearts ? '∞' : '${_storage.hearts}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Level selector chips row
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: kLevels.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final lvl = kLevels[idx];
                final isSelected = _storage.selectedLevel == lvl;
                final count = lvl == 'All'
                    ? _storage.cards.length
                    : _storage.cards.where((c) => c.level == lvl).length;

                return ChoiceChip(
                  label: Text('$lvl ($count)'),
                  selected: isSelected,
                  onSelected: (val) {
                    HapticFeedback.selectionClick();
                    setState(() {
                      _storage.setSelectedLevel(lvl);
                    });
                  },
                  selectedColor: _getLevelColor(lvl),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : null,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 12,
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: categories.isEmpty
                ? const Center(child: Text('No units available for this level.'))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: categories.length,
                    itemBuilder: (context, idx) {
                      final cat = categories[idx];
                      return _buildUnitSection(cat, idx);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildUnitSection(String category, int unitIndex) {
    final lvl = _getCategoryLevel(category);
    // 3 nodes per unit
    final nodes = [
      {'title': 'Basics', 'icon': '🌱'},
      {'title': 'Practice', 'icon': '⚡'},
      {'title': 'Crown Test', 'icon': '👑'},
    ];

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      child: Column(
        children: [
          // Unit Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primary,
                  Theme.of(context).colorScheme.secondary,
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getLevelColor(lvl),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              lvl,
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'UNIT ${unitIndex + 1}',
                            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        category,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.menu_book_rounded, color: Colors.white),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Stepping Stones
          Column(
            children: nodes.asMap().entries.map((entry) {
              final nIdx = entry.key;
              final node = entry.value;
              final nodeId = 'u$unitIndex-n$nIdx';
              final isCompleted = _storage.completedNodes.contains(nodeId);

              // Offsets for serpentine path
              final double dx = (nIdx == 1) ? 36.0 : (nIdx == 2) ? -36.0 : 0.0;

              return Transform.translate(
                offset: Offset(dx, 0),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    children: [
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          shape: const CircleBorder(),
                          padding: const EdgeInsets.all(22),
                          elevation: 6,
                          backgroundColor: isCompleted ? Colors.amber : Theme.of(context).colorScheme.surface,
                          foregroundColor: isCompleted ? Colors.black : null,
                        ),
                        onPressed: () => _startLesson(category, node['title']!),
                        child: Text(
                          isCompleted ? '👑' : node['icon']!,
                          style: const TextStyle(fontSize: 26),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        node['title']!,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

// Interactive Lesson Viewer
class InteractiveLessonView extends StatefulWidget {
  final String category;
  final String nodeTitle;

  const InteractiveLessonView({Key? key, required this.category, required this.nodeTitle}) : super(key: key);

  @override
  State<InteractiveLessonView> createState() => _InteractiveLessonViewState();
}

class _InteractiveLessonViewState extends State<InteractiveLessonView> {
  final StorageService _storage = StorageService();
  final TtsService _tts = TtsService();

  List<WordTriplet> _words = [];
  int _step = 0;
  final int _totalSteps = 5;

  // Question state
  String? _selectedOption;
  bool _isChecked = false;
  bool _isCorrect = false;

  @override
  void initState() {
    super.initState();
    final all = _storage.cards.where((c) => c.category == widget.category).toList();
    if (all.length < 4) {
      _words = List.from(_storage.cards)..shuffle();
    } else {
      _words = List.from(all)..shuffle();
    }
  }

  void _checkAnswer(String chosen, String expected) {
    HapticFeedback.lightImpact();
    final isRight = chosen.trim().toLowerCase() == expected.trim().toLowerCase();

    if (isRight) {
      HapticFeedback.mediumImpact();
      _tts.speak(expected, _storage.toLang);
    } else {
      HapticFeedback.heavyImpact();
    }

    setState(() {
      _selectedOption = chosen;
      _isChecked = true;
      _isCorrect = isRight;
    });
  }

  void _nextStep() {
    if (_step + 1 >= _totalSteps) {
      // Completed!
      final nodeId = '${widget.category}-${widget.nodeTitle}';
      _storage.completeNode(nodeId, 15);
      Navigator.pop(context);
    } else {
      setState(() {
        _step++;
        _selectedOption = null;
        _isChecked = false;
        _isCorrect = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fromLang = _storage.fromLang;
    final toLang = _storage.toLang;
    final card = _words[_step % _words.length];
    final expected = card.getWord(toLang);

    // Generate 4 options
    final distractors = _words.where((c) => c.id != card.id).map((c) => c.getWord(toLang)).toSet().toList();
    if (distractors.length < 3) {
      final extra = _storage.cards
          .where((c) => c.id != card.id)
          .map((c) => c.getWord(toLang))
          .where((w) => !distractors.contains(w) && w != expected);
      distractors.addAll(extra);
    }
    final finalDistractors = distractors.take(3).toList();
    final options = [expected, ...finalDistractors]..shuffle(Random(card.id.hashCode + _step));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.nodeTitle),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(6),
          child: LinearProgressIndicator(value: (_step + 1) / _totalSteps),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Select the correct translation:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              // Prompt
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, 2)),
                  ],
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.volume_up_rounded),
                      onPressed: () => _tts.speak(card.getWord(fromLang), fromLang),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        card.getWord(fromLang),
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Options
              ...options.map((opt) {
                final isSelected = _selectedOption == opt;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(18),
                      alignment: Alignment.centerLeft,
                      elevation: 0,
                      backgroundColor: isSelected
                          ? Theme.of(context).colorScheme.primaryContainer
                          : Theme.of(context).colorScheme.surface,
                      foregroundColor: isSelected ? Theme.of(context).colorScheme.primary : null,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                          color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor.withOpacity(0.2),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                    ),
                    onPressed: _isChecked ? null : () => _checkAnswer(opt, expected),
                    child: Text(opt, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                );
              }).toList(),

              const Spacer(),

              // Feedback if checked
              if (_isChecked) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _isCorrect ? Colors.green.withOpacity(0.15) : Colors.red.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Icon(_isCorrect ? Icons.check_circle : Icons.error, color: _isCorrect ? Colors.green : Colors.red),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _isCorrect ? 'Correct!' : 'Answer: $expected',
                          style: TextStyle(fontWeight: FontWeight.bold, color: _isCorrect ? Colors.green : Colors.red),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isCorrect ? Colors.green : Colors.orange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  ),
                  onPressed: _nextStep,
                  child: Text(_step + 1 >= _totalSteps ? 'COMPLETE LESSON ➔' : 'CONTINUE ➔',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
