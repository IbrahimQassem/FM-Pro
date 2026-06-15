import 'app_remote_config.dart';

abstract class RemoteConfigRepository {
  Future<AppRemoteConfig> fetchRemoteConfig();
}
