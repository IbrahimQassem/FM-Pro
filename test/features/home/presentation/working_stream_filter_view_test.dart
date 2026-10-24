import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';
import 'package:hudhud_fm/features/home/presentation/widgets/home_view.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

void main() {
  for (final language in ['ar', 'en']) {
    testWidgets(
        '$language working filter empty state can recover archives at200 percent text',
        (tester) async {
      var state = const HomeState(
          stations: [
            Station(
                id: 'archive',
                name: 'Archive station',
                streamUrl: '',
                countryCode: 'YE',
                countryNameAr: 'اليمن',
                cityCode: 'aden',
                cityNameAr: 'عدن',
                priority: 1,
                isLive: false,
                isActive: true,
                isVerified: false,
                isFeatured: false,
                programsCount: 1,
                subscribersCount: 0,
                totalPlays: 0)
          ],
          isWorkingStreamsOnly: true,
          isFavoritesOnly: true,
          favoriteStationIds: {'archive'},
          selectedCityCode: 'aden',
          searchQuery: 'Archive',
          isInitialLoading: false);
      await tester.pumpWidget(MaterialApp(
          locale: Locale(language),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate
          ],
          builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: const TextScaler.linear(2)),
              child: child!),
          home: StatefulBuilder(
              builder: (context, update) => HomeView(
                    state: state,
                    onRefresh: () async {},
                    onSearchChanged: (_) {},
                    onCitySelected: (_) {},
                    onViewModeChanged: (_) {},
                    onNotificationsPressed: () {},
                    onSettingsPressed: () {},
                    onStationPressed: (_) {},
                    onStationPlayPressed: (_) {},
                    onFavoritesFilterToggled: (_) {},
                    onWorkingStreamsFilterToggled: (value) => update(() =>
                        state = state.copyWith(isWorkingStreamsOnly: value)),
                  ))));
      await tester.pumpAndSettle();
      final strings =
          AppLocalizations.of(tester.element(find.byType(HomeView)));
      expect(find.text(strings.workingStreamsEmptyTitle), findsOneWidget);
      await tester.ensureVisible(find.text(strings.showAllStreamStates));
      await tester.pumpAndSettle();
      await tester.tap(find.text(strings.showAllStreamStates));
      await tester.pumpAndSettle();
      expect(state.isWorkingStreamsOnly, false);
      await tester.scrollUntilVisible(find.text('Archive station'), 250,
          scrollable: find.byType(Scrollable).first);
      expect(find.text('Archive station'), findsOneWidget);
      expect(state.isFavoritesOnly, true);
      expect(state.selectedCityCode, 'aden');
      expect(state.searchQuery, 'Archive');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
}
