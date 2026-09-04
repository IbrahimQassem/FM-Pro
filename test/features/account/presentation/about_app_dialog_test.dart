import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/features/account/presentation/widgets/about_app_dialog.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets("shows about app dialog with version, description, and closes cleanly", (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale("ar"),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => AboutAppDialog.show(context),
              child: const Text("Open About"),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text("Open About"));
    await tester.pumpAndSettle();

    expect(find.byType(AboutAppDialog), findsOneWidget);
    expect(find.text("عن هدهد FM"), findsOneWidget);
    expect(find.textContaining("1.0.0 (1)"), findsOneWidget);
    expect(find.textContaining("هدهد FM هو دليلك الأول للاستماع"), findsOneWidget);

    // Close dialog
    await tester.tap(find.byKey(const Key("close-about-dialog")));
    await tester.pumpAndSettle();

    expect(find.byType(AboutAppDialog), findsNothing);
  });
}
