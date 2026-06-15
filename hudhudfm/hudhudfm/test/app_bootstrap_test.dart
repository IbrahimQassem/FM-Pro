import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/app/app_bootstrap.dart';
import 'package:hudhudfm/src/features/auth/domain/auth_session.dart';
import 'package:hudhudfm/src/features/auth/domain/auth_session_repository.dart';
import 'package:hudhudfm/src/features/bootstrap/domain/app_remote_config.dart';
import 'package:hudhudfm/src/features/bootstrap/domain/remote_config_repository.dart';
import 'package:hudhudfm/src/features/radio/domain/radio_info.dart';
import 'package:hudhudfm/src/features/radio/domain/radio_repository.dart';
import 'package:hudhudfm/src/features/version/domain/app_version.dart';
import 'package:hudhudfm/src/features/version/domain/app_version_repository.dart';

void main() {
  test(
    'loads remote config and version before auth and active radios',
    () async {
      final calls = <String>[];
      final bootstrap = AppBootstrap(
        remoteConfigRepository: _RecordingRemoteConfigRepository(calls),
        appVersionRepository: _RecordingAppVersionRepository(calls),
        authSessionRepository: _RecordingAuthSessionRepository(calls),
        radioRepository: _RecordingRadioRepository(calls),
        dataSourceLabel: 'test',
      );

      final data = await bootstrap.load();

      expect(calls, ['remote-config', 'app-version', 'auth-session', 'radios']);
      expect(data.remoteConfig.requiredVersion, 7);
      expect(data.currentVersion.buildNumber, 6);
      expect(data.isForceUpdateRequired, isTrue);
      expect(data.authSession.userId, 'test-anonymous');
      expect(data.radios.single.radioId, 'radio-1');
      expect(data.dataSourceLabel, 'test');
    },
  );
}

class _RecordingRemoteConfigRepository implements RemoteConfigRepository {
  _RecordingRemoteConfigRepository(this.calls);

  final List<String> calls;

  @override
  Future<AppRemoteConfig> fetchRemoteConfig() async {
    calls.add('remote-config');
    return const AppRemoteConfig(
      requiredVersion: 7,
      isTrialMode: false,
      isAdMobEnabled: false,
      adminMobile: '',
      developerReference: '',
      termsReference: '',
      googleAuthEnabled: true,
      emailAuthEnabled: true,
      facebookAuthEnabled: true,
      phoneAuthEnabled: true,
    );
  }
}

class _RecordingAppVersionRepository implements AppVersionRepository {
  _RecordingAppVersionRepository(this.calls);

  final List<String> calls;

  @override
  Future<AppVersion> currentVersion() async {
    calls.add('app-version');
    return const AppVersion(versionName: '1.0.0', buildNumber: 6);
  }
}

class _RecordingAuthSessionRepository implements AuthSessionRepository {
  _RecordingAuthSessionRepository(this.calls);

  final List<String> calls;

  @override
  Future<AuthSession> ensureAnonymousSession() async {
    calls.add('auth-session');
    return const AuthSession(userId: 'test-anonymous', isAnonymous: true);
  }

  @override
  Future<AuthSession?> currentSession() async {
    return const AuthSession(userId: 'test-anonymous', isAnonymous: true);
  }

  @override
  Future<AuthSession> signInWithEmail({
    required String email,
    required String password,
  }) async {
    calls.add('sign-in-email');
    return AuthSession(userId: email, email: email, isAnonymous: false);
  }

  @override
  Future<AuthSession> registerWithEmail({
    required String email,
    required String password,
  }) async {
    calls.add('register-email');
    return AuthSession(userId: email, email: email, isAnonymous: false);
  }

  @override
  Future<void> signOut() async {
    calls.add('sign-out');
  }

  @override
  Future<void> deleteCurrentAccount() async {
    calls.add('delete-account');
  }
}

class _RecordingRadioRepository implements RadioRepository {
  _RecordingRadioRepository(this.calls);

  final List<String> calls;

  @override
  Future<List<RadioInfo>> fetchActiveRadios() async {
    calls.add('radios');
    return const [
      RadioInfo(
        id: 'radio-1',
        radioId: 'radio-1',
        name: 'إذاعة',
        description: 'وصف',
        streamUrl: 'https://example.com/live.mp3',
        logoUrl: '',
        city: 'صنعاء',
        channelFrequency: 'FM',
        priority: 1,
        disabled: false,
      ),
    ];
  }
}
