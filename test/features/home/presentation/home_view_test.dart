import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/location_reference.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';
import 'package:hudhud_fm/features/home/presentation/widgets/home_view.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

void main() {
  testWidgets('renders the Arabic home vertical slice in RTL', (tester) async {
    final station = Station(
      id: 'sanaa',
      name: 'إذاعة صنعاء',
      streamUrl: 'https://radio.example.com/live',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'sanaa',
      cityNameAr: 'صنعاء',
      frequency: '92.5 MHz',
      priority: 10,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: true,
      programsCount: 4,
      subscribersCount: 120,
      totalPlays: 400,
    );
    const location = LocationReference(
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'sanaa',
      cityNameAr: 'صنعاء',
      sortOrder: 1,
      isActive: true,
    );

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ar'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: HomeView(
          state: HomeState(
            stations: [station],
            referenceLocations: const [location],
            isInitialLoading: false,
          ),
          onRefresh: () async {},
          onSearchChanged: (_) {},
          onCitySelected: (_) {},
          onViewModeChanged: (_) {},
          onNotificationsPressed: () {},
          onSettingsPressed: () {},
          onStationPressed: (_) {},
          onStationPlayPressed: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('مرحبًا، مستمع'), findsOneWidget);
    expect(find.text('إذاعة صنعاء'), findsOneWidget);
    expect(find.text('صنعاء'), findsOneWidget);
    expect(find.text('الكل'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.byType(HomeView))),
      TextDirection.rtl,
    );
  });

  testWidgets('forwards search, city, and view mode interactions', (
    tester,
  ) async {
    final station = Station(
      id: 'sanaa',
      name: 'إذاعة صنعاء',
      streamUrl: 'https://radio.example.com/live',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'sanaa',
      cityNameAr: 'صنعاء',
      frequency: '92.5 MHz',
      priority: 10,
      isLive: true,
      isActive: true,
      isVerified: false,
      isFeatured: true,
      programsCount: 0,
      subscribersCount: 0,
      totalPlays: 0,
    );
    const location = LocationReference(
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      cityCode: 'sanaa',
      cityNameAr: 'صنعاء',
      sortOrder: 1,
      isActive: true,
    );
    String? searchQuery;
    String? selectedCity;
    StationViewMode? selectedViewMode;
    Station? openedStation;
    Station? playedStation;

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ar'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: HomeView(
          state: HomeState(
            stations: [station],
            referenceLocations: const [location],
            isInitialLoading: false,
          ),
          onRefresh: () async {},
          onSearchChanged: (value) => searchQuery = value,
          onCitySelected: (value) => selectedCity = value,
          onViewModeChanged: (value) => selectedViewMode = value,
          onNotificationsPressed: () {},
          onSettingsPressed: () {},
          onStationPressed: (value) => openedStation = value,
          onStationPlayPressed: (value) => playedStation = value,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'صنعاء');
    await tester.tap(find.widgetWithText(ChoiceChip, 'صنعاء'));
    await tester.tap(find.byIcon(Icons.view_agenda_outlined));
    await tester.tap(find.byIcon(Icons.play_arrow_rounded));
    await tester.tap(find.text('إذاعة صنعاء'));

    expect(searchQuery, 'صنعاء');
    expect(selectedCity, 'sanaa');
    expect(selectedViewMode, StationViewMode.list);
    expect(playedStation?.id, station.id);
    expect(openedStation?.id, station.id);
  });

  testWidgets("displays mascot empty search state when filter has no matches", (
    tester,
  ) async {
    final station = Station(
      id: "sanaa",
      name: "إذاعة صنعاء",
      streamUrl: "https://radio.example.com/live",
      countryCode: "YE",
      countryNameAr: "اليمن",
      cityCode: "sanaa",
      cityNameAr: "صنعاء",
      frequency: "92.5 MHz",
      priority: 10,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: true,
      programsCount: 4,
      subscribersCount: 120,
      totalPlays: 400,
    );

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
        home: HomeView(
          state: HomeState(
            stations: [station],
            searchQuery: "غير موجود",
            isInitialLoading: false,
          ),
          onRefresh: () async {},
          onSearchChanged: (_) {},
          onCitySelected: (_) {},
          onViewModeChanged: (_) {},
          onNotificationsPressed: () {},
          onSettingsPressed: () {},
          onStationPressed: (_) {},
          onStationPlayPressed: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("لم نعثر على نتائج مطابقة"), findsOneWidget);
    expect(find.text("جرّب البحث باسم محطة أخرى أو فئة مختلفة وسنبحث معك فورًا."), findsOneWidget);
    expect(find.text("مسح البحث"), findsOneWidget);
  });

  testWidgets("clears search input when clear button is tapped", (tester) async {
    final station = Station(
      id: "sanaa",
      name: "إذاعة صنعاء",
      streamUrl: "https://radio.example.com/live",
      countryCode: "YE",
      countryNameAr: "اليمن",
      cityCode: "sanaa",
      cityNameAr: "صنعاء",
      frequency: "92.5 MHz",
      priority: 10,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: true,
      programsCount: 4,
      subscribersCount: 120,
      totalPlays: 400,
    );

    String? changedQuery;

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
        home: HomeView(
          state: HomeState(
            stations: [station],
            searchQuery: "صنعاء",
            isInitialLoading: false,
          ),
          onRefresh: () async {},
          onSearchChanged: (val) => changedQuery = val,
          onCitySelected: (_) {},
          onViewModeChanged: (_) {},
          onNotificationsPressed: () {},
          onSettingsPressed: () {},
          onStationPressed: (_) {},
          onStationPlayPressed: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    final clearButton = find.byKey(const Key("search-clear-button"));
    expect(clearButton, findsOneWidget);

    await tester.tap(clearButton);
    await tester.pumpAndSettle();

    expect(changedQuery, "");
  });

  testWidgets("displays mascot empty favorites state when favorites filter has no stations", (
    tester,
  ) async {
    final station = Station(
      id: "sanaa",
      name: "إذاعة صنعاء",
      streamUrl: "https://radio.example.com/live",
      countryCode: "YE",
      countryNameAr: "اليمن",
      cityCode: "sanaa",
      cityNameAr: "صنعاء",
      frequency: "92.5 MHz",
      priority: 10,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: true,
      programsCount: 4,
      subscribersCount: 120,
      totalPlays: 400,
    );

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
        home: HomeView(
          state: HomeState(
            stations: [station],
            isFavoritesOnly: true,
            favoriteStationIds: const {},
            isInitialLoading: false,
          ),
          onRefresh: () async {},
          onSearchChanged: (_) {},
          onCitySelected: (_) {},
          onFavoritesFilterToggled: (_) {},
          onViewModeChanged: (_) {},
          onNotificationsPressed: () {},
          onSettingsPressed: () {},
          onStationPressed: (_) {},
          onStationPlayPressed: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("قائمتك المفضلة فارغة"), findsOneWidget);
    expect(find.text("أضف محطاتك المفضلة لتصل إليها بنقرة واحدة في أي وقت."), findsOneWidget);
  });

  testWidgets("triggers onFavoriteToggle when favorite button is pressed on station card", (
    tester,
  ) async {
    final station = Station(
      id: "sanaa",
      name: "إذاعة صنعاء",
      streamUrl: "https://radio.example.com/live",
      countryCode: "YE",
      countryNameAr: "اليمن",
      cityCode: "sanaa",
      cityNameAr: "صنعاء",
      frequency: "92.5 MHz",
      priority: 10,
      isLive: true,
      isActive: true,
      isVerified: true,
      isFeatured: true,
      programsCount: 4,
      subscribersCount: 120,
      totalPlays: 400,
    );

    Station? favoritedStation;

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
        home: HomeView(
          state: HomeState(
            stations: [station],
            favoriteStationIds: const {"sanaa"},
            isInitialLoading: false,
          ),
          onRefresh: () async {},
          onSearchChanged: (_) {},
          onCitySelected: (_) {},
          onFavoriteToggle: (s) => favoritedStation = s,
          onViewModeChanged: (_) {},
          onNotificationsPressed: () {},
          onSettingsPressed: () {},
          onStationPressed: (_) {},
          onStationPlayPressed: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.favorite_rounded), findsOneWidget);
    await tester.tap(find.byIcon(Icons.favorite_rounded));
    expect(favoritedStation?.id, "sanaa");
  });
}
