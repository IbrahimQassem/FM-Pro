import "package:flutter/material.dart";

import "../../../../l10n/generated/app_localizations.dart";
import "../../domain/models/station.dart";
import "../controllers/home_state.dart";
import "banner_carousel.dart";
import "home_empty_state.dart";
import "home_loading.dart";
import "station_card.dart";
import "user_header.dart";

class HomeView extends StatefulWidget {
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
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.state.searchQuery);
  }

  @override
  void didUpdateWidget(HomeView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state.searchQuery != _searchController.text) {
      _searchController.text = widget.state.searchQuery;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _clearSearch() {
    _searchController.clear();
    widget.onSearchChanged("");
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final visibleStations = widget.state.visibleStations;
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final useGrid =
        widget.state.viewMode == StationViewMode.grid && textScale <= 1.4;

    return Scaffold(
      bottomNavigationBar: widget.playerBar,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: widget.onRefresh,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: UserHeader(
                    user: widget.state.user,
                    isOffline: widget.state.isOffline,
                    onNotificationsPressed: widget.onNotificationsPressed,
                    onSettingsPressed: widget.onSettingsPressed,
                  ),
                ),
              ),
              if (widget.state.isOffline)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: MaterialBanner(
                      content: Text(strings.offlineStatus),
                      leading: const Icon(Icons.cloud_off_rounded),
                      actions: [
                        TextButton(
                          onPressed: widget.onRefresh,
                          child: Text(strings.retry),
                        ),
                      ],
                    ),
                  ),
                ),
              if (widget.state.banners.isNotEmpty)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: BannerCarousel(banners: widget.state.banners),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) {
                      setState(() {});
                      widget.onSearchChanged(value);
                    },
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: strings.searchHint,
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              key: const Key("search-clear-button"),
                              tooltip: strings.clearSearch,
                              icon: const Icon(Icons.clear_rounded),
                              onPressed: _clearSearch,
                            )
                          : null,
                    ),
                  ),
                ),
              ),
              if (widget.state.cities.isNotEmpty)
                SliverToBoxAdapter(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        ChoiceChip(
                          label: Text(strings.allCities),
                          selected:
                              !widget.state.isFavoritesOnly &&
                              widget.state.selectedCityCode.isEmpty,
                          onSelected: (_) {
                            widget.onFavoritesFilterToggled?.call(false);
                            widget.onCitySelected("");
                          },
                        ),
                        const SizedBox(width: 8),
                        ChoiceChip(
                          avatar: Icon(
                            widget.state.isFavoritesOnly
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 16,
                          ),
                          label: Text(strings.favoritesFilter),
                          selected: widget.state.isFavoritesOnly,
                          onSelected: (selected) {
                            widget.onFavoritesFilterToggled?.call(selected);
                          },
                        ),
                        for (final city in widget.state.cities) ...[
                          const SizedBox(width: 8),
                          ChoiceChip(
                            label: Text(city.nameAr),
                            selected:
                                !widget.state.isFavoritesOnly &&
                                widget.state.selectedCityCode == city.code,
                            onSelected: (_) {
                              widget.onFavoritesFilterToggled?.call(false);
                              widget.onCitySelected(city.code);
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
                        onPressed: () => widget.onViewModeChanged(
                          widget.state.viewMode == StationViewMode.grid
                              ? StationViewMode.list
                              : StationViewMode.grid,
                        ),
                        tooltip: widget.state.viewMode == StationViewMode.grid
                            ? strings.listView
                            : strings.gridView,
                        icon: Icon(
                          widget.state.viewMode == StationViewMode.grid
                              ? Icons.view_agenda_outlined
                              : Icons.grid_view_rounded,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (widget.state.isInitialLoading)
                const HomeLoading()
              else if (widget.state.failure == HomeFailure.load)
                HomeEmptyState(
                  imageAsset: "assets/images/mascot/mascot_offline.webp",
                  icon: Icons.wifi_off_rounded,
                  title: strings.mascotOfflineTitle,
                  message: strings.mascotOfflineSubtitle,
                  actionLabel: strings.retry,
                  onAction: widget.onRefresh,
                )
              else if (!widget.state.hasStations)
                HomeEmptyState(
                  icon: Icons.radio_outlined,
                  title: strings.noStationsTitle,
                  message: strings.noStationsMessage,
                  actionLabel: strings.retry,
                  onAction: widget.onRefresh,
                )
              else if (widget.state.isFavoritesOnly && visibleStations.isEmpty)
                HomeEmptyState(
                  imageAsset: "assets/images/mascot/mascot_empty_favorites.webp",
                  title: strings.mascotEmptyFavoritesTitle,
                  message: strings.mascotEmptyFavoritesSubtitle,
                )
              else if (visibleStations.isEmpty)
                HomeEmptyState(
                  imageAsset: "assets/images/mascot/mascot_empty_search.webp",
                  icon: Icons.search_off_rounded,
                  title: strings.mascotEmptySearchTitle,
                  message: strings.mascotEmptySearchSubtitle,
                  actionLabel: widget.state.searchQuery.isNotEmpty
                      ? strings.clearSearch
                      : null,
                  actionIcon: Icons.clear_rounded,
                  onAction: widget.state.searchQuery.isNotEmpty
                      ? () async => _clearSearch()
                      : null,
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
                      isFavorite: widget.state.favoriteStationIds.contains(
                        visibleStations[index].id,
                      ),
                      onFavoriteToggle: widget.onFavoriteToggle == null
                          ? null
                          : () => widget.onFavoriteToggle!(visibleStations[index]),
                      onOpen: () => widget.onStationPressed(visibleStations[index]),
                      onPlay: () =>
                          widget.onStationPlayPressed(visibleStations[index]),
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
                      isFavorite: widget.state.favoriteStationIds.contains(
                        visibleStations[index].id,
                      ),
                      onFavoriteToggle: widget.onFavoriteToggle == null
                          ? null
                          : () => widget.onFavoriteToggle!(visibleStations[index]),
                      onOpen: () => widget.onStationPressed(visibleStations[index]),
                      onPlay: () =>
                          widget.onStationPlayPressed(visibleStations[index]),
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
