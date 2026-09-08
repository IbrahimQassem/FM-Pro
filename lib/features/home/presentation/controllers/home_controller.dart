import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/repositories/home_preferences_repository.dart';

import '../../domain/repositories/banners_repository.dart';
import '../../domain/repositories/locations_repository.dart';
import '../../domain/repositories/stations_repository.dart';
import '../../domain/repositories/user_repository.dart';
import 'home_state.dart';

class HomeController extends StateNotifier<HomeState> {
  HomeController(
    this._stationsRepository,
    this._bannersRepository,
    this._locationsRepository,
    this._userRepository,
    this._preferences,
  ) : super(const HomeState()) {
    unawaited(_initialize());
  }

  final HomePreferencesRepository _preferences;
  int _refreshGeneration = 0;
  int _userGeneration = 0;
  int _viewModeGeneration = 0;

  final StationsRepository _stationsRepository;
  final BannersRepository _bannersRepository;
  final LocationsRepository _locationsRepository;
  final UserRepository _userRepository;

  Future<void> _initialize() async {
    final generation = _refreshGeneration;
    await Future.wait([
      _loadViewMode(),
      _loadUser(),
      _loadStationCache(),
      _loadBannerCache(),
      _loadLocationCache(),
    ]);
    if (mounted && generation == _refreshGeneration) await refresh();
  }

  Future<void> _loadViewMode() async {
    final generation = _viewModeGeneration;
    try {
      final saved = await _preferences.readViewMode();
      if (mounted && generation == _viewModeGeneration) {
        state = state.copyWith(
            viewMode: saved == StationViewMode.list.name
                ? StationViewMode.list
                : StationViewMode.grid);
      }
    } on Object {/* Optional preference must not block discovery. */}
  }

  Future<void> _loadUser() async {
    final generation = ++_userGeneration;
    try {
      final user = await _userRepository.currentUser();
      if (mounted && generation == _userGeneration) {
        state = state.copyWith(user: user);
      }
    } on Object {/* Retain the safe guest/current projection. */}
  }

  Future<void> refreshUser() => _loadUser();

  Future<void> _loadStationCache() async {
    final generation = _refreshGeneration;
    try {
      final stations = await _stationsRepository.readCache();
      if (!mounted || generation != _refreshGeneration) return;
      if (stations.items.isNotEmpty) {
        state = state.copyWith(
          stations: stations.items,
          isInitialLoading: false,
          isOffline: true,
          rejectedRecords: stations.rejectedRecords,
        );
      }
    } on Object {
      // An empty or unavailable cache is expected on first launch.
    }
  }

  Future<void> _loadBannerCache() async {
    final generation = _refreshGeneration;
    try {
      final banners = await _bannersRepository.readCache();
      if (mounted && generation == _refreshGeneration) {
        state = state.copyWith(banners: banners.items);
      }
    } on Object {
      // Banners never block the home screen.
    }
  }

  Future<void> _loadLocationCache() async {
    final generation = _refreshGeneration;
    try {
      final locations = await _locationsRepository.readCache();
      if (mounted && generation == _refreshGeneration) {
        state = state.copyWith(referenceLocations: locations.items);
      }
    } on Object {
      // Location filters stay hidden until canonical reference data is ready.
    }
  }

  Future<void> refresh() async {
    if (!mounted) return;
    final generation = ++_refreshGeneration;
    state = state.copyWith(
      isRefreshing: state.hasStations,
      isInitialLoading: !state.hasStations,
      failure: HomeFailure.none,
    );

    try {
      final stations = await _stationsRepository.refresh();
      if (!mounted || generation != _refreshGeneration) return;
      final selectedCityStillExists = stations.items.any(
        (station) => station.cityCode == state.selectedCityCode,
      );
      state = state.copyWith(
        stations: stations.items,
        selectedCityCode: selectedCityStillExists ? state.selectedCityCode : '',
        isInitialLoading: false,
        isRefreshing: false,
        isOffline: false,
        failure: HomeFailure.none,
        rejectedRecords: stations.rejectedRecords,
      );
    } on Object {
      if (!mounted || generation != _refreshGeneration) return;
      state = state.copyWith(
        isInitialLoading: false,
        isRefreshing: false,
        isOffline: true,
        failure: state.hasStations ? HomeFailure.none : HomeFailure.load,
      );
    }

    unawaited(_refreshBanners(generation));
    unawaited(_refreshLocations(generation));
    unawaited(_loadUser());
  }

  Future<void> _refreshBanners(int generation) async {
    try {
      final result = await _bannersRepository.refresh();
      if (mounted && generation == _refreshGeneration) {
        state = state.copyWith(banners: result.items);
      }
    } on Object {
      if (mounted &&
          generation == _refreshGeneration &&
          state.banners.isEmpty) {
        state = state.copyWith(banners: const []);
      }
    }
  }

  Future<void> _refreshLocations(int generation) async {
    try {
      final result = await _locationsRepository.refresh();
      if (!mounted || generation != _refreshGeneration) return;
      final selectedCityStillExists = result.items.any(
        (location) => location.cityCode == state.selectedCityCode,
      );
      state = state.copyWith(
        referenceLocations: result.items,
        selectedCityCode: selectedCityStillExists ? state.selectedCityCode : '',
      );
    } on Object {
      // Existing canonical filters remain usable when refresh fails.
    }
  }

  void updateSearch(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void selectCity(String code) {
    state = state.copyWith(selectedCityCode: code, isFavoritesOnly: false);
  }

  void toggleFavoritesFilter(bool enabled) {
    state = state.copyWith(
      isFavoritesOnly: enabled,
      selectedCityCode: enabled ? '' : state.selectedCityCode,
    );
  }

  void updateFavoriteStationIds(Set<String> ids) {
    state = state.copyWith(favoriteStationIds: ids);
  }

  Future<void> setViewMode(StationViewMode mode) async {
    if (!mounted) return;
    _viewModeGeneration++;
    state = state.copyWith(viewMode: mode);
    try {
      await _preferences.saveViewMode(mode.name);
    } on Object {/* Keep this session usable if local storage fails. */}
  }
}
