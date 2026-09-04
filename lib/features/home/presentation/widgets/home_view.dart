import 'package:flutter/material.dart';

import '../../../../l10n/generated/app_localizations.dart';
import '../../domain/models/station.dart';
import '../controllers/home_state.dart';
import 'banner_carousel.dart';
import 'home_empty_state.dart';
import 'home_loading.dart';
import 'station_card.dart';
import 'user_header.dart';

class HomeView extends StatelessWidget {
  const HomeView({
    required this.state,
    required this.onRefresh,
    required this.onSearchChanged,
    required this.onCitySelected,
    required this.onViewModeChanged,
    required this.onNotificationsPressed,
    required this.onSettingsPressed,
    required this.onStationPressed,
    required this.onStationPlayPressed,
    this.onFavoritesFilterToggled,
    this.onFavoriteToggle,
    this.playerBar,
    super.key,
  });

  final HomeState state;
  final Future<void> Function() onRefresh;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onCitySelected;
  final ValueChanged<StationViewMode> onViewModeChanged;
  final VoidCallback onNotificationsPressed;
  final VoidCallback onSettingsPressed;
  final ValueChanged<Station> onStationPressed;
  final ValueChanged<Station> onStationPlayPressed;
  final ValueChanged<bool>? onFavoritesFilterToggled;
  final ValueChanged<Station>? onFavoriteToggle;
  final Widget? playerBar;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final visibleStations = state.visibleStations;
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final useGrid = state.viewMode == StationViewMode.grid && textScale <= 1.4;

    return Scaffold(
      bottomNavigationBar: playerBar,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: onRefresh,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: UserHeader(
                    user: state.user,
                    isOffline: state.isOffline,
                    onNotificationsPressed: onNotificationsPressed,
                    onSettingsPressed: onSettingsPressed,
                  ),
                ),
              ),
              if (state.isOffline)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: MaterialBanner(
                      content: Text(strings.offlineStatus),
                      leading: const Icon(Icons.cloud_off_rounded),
                      actions: [
                        TextButton(
                          onPressed: onRefresh,
                          child: Text(strings.retry),
                        ),
                      ],
                    ),
                  ),
                ),
              if (state.banners.isNotEmpty)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: BannerCarousel(banners: state.banners),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: TextField(
                    onChanged: onSearchChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: strings.searchHint,
                      prefixIcon: const Icon(Icons.search_rounded),
                    ),
                  ),
                ),
              ),
              if (state.cities.isNotEmpty)
                SliverToBoxAdapter(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        ChoiceChip(
                          label: Text(strings.allCities),
                          selected: !state.isFavoritesOnly && state.selectedCityCode.isEmpty,
                          onSelected: (_) {
                            onFavoritesFilterToggled?.call(false);
                            onCitySelected('');
                          },
                        ),
                        const SizedBox(width: 8),
                        ChoiceChip(
                          avatar: Icon(
                            state.isFavoritesOnly
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 16,
                          ),
                          label: Text(strings.favoritesFilter),
                          selected: state.isFavoritesOnly,
                          onSelected: (selected) {
                            onFavoritesFilterToggled?.call(selected);
                          },
                        ),
                        for (final city in state.cities) ...[
                          const SizedBox(width: 8),
                          ChoiceChip(
                            label: Text(city.nameAr),
                            selected: !state.isFavoritesOnly && state.selectedCityCode == city.code,
                            onSelected: (_) {
                              onFavoritesFilterToggled?.call(false);
                              onCitySelected(city.code);
                            },
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              strings.availableStations,
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            Text(
                              strings.stationCount(visibleStations.length),
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      IconButton.filledTonal(
                        onPressed: () => onViewModeChanged(
                          state.viewMode == StationViewMode.grid
                              ? StationViewMode.list
                              : StationViewMode.grid,
                        ),
                        tooltip: state.viewMode == StationViewMode.grid
                            ? strings.listView
                            : strings.gridView,
                        icon: Icon(
                          state.viewMode == StationViewMode.grid
                              ? Icons.view_agenda_outlined
                              : Icons.grid_view_rounded,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (state.isInitialLoading)
                const HomeLoading()
              else if (state.failure == HomeFailure.load)
                HomeEmptyState(
                  imageAsset: 'assets/images/mascot/mascot_offline.webp',
                  icon: Icons.wifi_off_rounded,
                  title: strings.mascotOfflineTitle,
                  message: strings.mascotOfflineSubtitle,
                  actionLabel: strings.retry,
                  onAction: onRefresh,
                )
              else if (!state.hasStations)
                HomeEmptyState(
                  icon: Icons.radio_outlined,
                  title: strings.noStationsTitle,
                  message: strings.noStationsMessage,
                  actionLabel: strings.retry,
                  onAction: onRefresh,
                )
              else if (state.isFavoritesOnly && visibleStations.isEmpty)
                HomeEmptyState(
                  imageAsset: 'assets/images/mascot/mascot_empty_favorites.webp',
                  title: strings.mascotEmptyFavoritesTitle,
                  message: strings.mascotEmptyFavoritesSubtitle,
                )
              else if (visibleStations.isEmpty)
                HomeEmptyState(
                  imageAsset: 'assets/images/mascot/mascot_empty_search.webp',
                  icon: Icons.search_off_rounded,
                  title: strings.mascotEmptySearchTitle,
                  message: strings.mascotEmptySearchSubtitle,
                )
              else if (useGrid)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 260,
                          mainAxisExtent: 292,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                    itemCount: visibleStations.length,
                    itemBuilder: (context, index) => StationCard.grid(
                      station: visibleStations[index],
                      isFavorite: state.favoriteStationIds.contains(visibleStations[index].id),
                      onFavoriteToggle: onFavoriteToggle == null
                          ? null
                          : () => onFavoriteToggle!(visibleStations[index]),
                      onOpen: () => onStationPressed(visibleStations[index]),
                      onPlay: () =>
                          onStationPlayPressed(visibleStations[index]),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  sliver: SliverList.separated(
                    itemCount: visibleStations.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) => StationCard.list(
                      station: visibleStations[index],
                      isFavorite: state.favoriteStationIds.contains(visibleStations[index].id),
                      onFavoriteToggle: onFavoriteToggle == null
                          ? null
                          : () => onFavoriteToggle!(visibleStations[index]),
                      onOpen: () => onStationPressed(visibleStations[index]),
                      onPlay: () =>
                          onStationPlayPressed(visibleStations[index]),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
