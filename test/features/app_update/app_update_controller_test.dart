import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/app_update/data/app_update_repository.dart';
import 'package:hudhud_fm/features/app_update/domain/models/app_update_info.dart';
import 'package:hudhud_fm/features/app_update/presentation/controllers/app_update_controller.dart';
import 'package:hudhud_fm/features/app_update/presentation/controllers/app_update_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeAppUpdateRepository implements AppUpdateRepository {
  _FakeAppUpdateRepository(this.info);

  AppUpdateInfo? info;

  @override
  Future<AppUpdateInfo?> fetchUpdateInfo() async => info;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late SharedPreferences prefs;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
  });

  group('AppUpdateController', () {
    test('triggers force update when current version is below minVersionCode', () async {
      final repo = _FakeAppUpdateRepository(
        const AppUpdateInfo(
          minVersionCode: 40,
          minVersionName: '4.0.0',
          latestVersionCode: 45,
          latestVersionName: '4.5.0',
        ),
      );

      final controller = AppUpdateController(
        repository: repo,
        syncPreferences: prefs,
        currentVersionCode: 33,
      );

      // Wait for async checkForUpdate
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(controller.state.status, AppUpdateStatus.forceUpdateRequired);
      expect(controller.state.isForceUpdate, isTrue);
      expect(controller.state.isOptionalUpdate, isFalse);
      expect(controller.state.shouldPromptOptional, isFalse);
    });

    test('triggers optional update when current version meets min but is below latest', () async {
      final repo = _FakeAppUpdateRepository(
        const AppUpdateInfo(
          minVersionCode: 30,
          minVersionName: '3.0.0',
          latestVersionCode: 35,
          latestVersionName: '3.0.5',
        ),
      );

      final controller = AppUpdateController(
        repository: repo,
        syncPreferences: prefs,
        currentVersionCode: 33,
      );

      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(controller.state.status, AppUpdateStatus.optionalUpdateAvailable);
      expect(controller.state.isForceUpdate, isFalse);
      expect(controller.state.isOptionalUpdate, isTrue);
      expect(controller.state.shouldPromptOptional, isTrue);
    });

    test('dismissing optional update sets shouldPromptOptional to false and respects cooldown', () async {
      final repo = _FakeAppUpdateRepository(
        const AppUpdateInfo(
          minVersionCode: 30,
          minVersionName: '3.0.0',
          latestVersionCode: 35,
          latestVersionName: '3.0.5',
        ),
      );

      final controller = AppUpdateController(
        repository: repo,
        syncPreferences: prefs,
        currentVersionCode: 33,
      );

      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(controller.state.shouldPromptOptional, isTrue);

      await controller.dismissOptionalUpdate();
      expect(controller.state.shouldPromptOptional, isFalse);

      // Check again immediately with same version - should not prompt
      await controller.checkForUpdate();
      expect(controller.state.shouldPromptOptional, isFalse);

      // But if a newer version comes out (e.g. 36), should prompt again
      repo.info = const AppUpdateInfo(
        minVersionCode: 30,
        minVersionName: '3.0.0',
        latestVersionCode: 36,
        latestVersionName: '3.0.6',
      );

      await controller.checkForUpdate();
      expect(controller.state.shouldPromptOptional, isTrue);
    });

    test('marks upToDate when current meets or exceeds latest', () async {
      final repo = _FakeAppUpdateRepository(
        const AppUpdateInfo(
          minVersionCode: 30,
          minVersionName: '3.0.0',
          latestVersionCode: 33,
          latestVersionName: '3.0.3',
        ),
      );

      final controller = AppUpdateController(
        repository: repo,
        syncPreferences: prefs,
        currentVersionCode: 33,
      );

      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(controller.state.status, AppUpdateStatus.upToDate);
      expect(controller.state.isForceUpdate, isFalse);
      expect(controller.state.isOptionalUpdate, isFalse);
    });
  });
}
