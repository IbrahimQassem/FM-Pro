import 'package:firebase_remote_config/firebase_remote_config.dart';

import '../domain/app_remote_config.dart';
import '../domain/remote_config_repository.dart';

class FirebaseRemoteConfigRepository implements RemoteConfigRepository {
  FirebaseRemoteConfigRepository({required FirebaseRemoteConfig remoteConfig})
    : _remoteConfig = remoteConfig;

  static const legacyConfigKey = 'hudhudFmAppConfig';

  final FirebaseRemoteConfig _remoteConfig;

  @override
  Future<AppRemoteConfig> fetchRemoteConfig() async {
    try {
      await _remoteConfig.setDefaults({legacyConfigKey: '{}'});
      await _remoteConfig.fetchAndActivate();

      final json = _remoteConfig.getString(legacyConfigKey).trim();
      if (json.isEmpty) {
        return AppRemoteConfig.defaults();
      }

      return AppRemoteConfig.fromJson(json);
    } on Object {
      return AppRemoteConfig.defaults();
    }
  }
}
