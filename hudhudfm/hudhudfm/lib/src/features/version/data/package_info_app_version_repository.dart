import 'package:package_info_plus/package_info_plus.dart';

import '../domain/app_version.dart';
import '../domain/app_version_repository.dart';

class PackageInfoAppVersionRepository implements AppVersionRepository {
  @override
  Future<AppVersion> currentVersion() async {
    final packageInfo = await PackageInfo.fromPlatform();

    return AppVersion(
      versionName: packageInfo.version,
      buildNumber: int.tryParse(packageInfo.buildNumber) ?? 0,
    );
  }
}
