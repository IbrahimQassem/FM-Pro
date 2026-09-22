import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/app_update/domain/models/app_update_info.dart';
import 'package:hudhud_fm/features/app_update/presentation/force_update_screen.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

Widget _buildTestWidget({
  Locale locale = const Locale('ar'),
  AppUpdateInfo? updateInfo,
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
    home: ForceUpdateScreen(updateInfo: updateInfo),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ForceUpdateScreen', () {
    testWidgets('renders blocking non-dismissible screen with update button in Arabic',
        (tester) async {
      await tester.pumpWidget(_buildTestWidget(
        locale: const Locale('ar'),
        updateInfo: const AppUpdateInfo(
          minVersionCode: 40,
          minVersionName: '4.0.0',
          latestVersionCode: 45,
          latestVersionName: '4.5.0',
        ),
      ));
      await tester.pumpAndSettle();

      // Blocking PopScope check
      final popScope = tester.widget<PopScope>(find.byType(PopScope));
      expect(popScope.canPop, isFalse);

      // Localized strings
      expect(find.text('تحديث مطلوب'), findsOneWidget);
      expect(find.text('تحديث الآن'), findsOneWidget);
      expect(find.byKey(const Key('force-update-now-button')), findsOneWidget);
    });

    testWidgets('renders in English with custom remote messages if provided',
        (tester) async {
      await tester.pumpWidget(_buildTestWidget(
        locale: const Locale('en'),
        updateInfo: const AppUpdateInfo(
          minVersionCode: 40,
          minVersionName: '4.0.0',
          latestVersionCode: 45,
          latestVersionName: '4.5.0',
          forceUpdateTitleEn: 'Critical Upgrade Mandatory',
          forceUpdateMessageEn: 'Please install the new release immediately.',
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Critical Upgrade Mandatory'), findsOneWidget);
      expect(find.text('Please install the new release immediately.'), findsOneWidget);
      expect(find.text('Update Now'), findsOneWidget);
    });
  });
}
