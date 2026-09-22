import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/app_update/domain/models/app_update_info.dart';
import 'package:hudhud_fm/features/app_update/presentation/optional_update_dialog.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

Widget _buildTestWidget({
  required AppUpdateInfo updateInfo,
  required VoidCallback onDismiss,
  Locale locale = const Locale('ar'),
}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: AppLocalizations.supportedLocales,
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(
      body: OptionalUpdateDialog(
        updateInfo: updateInfo,
        onDismiss: onDismiss,
      ),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('OptionalUpdateDialog', () {
    testWidgets('renders optional update dialog with Later and Update Now actions',
        (tester) async {
      var dismissed = false;

      await tester.pumpWidget(_buildTestWidget(
        locale: const Locale('ar'),
        updateInfo: const AppUpdateInfo(
          minVersionCode: 30,
          minVersionName: '3.0.0',
          latestVersionCode: 35,
          latestVersionName: '3.0.5',
        ),
        onDismiss: () => dismissed = true,
      ));
      await tester.pumpAndSettle();

      expect(find.text('تحديث جديد متاح'), findsOneWidget);
      expect(find.text('تحديث الآن'), findsOneWidget);
      expect(find.text('لاحقاً'), findsOneWidget);

      await tester.tap(find.byKey(const Key('optional-update-later-button')));
      await tester.pumpAndSettle();

      expect(dismissed, isTrue);
    });

    testWidgets('renders in English with correct button labels', (tester) async {
      await tester.pumpWidget(_buildTestWidget(
        locale: const Locale('en'),
        updateInfo: const AppUpdateInfo(
          minVersionCode: 30,
          minVersionName: '3.0.0',
          latestVersionCode: 35,
          latestVersionName: '3.0.5',
        ),
        onDismiss: () {},
      ));
      await tester.pumpAndSettle();

      expect(find.text('Update Available'), findsOneWidget);
      expect(find.text('Update Now'), findsOneWidget);
      expect(find.text('Later'), findsOneWidget);
    });
  });
}
