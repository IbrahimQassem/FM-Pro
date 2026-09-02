import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/account/data/repositories/firebase_account_repository.dart';
import '../features/account/domain/repositories/account_repository.dart';
import '../features/account/presentation/controllers/account_controller.dart';
import '../features/account/presentation/controllers/account_state.dart';
import '../features/comments/data/datasources/comments_firestore_data_source.dart';
import '../features/comments/data/repositories/firebase_comments_repository.dart';
import '../features/comments/domain/repositories/comments_repository.dart';
import '../features/comments/presentation/controllers/comments_controller.dart';
import '../features/comments/presentation/controllers/comments_state.dart';
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
import '../features/notifications/data/repositories/firebase_notifications_repository.dart';
import '../features/notifications/domain/repositories/notifications_repository.dart';
import '../features/notifications/presentation/controllers/notifications_controller.dart';
import '../features/notifications/presentation/controllers/notifications_state.dart';
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

final accountRepositoryProvider = Provider<AccountRepository>((ref) {
  return FirebaseAccountRepository(
    FirebaseAuth.instance,
    FirebaseFirestore.instance,
    FirebaseFunctions.instance,
  );
});

final accountControllerProvider =
    StateNotifierProvider<AccountController, AccountState>((ref) {
      return AccountController(ref.watch(accountRepositoryProvider));
    });

final commentsDataSourceProvider = Provider<CommentsFirestoreDataSource>((ref) {
  return CommentsFirestoreDataSource(
    FirebaseFirestore.instance,
    FirebaseAuth.instance,
  );
});

final commentsRepositoryProvider = Provider<CommentsRepository>((ref) {
  return FirebaseCommentsRepository(ref.watch(commentsDataSourceProvider));
});

final commentsControllerProvider = StateNotifierProvider.autoDispose
    .family<CommentsController, CommentsState, String>((ref, episodeId) {
      return CommentsController(
        episodeId,
        ref.watch(commentsRepositoryProvider),
      );
    });

final notificationsRepositoryProvider = Provider<NotificationsRepository>((
  ref,
) {
  return FirebaseNotificationsRepository(FirebaseMessaging.instance);
});

final notificationsControllerProvider =
    StateNotifierProvider<NotificationsController, NotificationsState>((ref) {
      return NotificationsController(
        ref.watch(notificationsRepositoryProvider),
      );
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
