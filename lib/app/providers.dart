import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/home/data/datasources/home_firestore_data_source.dart';
import '../features/home/data/repositories/firebase_banners_repository.dart';
import '../features/home/data/repositories/firebase_locations_repository.dart';
import '../features/home/data/repositories/firebase_stations_repository.dart';
import '../features/home/data/repositories/firebase_user_repository.dart';
import '../features/home/domain/repositories/banners_repository.dart';
import '../features/home/domain/repositories/locations_repository.dart';
import '../features/home/domain/repositories/stations_repository.dart';
import '../features/home/domain/repositories/user_repository.dart';
import '../features/home/presentation/controllers/home_controller.dart';
import '../features/home/presentation/controllers/home_state.dart';
import '../features/player/data/datasources/audio_player_data_source.dart';
import '../features/player/data/datasources/just_audio_player_data_source.dart';
import '../features/player/data/repositories/default_audio_playback_repository.dart';
import '../features/player/domain/repositories/audio_playback_repository.dart';
import '../features/player/presentation/controllers/station_player_controller.dart';
import '../features/player/presentation/controllers/station_player_state.dart';
import '../features/station_content/data/datasources/station_content_firestore_data_source.dart';
import '../features/station_content/data/repositories/firebase_station_content_repository.dart';
import '../features/station_content/domain/repositories/station_content_repository.dart';
import '../features/station_content/presentation/controllers/station_content_controller.dart';
import '../features/station_content/presentation/controllers/station_content_state.dart';

final homeDataSourceProvider = Provider<HomeFirestoreDataSource>((ref) {
  return HomeFirestoreDataSource(
    FirebaseFirestore.instance,
    FirebaseAuth.instance,
  );
});

final stationsRepositoryProvider = Provider<StationsRepository>((ref) {
  return FirebaseStationsRepository(ref.watch(homeDataSourceProvider));
});

final bannersRepositoryProvider = Provider<BannersRepository>((ref) {
  return FirebaseBannersRepository(ref.watch(homeDataSourceProvider));
});

final locationsRepositoryProvider = Provider<LocationsRepository>((ref) {
  return FirebaseLocationsRepository(ref.watch(homeDataSourceProvider));
});

final userRepositoryProvider = Provider<UserRepository>((ref) {
  return FirebaseUserRepository(ref.watch(homeDataSourceProvider));
});

final homeControllerProvider =
    StateNotifierProvider.autoDispose<HomeController, HomeState>((ref) {
      return HomeController(
        ref.watch(stationsRepositoryProvider),
        ref.watch(bannersRepositoryProvider),
        ref.watch(locationsRepositoryProvider),
        ref.watch(userRepositoryProvider),
      );
    });

final stationContentDataSourceProvider =
    Provider<StationContentFirestoreDataSource>((ref) {
      return StationContentFirestoreDataSource(FirebaseFirestore.instance);
    });

final stationContentRepositoryProvider = Provider<StationContentRepository>((
  ref,
) {
  return FirebaseStationContentRepository(
    ref.watch(stationContentDataSourceProvider),
  );
});

final stationContentControllerProvider = StateNotifierProvider.autoDispose
    .family<StationContentController, StationContentState, String>((
      ref,
      stationId,
    ) {
      return StationContentController(
        stationId,
        ref.watch(stationContentRepositoryProvider),
      );
    });

final audioPlayerDataSourceProvider = Provider<AudioPlayerDataSource>((ref) {
  final dataSource = JustAudioPlayerDataSource();
  ref.onDispose(dataSource.dispose);
  return dataSource;
});

final audioPlaybackRepositoryProvider = Provider<AudioPlaybackRepository>((
  ref,
) {
  return DefaultAudioPlaybackRepository(
    ref.watch(audioPlayerDataSourceProvider),
  );
});

final stationPlayerControllerProvider =
    StateNotifierProvider<StationPlayerController, StationPlayerState>((ref) {
      return StationPlayerController(
        ref.watch(audioPlaybackRepositoryProvider),
      );
    });
