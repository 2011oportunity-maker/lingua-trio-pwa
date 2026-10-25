import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  static final TtsService _instance = TtsService._internal();
  factory TtsService() => _instance;
  TtsService._internal();

  FlutterTts? _flutterTts;
  bool _isInitialized = false;
  double speechRate = 0.45; // friendly relaxed rate for learning

  Future<void> init() async {
    if (_isInitialized) return;
    try {
      _flutterTts = FlutterTts();
      await _flutterTts?.setSpeechRate(speechRate);
      await _flutterTts?.setVolume(1.0);
      await _flutterTts?.setPitch(1.0);
      _isInitialized = true;
    } catch (e) {
      debugPrint('TTS init error: $e');
    }
  }

  Future<void> speak(String text, String langCode) async {
    if (!_isInitialized) await init();
    try {
      await _flutterTts?.stop();

      String targetLocale = 'en-US';
      if (langCode.toLowerCase() == 'ro') {
        targetLocale = 'ro-RO';
      } else if (langCode.toLowerCase() == 'ru') {
        targetLocale = 'ru-RU';
      }

      await _flutterTts?.setLanguage(targetLocale);
      await _flutterTts?.speak(text);
    } catch (e) {
      debugPrint('TTS speak error: $e');
    }
  }

  Future<void> stop() async {
    try {
      await _flutterTts?.stop();
    } catch (_) {}
  }
}
