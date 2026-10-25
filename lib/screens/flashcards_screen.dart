import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/word_triplet.dart';
import '../services/storage_service.dart';
import '../services/tts_service.dart';
import '../data/starter_pack.dart';

class FlashcardsScreen extends StatefulWidget {
  const FlashcardsScreen({Key? key}) : super(key: key);

  @override
  State<FlashcardsScreen> createState() => _FlashcardsScreenState();
}

class _FlashcardsScreenState extends State<FlashcardsScreen> with SingleTickerProviderStateMixin {
  final StorageService _storage = StorageService();
  final TtsService _tts = TtsService();

  late AnimationController _flipController;
  late Animation<double> _flipAnimation;

  String _selectedLevel = 'All';
  String _selectedCategory = 'All';
  List<WordTriplet> _deck = [];
  int _currentIndex = 0;
  bool _isFlipped = false;

  @override
  void initState() {
    super.initState();
    _selectedLevel = _storage.selectedLevel;
    _flipController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _flipAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _flipController, curve: Curves.easeOutCubic),
    );

    _loadDeck();
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

  void _loadDeck() {
    var all = _storage.cards;
    if (_selectedLevel != 'All') {
      all = all.where((c) => c.level == _selectedLevel).toList();
    }
    if (_selectedCategory != 'All') {
      all = all.where((c) => c.category == _selectedCategory).toList();
    }
    _deck = List.from(all);
    if (_deck.isEmpty) _deck = List.from(_storage.cards);
    _currentIndex = 0;
    _isFlipped = false;
    _flipController.reset();
  }

  void _toggleFlip() {
    HapticFeedback.lightImpact();
    if (_isFlipped) {
      _flipController.reverse();
    } else {
      _flipController.forward();
    }
    setState(() => _isFlipped = !_isFlipped);
  }

  void _rateCard(String rating) {
    if (_deck.isEmpty) return;
    HapticFeedback.mediumImpact();

    final card = _deck[_currentIndex];
    _storage.recordCardReview(card, rating);

    // Advance to next card
    if (_isFlipped) {
      _flipController.reverse();
      _isFlipped = false;
    }

    setState(() {
      _currentIndex = (_currentIndex + 1) % _deck.length;
    });
  }

  void _shuffle() {
    HapticFeedback.lightImpact();
    setState(() {
      _deck.shuffle();
      _currentIndex = 0;
      if (_isFlipped) {
        _flipController.reverse();
        _isFlipped = false;
      }
    });
  }

  @override
  void dispose() {
    _flipController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fromLang = _storage.fromLang;
    final toLang = _storage.toLang;
    final otherLang = ['en', 'ro', 'ru'].firstWhere((l) => l != fromLang && l != toLang);

    if (_deck.isEmpty) {
      return const Center(child: Text('No cards available in this category.'));
    }

    final card = _deck[_currentIndex];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Level filter chips
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                itemCount: kLevels.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, idx) {
                  final lvl = kLevels[idx];
                  final isSelected = _selectedLevel == lvl;
                  final count = lvl == 'All'
                      ? _storage.cards.length
                      : _storage.cards.where((c) => c.level == lvl).length;
                  return ChoiceChip(
                    label: Text('$lvl ($count)'),
                    selected: isSelected,
                    onSelected: (val) {
                      HapticFeedback.selectionClick();
                      setState(() {
                        _selectedLevel = lvl;
                        _storage.setSelectedLevel(lvl);
                        _loadDeck();
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

            // Category filter chips
            SizedBox(
              height: 48,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                itemCount: kCategories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, idx) {
                  final cat = kCategories[idx];
                  final isSelected = _selectedCategory == cat;
                  final count = cat == 'All' ? _storage.cards.length : _storage.cards.where((c) => c.category == cat).length;

                  return ChoiceChip(
                    label: Text('$cat ($count)'),
                    selected: isSelected,
                    onSelected: (val) {
                      HapticFeedback.selectionClick();
                      setState(() {
                        _selectedCategory = cat;
                        _loadDeck();
                      });
                    },
                    selectedColor: Theme.of(context).colorScheme.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : null,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                  );
                },
              ),
            ),

            // Top Status row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Card ${_currentIndex + 1} of ${_deck.length}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.shuffle_rounded, size: 20),
                        tooltip: 'Shuffle',
                        onPressed: _shuffle,
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: card.mastery == 'mastered'
                              ? Colors.green.withOpacity(0.2)
                              : card.mastery == 'learning'
                                  ? Colors.orange.withOpacity(0.2)
                                  : Colors.blueGrey.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          card.mastery.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: card.mastery == 'mastered'
                                ? Colors.green
                                : card.mastery == 'learning'
                                    ? Colors.orange
                                    : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // 3D Card Stage
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  child: GestureDetector(
                    onTap: _toggleFlip,
                    child: AnimatedBuilder(
                      animation: _flipAnimation,
                      builder: (context, child) {
                        final angle = _flipAnimation.value * pi;
                        final isUnder = angle > pi / 2;

                        return Transform(
                          transform: Matrix4.identity()
                            ..setEntry(3, 2, 0.001) // 3D Perspective!
                            ..rotateY(angle),
                          alignment: Alignment.center,
                          child: isUnder
                              ? Transform(
                                  transform: Matrix4.identity()..rotateY(pi),
                                  alignment: Alignment.center,
                                  child: _buildCardBack(card, fromLang, toLang, otherLang),
                                )
                              : _buildCardFront(card, fromLang),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),

            // Spaced-Repetition Rating Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  _buildRateBtn('Again', '< 1d', Colors.red, 'again'),
                  const SizedBox(width: 8),
                  _buildRateBtn('Hard', '2d', Colors.orange, 'hard'),
                  const SizedBox(width: 8),
                  _buildRateBtn('Good', '4d', Colors.green, 'good'),
                  const SizedBox(width: 8),
                  _buildRateBtn('Easy', '7d', Colors.blue, 'easy'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardFront(WordTriplet card, String fromLang) {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxHeight: 400),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getLevelColor(card.level),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      card.level,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Chip(
                    label: Text(card.category, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.4),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.volume_up_rounded),
                onPressed: () => _tts.speak(card.getWord(fromLang), fromLang),
              ),
            ],
          ),
          Column(
            children: [
              Text(
                card.getWord(fromLang),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900),
              ),
              if (card.notes.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  card.notes,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: Colors.grey, fontStyle: FontStyle.italic),
                ),
              ],
            ],
          ),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.touch_app_rounded, size: 16, color: Colors.grey),
              SizedBox(width: 4),
              Text('Tap to flip card', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCardBack(WordTriplet card, String fromLang, String toLang, String otherLang) {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxHeight: 400),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.4), width: 2),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.15),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: _getLevelColor(card.level),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      card.level,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    card.getWord(fromLang),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                ],
              ),
              const Text('Answers', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            ],
          ),
          Column(
            children: [
              // Target Lang Word
              _buildAnswerItem(toLang.toUpperCase(), card.getWord(toLang), toLang, isMain: true),
              const SizedBox(height: 12),
              // Third Lang Word
              _buildAnswerItem(otherLang.toUpperCase(), card.getWord(otherLang), otherLang, isMain: false),
            ],
          ),
          const Text('Select your recall rating below', style: TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildAnswerItem(String label, String word, String langCode, {bool isMain = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.4),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
              Text(
                word,
                style: TextStyle(
                  fontSize: isMain ? 22 : 16,
                  fontWeight: FontWeight.bold,
                  color: isMain ? Theme.of(context).colorScheme.primary : null,
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.volume_up_rounded, size: 20),
            onPressed: () => _tts.speak(word, langCode),
          ),
        ],
      ),
    );
  }

  Widget _buildRateBtn(String title, String sub, Color color, String rating) {
    return Expanded(
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: color.withOpacity(0.15),
          foregroundColor: color,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: color.withOpacity(0.4)),
          ),
        ),
        onPressed: () => _rateCard(rating),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            Text(sub, style: TextStyle(fontSize: 10, color: color.withOpacity(0.8))),
          ],
        ),
      ),
    );
  }
}
