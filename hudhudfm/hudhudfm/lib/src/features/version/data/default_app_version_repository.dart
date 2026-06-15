import '../domain/app_version.dart';
import '../domain/app_version_repository.dart';

class DefaultAppVersionRepository implements AppVersionRepository {
  @override
  Future<AppVersion> currentVersion() async {
    return const AppVersion(versionName: '1.0.0', buildNumber: 1);
  }
}
