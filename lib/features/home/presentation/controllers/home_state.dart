import '../../domain/models/app_user.dart';
import '../../domain/models/banner_item.dart';
import '../../domain/models/location_reference.dart';
import '../../domain/models/station.dart';

enum StationViewMode { grid, list }

enum HomeFailure { none, firebaseConfiguration, load }

class CityFilter {
  const CityFilter({
    required this.code,
    required this.nameAr,
    required this.sortOrder,
  });

  final String code;
  final String nameAr;
  final int sortOrder;
}

class HomeState {
  const HomeState({
    this.user = const AppUser.guest(),
    this.stations = const [],
    this.banners = const [],
    this.referenceLocations = const [],
    this.searchQuery = '',
    this.selectedCityCode = '',
    this.isFavoritesOnly = false,
    this.favoriteStationIds = const {},
    this.viewMode = StationViewMode.grid,
    this.isInitialLoading = true,
    this.isRefreshing = false,
    this.isOffline = false,
    this.failure = HomeFailure.none,
    this.rejectedRecords = 0,
  });

  static const defaultCountryCode = 'YE';

  final AppUser user;
  final List<Station> stations;
  final List<BannerItem> banners;
  final List<LocationReference> referenceLocations;
  final String searchQuery;
  final String selectedCityCode;
  final bool isFavoritesOnly;
  final Set<String> favoriteStationIds;
  final StationViewMode viewMode;
  final bool isInitialLoading;
  final bool isRefreshing;
  final bool isOffline;
  final HomeFailure failure;
  final int rejectedRecords;

  List<CityFilter> get cities {
    final stationCityCodes = <String>{};
    for (final station in stations) {
      if (station.countryCode.toUpperCase() == defaultCountryCode) {
        stationCityCodes.add(station.cityCode);
      }
    }
    final filtersByCode = <String, CityFilter>{};
    for (final location in referenceLocations) {
      final isVisible =
          location.isActive &&
          location.countryCode.toUpperCase() == defaultCountryCode &&
          stationCityCodes.contains(location.cityCode);
      if (isVisible) {
        filtersByCode.putIfAbsent(
          location.cityCode,
          () => CityFilter(
            code: location.cityCode,
            nameAr: location.cityNameAr,
            sortOrder: location.sortOrder,
          ),
        );
      }
    }
    final values = filtersByCode.values.toList();
    values.sort((first, second) {
      final order = first.sortOrder.compareTo(second.sortOrder);
      return order != 0 ? order : first.nameAr.compareTo(second.nameAr);
    });
    return List.unmodifiable(values);
  }

  List<Station> get visibleStations {
    final normalizedQuery = searchQuery.trim().toLowerCase();
    return stations
        .where((station) {
          if (station.countryCode.toUpperCase() != defaultCountryCode) {
            return false;
          }
          if (isFavoritesOnly && !favoriteStationIds.contains(station.id)) {
            return false;
          }
          if (selectedCityCode.isNotEmpty &&
              station.cityCode != selectedCityCode) {
            return false;
          }
          if (normalizedQuery.isEmpty) return true;
          return station.name.toLowerCase().contains(normalizedQuery) ||
              station.nameEn.toLowerCase().contains(normalizedQuery) ||
              station.cityNameAr.toLowerCase().contains(normalizedQuery) ||
              station.frequency.toLowerCase().contains(normalizedQuery);
        })
        .toList(growable: false);
  }

  bool get hasStations => stations.any(
    (station) => station.countryCode.toUpperCase() == defaultCountryCode,
  );

  HomeState copyWith({
    AppUser? user,
    List<Station>? stations,
    List<BannerItem>? banners,
    List<LocationReference>? referenceLocations,
    String? searchQuery,
    String? selectedCityCode,
    bool? isFavoritesOnly,
    Set<String>? favoriteStationIds,
    StationViewMode? viewMode,
    bool? isInitialLoading,
    bool? isRefreshing,
    bool? isOffline,
    HomeFailure? failure,
    int? rejectedRecords,
  }) {
    return HomeState(
      user: user ?? this.user,
      stations: stations ?? this.stations,
      banners: banners ?? this.banners,
      referenceLocations: referenceLocations ?? this.referenceLocations,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedCityCode: selectedCityCode ?? this.selectedCityCode,
      isFavoritesOnly: isFavoritesOnly ?? this.isFavoritesOnly,
      favoriteStationIds: favoriteStationIds ?? this.favoriteStationIds,
      viewMode: viewMode ?? this.viewMode,
      isInitialLoading: isInitialLoading ?? this.isInitialLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isOffline: isOffline ?? this.isOffline,
      failure: failure ?? this.failure,
      rejectedRecords: rejectedRecords ?? this.rejectedRecords,
    );
  }
}
