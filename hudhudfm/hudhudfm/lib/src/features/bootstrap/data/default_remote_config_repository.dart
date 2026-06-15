import '../domain/app_remote_config.dart';
import '../domain/remote_config_repository.dart';

class DefaultRemoteConfigRepository implements RemoteConfigRepository {
  @override
  Future<AppRemoteConfig> fetchRemoteConfig() async {
    return AppRemoteConfig.defaults();
  }
}
