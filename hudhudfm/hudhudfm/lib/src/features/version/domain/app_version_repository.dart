import 'app_version.dart';

abstract class AppVersionRepository {
  Future<AppVersion> currentVersion();
}
