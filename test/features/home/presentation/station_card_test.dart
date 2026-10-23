import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/home/presentation/widgets/station_card.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

Widget buildTestWidget({
  required Widget child,
  Locale locale = const Locale('ar'),
  ThemeMode themeMode = ThemeMode.light,
  double textScaleFactor = 1.0,
  bool disableAnimations = false,
  double? width = 360,
  double? height = 400,
}) {
  return MediaQuery(
    data: MediaQueryData(
      textScaler: TextScaler.linear(textScaleFactor),
      disableAnimations: disableAnimations,
    ),
    child: MaterialApp(
      locale: locale,
      themeMode: themeMode,
      theme: ThemeData.light(useMaterial3: true),
      darkTheme: ThemeData.dark(useMaterial3: true),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: Scaffold(
        body: Center(
          child: SizedBox(
            width: width,
            height: height,
            child: child,
          ),
        ),
      ),
    ),
  );
}

void main() {
  Station createStation({
    String? name,
    String? cityNameAr,
    String? frequency,
  }) {
    return Station(
      id: 'sanaa',
      name: name ?? 'إذاعة صنعاء البرنامج العام',
      streamUrl: 'https://radio.example.com/live',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'sanaa',
      cityNameAr: cityNameAr ?? 'صنعاء',
      frequency: frequency ?? '90.9 FM',
      priority: 10,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: true,
      programsCount: 12,
      subscribersCount: 1500,
      totalPlays: 4200,
    );
  }

  final sampleStation = createStation();

  testWidgets(
      'renders grid station card with luxury styling, chip, and buttons without overflow',
      (tester) async {
    bool playPressed = false;
    bool favoriteToggled = false;

    await tester.pumpWidget(
      buildTestWidget(
        child: StationCard.grid(
          station: sampleStation,
          onOpen: () {},
          onPlay: () {
            playPressed = true;
          },
          isFavorite: false,
          onFavoriteToggle: () {
            favoriteToggled = true;
          },
        ),
      ),
    );

    // Verify title and metadata chip
    expect(find.text('إذاعة صنعاء البرنامج العام'), findsOneWidget);
    expect(find.text('صنعاء · 90.9 FM'), findsOneWidget);

    // Verify play button interaction
    final playBtn = find.byWidgetPredicate((w) => w is FilledButton);
    expect(playBtn, findsOneWidget);
    await tester.tap(playBtn);
    expect(playPressed, true);

    // Verify favorite button interaction
    final favBtn = find.byTooltip('إضافة إلى المفضلة');
    expect(favBtn, findsOneWidget);
    await tester.tap(favBtn);
    expect(favoriteToggled, true);
  });

  testWidgets('renders list station card in dark mode and LTR', (tester) async {
    await tester.pumpWidget(
      buildTestWidget(
        locale: const Locale('en'),
        themeMode: ThemeMode.dark,
        height: null,
        child: StationCard.list(
          station: sampleStation,
          onOpen: () {},
          onPlay: () {},
          isFavorite: true,
          onFavoriteToggle: () {},
        ),
      ),
    );

    expect(find.text('إذاعة صنعاء البرنامج العام'), findsOneWidget);
    expect(find.text('صنعاء · 90.9 FM'), findsOneWidget);
    expect(find.byTooltip('Remove from favorites'), findsOneWidget);
  });

  testWidgets(
      'handles missing frequency and missing city smoothly in metadata chip',
      (tester) async {
    // 1. Missing frequency
    final noFreqStation = createStation(frequency: '');
    await tester.pumpWidget(
      buildTestWidget(
        child: StationCard.grid(
          station: noFreqStation,
          onOpen: () {},
          onPlay: () {},
        ),
      ),
    );
    expect(find.text('صنعاء'), findsOneWidget);

    // 2. Missing city
    final noCityStation = createStation(cityNameAr: '');
    await tester.pumpWidget(
      buildTestWidget(
        child: StationCard.grid(
          station: noCityStation,
          onOpen: () {},
          onPlay: () {},
        ),
      ),
    );
    expect(find.text('90.9 FM'), findsOneWidget);
  });

  testWidgets(
      'PKG-09: renders without overflow under textScaler 2.0 and long names',
      (tester) async {
    final longNameStation = createStation(
      name:
          'إذاعة الجمهورية اليمنية من صنعاء - البرنامج العام والبرامج الإخبارية والتنموية المستمرة',
    );

    // Grid at textScaler 2.0
    await tester.pumpWidget(
      buildTestWidget(
        textScaleFactor: 2.0,
        child: StationCard.grid(
          station: longNameStation,
          onOpen: () {},
          onPlay: () {},
          isFavorite: true,
          onFavoriteToggle: () {},
        ),
      ),
    );
    expect(tester.takeException(), isNull);

    // List at textScaler 2.0
    await tester.pumpWidget(
      buildTestWidget(
        textScaleFactor: 2.0,
        height: null,
        child: StationCard.list(
          station: longNameStation,
          onOpen: () {},
          onPlay: () {},
          isFavorite: false,
          onFavoriteToggle: () {},
        ),
      ),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('PKG-09: respects disableAnimations for favorite button',
      (tester) async {
    await tester.pumpWidget(
      buildTestWidget(
        disableAnimations: true,
        child: StationCard.grid(
          station: sampleStation,
          onOpen: () {},
          onPlay: () {},
          isFavorite: false,
          onFavoriteToggle: () {},
        ),
      ),
    );

    // With disableAnimations = true, custom ScaleTransition should not be present
    expect(find.byKey(const ValueKey('favorite_button_scale')), findsNothing);

    // With disableAnimations = false, custom ScaleTransition is present
    await tester.pumpWidget(
      buildTestWidget(
        disableAnimations: false,
        child: StationCard.grid(
          station: sampleStation,
          onOpen: () {},
          onPlay: () {},
          isFavorite: false,
          onFavoriteToggle: () {},
        ),
      ),
    );
    expect(find.byKey(const ValueKey('favorite_button_scale')), findsOneWidget);
  });
}
