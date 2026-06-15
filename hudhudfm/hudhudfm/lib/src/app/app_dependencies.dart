import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:firebase_storage/firebase_storage.dart';

import '../core/config/app_environment.dart';
import '../core/firebase/firebase_app_initializer.dart';
import '../features/account/data/firestore_user_profile_repository.dart';
import '../features/auth/data/firebase_auth_session_repository.dart';
import '../features/admin/data/firestore_admin_role_repository.dart';
import '../features/admin/data/firestore_admin_content_repository.dart';
import '../features/admin/data/firebase_admin_media_repository.dart';
import '../features/bootstrap/data/firebase_remote_config_repository.dart';
import '../features/episodes/data/firestore_episode_repository.dart';
import '../features/player/application/player_controller.dart';
import '../features/player/data/just_audio_playback_engine.dart';
import '../features/programs/data/firestore_program_repository.dart';
import '../features/radio/data/firestore_radio_repository.dart';
import '../features/version/data/package_info_app_version_repository.dart';
import 'app_bootstrap.dart';

class AppDependencies {
  const AppDependencies({
    required this.bootstrap,
    required this.playerController,
  });

  final AppBootstrap bootstrap;
  final PlayerController playerController;

  static Future<AppDependencies> create({
    FirebaseAppInitializer? firebaseInitializer,
    AppEnvironment? environment,
  }) async {
    final appEnvironment = environment ?? AppEnvironment.fromDartDefines();
    final isFirebaseReady =
        await (firebaseInitializer ?? FirebaseAppInitializer()).initialize();

    if (!isFirebaseReady) {
      return AppDependencies(
        bootstrap: AppBootstrap(),
        playerController: PlayerController(
          playbackEngine: JustAudioPlaybackEngine(),
        ),
      );
    }

    return AppDependencies(
      bootstrap: AppBootstrap(
        radioRepository: FirestoreRadioRepository(
          firestore: FirebaseFirestore.instance,
          baseDocument: appEnvironment.firebaseBaseDocument,
        ),
        programRepository: FirestoreProgramRepository(
          firestore: FirebaseFirestore.instance,
          baseDocument: appEnvironment.firebaseBaseDocument,
        ),
        episodeRepository: FirestoreEpisodeRepository(
          firestore: FirebaseFirestore.instance,
          baseDocument: appEnvironment.firebaseBaseDocument,
        ),
        remoteConfigRepository: FirebaseRemoteConfigRepository(
          remoteConfig: FirebaseRemoteConfig.instance,
        ),
        appVersionRepository: PackageInfoAppVersionRepository(),
        authSessionRepository: FirebaseAuthSessionRepository(
          firebaseAuth: FirebaseAuth.instance,
        ),
        userProfileRepository: FirestoreUserProfileRepository(
          firestore: FirebaseFirestore.instance,
          baseDocument: appEnvironment.firebaseBaseDocument,
        ),
        adminRoleRepository: FirestoreAdminRoleRepository(
          firestore: FirebaseFirestore.instance,
          baseDocument: appEnvironment.firebaseBaseDocument,
        ),
        adminContentRepository: FirestoreAdminContentRepository(
          firestore: FirebaseFirestore.instance,
          baseDocument: appEnvironment.firebaseBaseDocument,
        ),
        adminMediaRepository: FirebaseAdminMediaRepository(
          storage: FirebaseStorage.instance,
          baseDocument: appEnvironment.firebaseBaseDocument,
        ),
        dataSourceLabel: appEnvironment.dataSourceLabel,
      ),
      playerController: PlayerController(
        playbackEngine: JustAudioPlaybackEngine(),
      ),
    );
  }
}
