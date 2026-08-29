import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  ) : super(const HomeState()) {
    unawaited(_initialize());
  }

  static const _viewModePreferenceKey = 'home.stationViewMode';

  final StationsRepository _stationsRepository;
  final BannersRepository _bannersRepository;
  final LocationsRepository _locationsRepository;
  final UserRepository _userRepository;

  Future<void> _initialize() async {
    await Future.wait([
      _loadViewMode(),
      _loadUser(),
      _loadStationCache(),
      _loadBannerCache(),
      _loadLocationCache(),
    ]);
    await refresh();
  }

  Future<void> _loadViewMode() async {
    final preferences = await SharedPreferences.getInstance();
    final saved = preferences.getString(_viewModePreferenceKey);
    if (!mounted) return;
    state = state.copyWith(
      viewMode: saved == StationViewMode.list.name
          ? StationViewMode.list
          : StationViewMode.grid,
    );
  }

  Future<void> _loadUser() async {
    final user = await _userRepository.currentUser();
    if (mounted) state = state.copyWith(user: user);
  }

  Future<void> _loadStationCache() async {
    try {
      final stations = await _stationsRepository.readCache();
      if (!mounted) return;
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
    try {
      final banners = await _bannersRepository.readCache();
      if (mounted) state = state.copyWith(banners: banners.items);
    } on Object {
      // Banners never block the home screen.
    }
  }

  Future<void> _loadLocationCache() async {
    try {
      final locations = await _locationsRepository.readCache();
      if (mounted) {
        state = state.copyWith(referenceLocations: locations.items);
      }
    } on Object {
      // Location filters stay hidden until canonical reference data is ready.
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(
      isRefreshing: state.hasStations,
      isInitialLoading: !state.hasStations,
      failure: HomeFailure.none,
    );

    try {
      final stations = await _stationsRepository.refresh();
      if (!mounted) return;
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
      if (!mounted) return;
      state = state.copyWith(
        isInitialLoading: false,
        isRefreshing: false,
        isOffline: true,
        failure: state.hasStations ? HomeFailure.none : HomeFailure.load,
      );
    }

    unawaited(_refreshBanners());
    unawaited(_refreshLocations());
    unawaited(_loadUser());
  }

  Future<void> _refreshBanners() async {
    try {
      final result = await _bannersRepository.refresh();
      if (mounted) state = state.copyWith(banners: result.items);
    } on Object {
      if (mounted && state.banners.isEmpty) {
        state = state.copyWith(banners: const []);
      }
    }
  }

  Future<void> _refreshLocations() async {
    try {
      final result = await _locationsRepository.refresh();
      if (!mounted) return;
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
    state = state.copyWith(selectedCityCode: code);
  }

  Future<void> setViewMode(StationViewMode mode) async {
    state = state.copyWith(viewMode: mode);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_viewModePreferenceKey, mode.name);
  }
}
