import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:just_audio/just_audio.dart';
import 'package:hudhud_fm/features/player/data/datasources/just_audio_player_data_source.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('a runtime decoder/network error reaches the domain error stream',
      () async {
    final player = _Player();
    final source = JustAudioPlayerDataSource(player: player);
    final errors = <Object>[];
    final phases = <Object>[];
    final subscription =
        source.phaseChanges.listen(phases.add, onError: errors.add);
    final error = PlayerException(2002, 'Synthetic offline failure', null);
    player.event =
        PlaybackEvent(processingState: ProcessingState.idle, errorCode: 2002);
    player.states.add(PlayerState(false, ProcessingState.idle));
    player.errors.add(error);
    await pumpEventQueue();
    expect(errors, [same(error)]);
    expect(phases, isEmpty,
        reason: 'An error must not masquerade as a remote stop');
    await subscription.cancel();
    await source.dispose();
    expect(player.errors.hasListener, isFalse);
    expect(player.states.hasListener, isFalse);
    expect(player.disposed, isTrue);
    await player.close();
  });

  test('a rejected play future is handled and reported without escaping',
      () async {
    final player = _Player()..playFailure = StateError('Synthetic failure');
    final source = JustAudioPlayerDataSource(player: player);
    final errors = <Object>[];
    final subscription =
        source.phaseChanges.listen((_) {}, onError: errors.add);
    await source.play();
    await pumpEventQueue();
    expect(errors, [same(player.playFailure)]);
    await subscription.cancel();
    await source.dispose();
    await player.close();
  });
}

class _Player implements AudioPlayer {
  final errors = StreamController<PlayerException>.broadcast();
  final states = StreamController<PlayerState>.broadcast();
  bool disposed = false;
  Object? playFailure;
  PlaybackEvent event = PlaybackEvent();
  @override
  PlaybackEvent get playbackEvent => event;
  @override
  Stream<PlayerException> get errorStream => errors.stream;
  @override
  Stream<PlayerState> get playerStateStream => states.stream;
  @override
  Future<void> play() async {
    if (playFailure != null) throw playFailure!;
  }

  @override
  Future<void> dispose() async {
    disposed = true;
  }

  Future<void> close() async {
    await errors.close();
    await states.close();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
