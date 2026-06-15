import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../radio/domain/radio_info.dart';
import '../domain/playback_engine.dart';

enum PlaybackStatus { idle, loading, playing, paused, failed }

class PlayerController extends ChangeNotifier {
  PlayerController({PlaybackEngine? playbackEngine})
    : _playbackEngine = playbackEngine ?? NoopPlaybackEngine();

  final PlaybackEngine _playbackEngine;

  PlaybackStatus _status = PlaybackStatus.idle;
  RadioInfo? _currentRadio;
  String? _errorMessage;

  PlaybackStatus get status => _status;
  RadioInfo? get currentRadio => _currentRadio;
  String? get errorMessage => _errorMessage;

  bool get isPlaying => _status == PlaybackStatus.playing;

  Future<void> play(RadioInfo radio) async {
    if (!radio.canPlay) {
      _status = PlaybackStatus.failed;
      _errorMessage = 'لا يتوفر رابط بث صالح لهذه الإذاعة';
      notifyListeners();
      return;
    }

    _currentRadio = radio;
    _status = PlaybackStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      await _playbackEngine.playUrl(
        radio.streamUrl,
        title: radio.name,
        artworkUrl: radio.logoUrl,
      );
      _status = PlaybackStatus.playing;
      notifyListeners();
    } on Object {
      _status = PlaybackStatus.failed;
      _errorMessage = 'تعذر تشغيل البث';
      notifyListeners();
    }
  }

  Future<void> pause() async {
    if (_currentRadio == null) {
      return;
    }

    await _playbackEngine.pause();
    _status = PlaybackStatus.paused;
    notifyListeners();
  }

  Future<void> resume() async {
    if (_currentRadio == null) {
      return;
    }

    await _playbackEngine.resume();
    _status = PlaybackStatus.playing;
    notifyListeners();
  }

  Future<void> stop() async {
    await _playbackEngine.stop();
    _status = PlaybackStatus.idle;
    _currentRadio = null;
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    unawaited(_playbackEngine.dispose());
    super.dispose();
  }
}
