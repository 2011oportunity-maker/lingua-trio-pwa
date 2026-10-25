import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/word_triplet.dart';
import '../services/storage_service.dart';
import '../services/tts_service.dart';
import '../widgets/diacritic_bar.dart';

class TypingScreen extends StatefulWidget {
  const TypingScreen({Key? key}) : super(key: key);

  @override
  State<TypingScreen> createState() => _TypingScreenState();
}

class _TypingScreenState extends State<TypingScreen> {
  final StorageService _storage = StorageService();
  final TtsService _tts = TtsService();
  final TextEditingController _textController = TextEditingController();

  List<WordTriplet> _deck = [];
  int _currentIndex = 0;
  bool _isChecked = false;
  bool _isCorrect = false;

  @override
  void initState() {
    super.initState();
    _deck = List.from(_storage.cards)..shuffle();
  }

  void _checkAnswer() {
    if (_textController.text.trim().isEmpty) return;
    HapticFeedback.lightImpact();

    final card = _deck[_currentIndex];
    final targetLang = _storage.toLang;
    final expected = card.getWord(targetLang).trim().toLowerCase();
    final input = _textController.text.trim().toLowerCase();

    // Check exact or clean punctuation
    final cleanInput = input.replaceAll(RegExp(r'[\.,\?!]'), '');
    final cleanExpected = expected.replaceAll(RegExp(r'[\.,\?!]'), '');

    final correct = cleanInput == cleanExpected;
    if (correct) {
      HapticFeedback.mediumImpact();
      _storage.recordCardReview(card, 'good');
    } else {
      HapticFeedback.heavyImpact();
      _storage.recordCardReview(card, 'again');
    }

    setState(() {
      _isChecked = true;
      _isCorrect = correct;
    });
  }

  void _nextCard() {
    HapticFeedback.lightImpact();
    _textController.clear();
    setState(() {
      _isChecked = false;
      _isCorrect = false;
      _currentIndex = (_currentIndex + 1) % _deck.length;
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_deck.isEmpty) return const Center(child: Text('No words to practice.'));

    final card = _deck[_currentIndex];
    final fromLang = _storage.fromLang;
    final toLang = _storage.toLang;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Word ${_currentIndex + 1}/${_deck.length}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                  Chip(
                    label: Text(card.category, style: const TextStyle(fontSize: 10)),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Prompt Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          fromLang.toUpperCase(),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        IconButton(
                          icon: const Icon(Icons.volume_up_rounded),
                          onPressed: () => _tts.speak(card.getWord(fromLang), fromLang),
                        ),
                      ],
                    ),
                    Text(
                      card.getWord(fromLang),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    if (card.notes.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(card.notes, style: const TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic)),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Target Input
              TextField(
                controller: _textController,
                autofocus: true,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: 'Type in ${toLang.toUpperCase()}...',
                  filled: true,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.edit_rounded),
                ),
                onSubmitted: (_) {
                  if (!_isChecked) _checkAnswer();
                },
              ),

              const SizedBox(height: 12),

              // Romanian Diacritics Bar (if typing Romanian)
              if (toLang == 'ro') RomanianDiacriticBar(controller: _textController),

              const Spacer(),

              // Feedback Drawer if checked
              if (_isChecked) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _isCorrect ? Colors.green.withOpacity(0.15) : Colors.red.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _isCorrect ? Colors.green : Colors.red),
                  ),
                  child: Row(
                    children: [
                      Icon(_isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                          color: _isCorrect ? Colors.green : Colors.red, size: 36),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isCorrect ? 'Correct! Excellent!' : 'Correct translation:',
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: _isCorrect ? Colors.green : Colors.red,
                                  fontSize: 14),
                            ),
                            if (!_isCorrect)
                              Text(
                                card.getWord(toLang),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.volume_up_rounded),
                        onPressed: () => _tts.speak(card.getWord(toLang), toLang),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Action Button (Check or Continue)
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: _isChecked
                      ? (_isCorrect ? Colors.green : Colors.orange)
                      : Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                onPressed: _isChecked ? _nextCard : _checkAnswer,
                child: Text(
                  _isChecked ? 'CONTINUE ➔' : 'CHECK ANSWER',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
