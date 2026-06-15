import '../features/bootstrap/domain/app_remote_config.dart';
import '../features/account/data/in_memory_user_profile_repository.dart';
import '../features/account/domain/user_profile_repository.dart';
import '../features/auth/data/in_memory_auth_session_repository.dart';
import '../features/auth/domain/auth_session.dart';
import '../features/auth/domain/auth_session_repository.dart';
import '../features/admin/data/in_memory_admin_role_repository.dart';
import '../features/admin/data/in_memory_admin_content_repository.dart';
import '../features/admin/data/in_memory_admin_media_repository.dart';
import '../features/admin/domain/admin_content_repository.dart';
import '../features/admin/domain/admin_media_repository.dart';
import '../features/admin/domain/admin_role.dart';
import '../features/admin/domain/admin_role_repository.dart';
import '../features/bootstrap/data/default_remote_config_repository.dart';
import '../features/bootstrap/domain/remote_config_repository.dart';
import '../features/episodes/data/in_memory_episode_repository.dart';
import '../features/episodes/domain/episode_repository.dart';
import '../features/programs/data/in_memory_program_repository.dart';
import '../features/programs/domain/program_repository.dart';
import '../features/radio/data/in_memory_radio_repository.dart';
import '../features/radio/domain/radio_info.dart';
import '../features/radio/domain/radio_repository.dart';
import '../features/version/data/default_app_version_repository.dart';
import '../features/version/domain/app_version.dart';
import '../features/version/domain/app_version_repository.dart';

class AppBootstrap {
  AppBootstrap({
    RadioRepository? radioRepository,
    RemoteConfigRepository? remoteConfigRepository,
    AuthSessionRepository? authSessionRepository,
    AppVersionRepository? appVersionRepository,
    ProgramRepository? programRepository,
    EpisodeRepository? episodeRepository,
    UserProfileRepository? userProfileRepository,
    AdminRoleRepository? adminRoleRepository,
    AdminContentRepository? adminContentRepository,
    AdminMediaRepository? adminMediaRepository,
    this.dataSourceLabel = 'بيانات تجريبية',
  }) : _radioRepository = radioRepository ?? InMemoryRadioRepository(),
       _remoteConfigRepository =
           remoteConfigRepository ?? DefaultRemoteConfigRepository(),
       _authSessionRepository =
           authSessionRepository ?? InMemoryAuthSessionRepository(),
       _appVersionRepository =
           appVersionRepository ?? DefaultAppVersionRepository(),
       _programRepository = programRepository ?? InMemoryProgramRepository(),
       _episodeRepository = episodeRepository ?? InMemoryEpisodeRepository(),
       _userProfileRepository =
           userProfileRepository ?? InMemoryUserProfileRepository(),
       _adminRoleRepository =
           adminRoleRepository ?? InMemoryAdminRoleRepository(),
       _adminContentRepository =
           adminContentRepository ?? InMemoryAdminContentRepository(),
       _adminMediaRepository =
           adminMediaRepository ?? InMemoryAdminMediaRepository();

  final RadioRepository _radioRepository;
  final RemoteConfigRepository _remoteConfigRepository;
  final AuthSessionRepository _authSessionRepository;
  final AppVersionRepository _appVersionRepository;
  final ProgramRepository _programRepository;
  final EpisodeRepository _episodeRepository;
  final UserProfileRepository _userProfileRepository;
  final AdminRoleRepository _adminRoleRepository;
  final AdminContentRepository _adminContentRepository;
  final AdminMediaRepository _adminMediaRepository;
  final String dataSourceLabel;

  Future<AppBootstrapData> load() async {
    final remoteConfig = await _remoteConfigRepository.fetchRemoteConfig();
    final currentVersion = await _appVersionRepository.currentVersion();
    final authSession = await _authSessionRepository.ensureAnonymousSession();
    final adminRole = await _adminRoleRepository.fetchRole(authSession.userId);
    final radios = await _radioRepository.fetchActiveRadios();

    return AppBootstrapData(
      remoteConfig: remoteConfig,
      radios: radios,
      authSession: authSession,
      adminRole: adminRole,
      currentVersion: currentVersion,
      authSessionRepository: _authSessionRepository,
      userProfileRepository: _userProfileRepository,
      programRepository: _programRepository,
      episodeRepository: _episodeRepository,
      adminContentRepository: _adminContentRepository,
      adminMediaRepository: _adminMediaRepository,
      dataSourceLabel: dataSourceLabel,
    );
  }
}

class AppBootstrapData {
  const AppBootstrapData({
    required this.remoteConfig,
    required this.radios,
    required this.authSession,
    required this.adminRole,
    required this.currentVersion,
    required this.authSessionRepository,
    required this.userProfileRepository,
    required this.programRepository,
    required this.episodeRepository,
    required this.adminContentRepository,
    required this.adminMediaRepository,
    required this.dataSourceLabel,
  });

  final AppRemoteConfig remoteConfig;
  final List<RadioInfo> radios;
  final AuthSession authSession;
  final AdminRole adminRole;
  final AppVersion currentVersion;
  final AuthSessionRepository authSessionRepository;
  final UserProfileRepository userProfileRepository;
  final ProgramRepository programRepository;
  final EpisodeRepository episodeRepository;
  final AdminContentRepository adminContentRepository;
  final AdminMediaRepository adminMediaRepository;
  final String dataSourceLabel;

  bool get isForceUpdateRequired {
    return remoteConfig.requiredVersion > currentVersion.buildNumber;
  }
}
