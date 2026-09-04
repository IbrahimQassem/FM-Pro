import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/features/account/presentation/widgets/app_rating_dialog.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets("shows rating dialog with 5 stars in a single row and submits rating", (tester) async {
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

    // Verify all 5 stars are rendered in a single Row
    for (var i = 1; i <= 5; i++) {
      expect(find.byKey(Key("rating-star-$i")), findsOneWidget);
    }

    // Tap star 4
    await tester.tap(find.byKey(const Key("rating-star-4")));
    await tester.pumpAndSettle();

    // Submit rating
    await tester.tap(find.byKey(const Key("submit-rating-button")));
    await tester.pumpAndSettle();

    expect(submittedRating, 4);
    expect(find.text("شكراً لدعمك وتقييمك الرائع!"), findsOneWidget);
  });

  testWidgets("shows comment field automatically for 1-3 stars and allows in-app feedback", (tester) async {
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

    // Tap star 2 (low rating)
    await tester.tap(find.byKey(const Key("rating-star-2")));
    await tester.pumpAndSettle();

    // Comment field should automatically be visible
    final feedbackInput = find.byKey(const Key("rating-feedback-input"));
    expect(feedbackInput, findsOneWidget);

    await tester.enterText(feedbackInput, "يرجى إضافة المزيد من الإذاعات الرياضية");
    await tester.pumpAndSettle();

    // Submit in-app feedback
    await tester.tap(find.byKey(const Key("submit-rating-button")));
    await tester.pumpAndSettle();

    expect(submittedRating, 2);
    expect(find.text("شكراً لدعمك وتقييمك الرائع!"), findsOneWidget);
  });

  testWidgets("allows high rating users to toggle comment field and submit in-app feedback", (tester) async {
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

    final toggleComment = find.byKey(const Key("toggle-comment-field-button"));
    expect(toggleComment, findsOneWidget);

    await tester.tap(toggleComment);
    await tester.pumpAndSettle();

    final feedbackInput = find.byKey(const Key("rating-feedback-input"));
    expect(feedbackInput, findsOneWidget);

    await tester.enterText(feedbackInput, "تطبيق ممتاز جداً وشكراً لكم");
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key("submit-rating-button")));
    await tester.pumpAndSettle();

    expect(submittedRating, 5);
    expect(find.text("شكراً لدعمك وتقييمك الرائع!"), findsOneWidget);
  });
}
