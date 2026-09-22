import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/presentation/widgets/contact_us_dialog.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

Widget _buildTestWidget({Locale locale = const Locale('ar')}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: AppLocalizations.supportedLocales,
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: const Scaffold(
      body: ContactUsDialog(),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ContactUsDialog', () {
    testWidgets('renders brand identity, contact section and all social channels in Arabic',
        (tester) async {
      await tester.pumpWidget(_buildTestWidget(locale: const Locale('ar')));
      await tester.pumpAndSettle();

      // Brand Identity
      expect(find.text('هدهد إف إم'), findsOneWidget);
      expect(find.text('تواصل معنا عبر'), findsOneWidget);

      // Channel Buttons
      expect(find.byKey(const Key('contact-whatsapp')), findsOneWidget);
      expect(find.byKey(const Key('contact-phone')), findsOneWidget);
      expect(find.byKey(const Key('contact-email')), findsOneWidget);
      expect(find.byKey(const Key('contact-facebook')), findsOneWidget);
      expect(find.byKey(const Key('contact-twitter')), findsOneWidget);
      expect(find.byKey(const Key('contact-instagram')), findsOneWidget);
      expect(find.byKey(const Key('contact-website')), findsOneWidget);
      expect(find.byKey(const Key('close-contact-dialog')), findsOneWidget);
    });

    testWidgets('renders in English with correct channel labels', (tester) async {
      await tester.pumpWidget(_buildTestWidget(locale: const Locale('en')));
      await tester.pumpAndSettle();

      expect(find.text('Contact us via'), findsOneWidget);
      expect(find.text('WhatsApp'), findsOneWidget);
      expect(find.text('Call Us'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Facebook'), findsOneWidget);
      expect(find.text('X (Twitter)'), findsOneWidget);
      expect(find.text('Instagram'), findsOneWidget);
      expect(find.text('HudHud Web'), findsOneWidget);
    });
  });
}
