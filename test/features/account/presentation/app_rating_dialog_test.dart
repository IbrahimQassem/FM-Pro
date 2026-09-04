import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/features/account/presentation/widgets/app_rating_dialog.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets("shows rating dialog with 5 stars and submits chosen rating", (tester) async {
    int? submittedRating;

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
              onPressed: () async {
                submittedRating = await AppRatingDialog.show(context);
              },
              child: const Text("Open Rating"),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text("Open Rating"));
    await tester.pumpAndSettle();

    expect(find.byType(AppRatingDialog), findsOneWidget);
    expect(find.text("ما رأيك في هدهد FM؟"), findsOneWidget);
    expect(find.byKey(const Key("rating-star-5")), findsOneWidget);

    // Tap star 4
    await tester.tap(find.byKey(const Key("rating-star-4")));
    await tester.pumpAndSettle();

    // Submit rating
    await tester.tap(find.byKey(const Key("submit-rating-button")));
    await tester.pumpAndSettle();

    expect(submittedRating, 4);
    expect(find.text("شكراً لدعمك وتقييمك الرائع!"), findsOneWidget);
  });
}
