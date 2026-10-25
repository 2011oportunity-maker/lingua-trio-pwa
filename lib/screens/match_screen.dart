import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/word_triplet.dart';
import '../services/storage_service.dart';
import '../services/tts_service.dart';
import '../data/starter_pack.dart';

class MatchScreen extends StatefulWidget {
  const MatchScreen({Key? key}) : super(key: key);

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchCardItem {
  final String id;
  final String text;
  final String cardId;
  final String langCode;
  bool isMatched;
  bool isSelected;

  _MatchCardItem({
    required this.id,
    required this.text,
    required this.cardId,
    required this.langCode,
    this.isMatched = false,
    this.isSelected = false,
  });
}

class _MatchScreenState extends State<MatchScreen> {
  final StorageService _storage = StorageService();
  final TtsService _tts = TtsService();

  String _selectedLevel = 'All';
  List<_MatchCardItem> _items = [];
  _MatchCardItem? _firstSelected;
  int _matchedCount = 0;
  bool _isRoundComplete = false;

  @override
  void initState() {
    super.initState();
    _selectedLevel = _storage.selectedLevel;
    _startNewRound();
  }

  void _startNewRound() {
    var all = _storage.cards;
    if (_selectedLevel != 'All') {
      all = all.where((c) => c.level == _selectedLevel).toList();
    }
    if (all.length < 5) all = _storage.cards;

    final roundSet = (List<WordTriplet>.from(all)..shuffle()).take(5).toList();

    final fromLang = _storage.fromLang;
    final toLang = _storage.toLang;

    final List<_MatchCardItem> items = [];
    for (int i = 0; i < roundSet.length; i++) {
      final card = roundSet[i];
      items.add(_MatchCardItem(
        id: 'from-$i',
        text: card.getWord(fromLang),
        cardId: card.id,
        langCode: fromLang,
      ));
      items.add(_MatchCardItem(
        id: 'to-$i',
        text: card.getWord(toLang),
        cardId: card.id,
        langCode: toLang,
      ));
    }

    items.shuffle();

    setState(() {
      _items = items;
      _firstSelected = null;
      _matchedCount = 0;
      _isRoundComplete = false;
    });
  }

  void _onCardTap(_MatchCardItem item) {
    if (item.isMatched || item == _firstSelected) return;
    HapticFeedback.lightImpact();

    if (_firstSelected == null) {
      // First selection
      setState(() {
        item.isSelected = true;
        _firstSelected = item;
      });
    } else {
      // Second selection
      final first = _firstSelected!;
      if (first.cardId == item.cardId) {
        // MATCH!
        HapticFeedback.mediumImpact();
        _tts.speak(item.text, item.langCode);

        setState(() {
          first.isMatched = true;
          first.isSelected = false;
          item.isMatched = true;
          item.isSelected = false;
          _firstSelected = null;
          _matchedCount++;

          if (_matchedCount >= 5) {
            _isRoundComplete = true;
            _storage.addXp(15);
            _storage.recordDailyActivity();
          }
        });
      } else {
        // MISMATCH
        HapticFeedback.heavyImpact();
        setState(() {
          item.isSelected = true;
        });

        Future.delayed(const Duration(milliseconds: 400), () {
          if (!mounted) return;
          setState(() {
            first.isSelected = false;
            item.isSelected = false;
            _firstSelected = null;
          });
        });
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Level Selector Row
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
                        _startNewRound();
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
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Speed Match Pairs', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                        Text('Matched: $_matchedCount/5', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                      ],
                    ),
                    const SizedBox(height: 12),

              // Round Complete Celebration
              if (_isRoundComplete) ...[
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🎉', style: TextStyle(fontSize: 54)),
                        const SizedBox(height: 12),
                        const Text('All Pairs Matched!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        const Text('+15 XP Earned', style: TextStyle(fontSize: 16, color: Colors.orange, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          onPressed: _startNewRound,
                          child: const Text('Play Next Round ➔', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                // Cards Grid
                Expanded(
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 2.2,
                    ),
                    itemCount: _items.length,
                    itemBuilder: (context, idx) {
                      final item = _items[idx];

                      return InkWell(
                        onTap: () => _onCardTap(item),
                        borderRadius: BorderRadius.circular(16),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: item.isMatched
                                ? Colors.green.withOpacity(0.12)
                                : item.isSelected
                                    ? Theme.of(context).colorScheme.primaryContainer
                                    : Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: item.isMatched
                                  ? Colors.green.withOpacity(0.6)
                                  : item.isSelected
                                      ? Theme.of(context).colorScheme.primary
                                      : Theme.of(context).dividerColor.withOpacity(0.2),
                              width: item.isSelected ? 2 : 1,
                            ),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4, offset: const Offset(0, 2)),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              item.text,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: item.isMatched
                                    ? Colors.green
                                    : item.isSelected
                                        ? Theme.of(context).colorScheme.primary
                                        : null,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
          ],
        ),
      ),
    );
  }
}
