import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_controller.dart';
import 'package:hudhud_fm/features/home/presentation/controllers/home_state.dart';
import 'package:hudhud_fm/features/home/domain/models/data_batch.dart';
import 'package:hudhud_fm/features/home/domain/models/station.dart';
import 'package:hudhud_fm/features/home/domain/models/banner_item.dart';
import 'package:hudhud_fm/features/home/domain/models/app_user.dart';
import 'package:hudhud_fm/features/home/domain/models/location_reference.dart';
import 'package:hudhud_fm/features/home/domain/repositories/stations_repository.dart';
import 'package:hudhud_fm/features/home/domain/repositories/banners_repository.dart';
import 'package:hudhud_fm/features/home/domain/repositories/locations_repository.dart';
import 'package:hudhud_fm/features/home/domain/repositories/user_repository.dart';
import 'package:hudhud_fm/features/home/domain/repositories/home_preferences_repository.dart';

DataBatch<T> empty<T>() =>
    DataBatch<T>(items: [], rejectedRecords: 0, isFromCache: false);

class Stations implements StationsRepository {
  Completer<DataBatch<Station>>? cache;
  final requests = <Completer<DataBatch<Station>>>[];
  @override
  Future<DataBatch<Station>> readCache() async =>
      cache == null ? empty() : await cache!.future;
  @override
  Future<DataBatch<Station>> refresh() {
    final request = Completer<DataBatch<Station>>();
    requests.add(request);
    return request.future;
  }
}

class Banners implements BannersRepository {
  @override
  Future<DataBatch<BannerItem>> readCache() async => empty();
  @override
  Future<DataBatch<BannerItem>> refresh() async => empty();
}

class Locations implements LocationsRepository {
  @override
  Future<DataBatch<LocationReference>> readCache() async => empty();
  @override
  Future<DataBatch<LocationReference>> refresh() async => empty();
}

class User implements UserRepository {
  @override
  Future<AppUser> currentUser() async => throw Exception('Unavailable profile');
}

class Preferences implements HomePreferencesRepository {
  @override
  Future<String?> readViewMode() async =>
      throw Exception('Unavailable preferences');
  @override
  Future<void> saveViewMode(String value) async =>
      throw Exception('Unavailable preferences');
}

void main() {
  test('late Home cache cannot overwrite a completed refresh', () async {
    final stations = Stations()..cache = Completer<DataBatch<Station>>();
    final controller =
        HomeController(stations, Banners(), Locations(), User(), Preferences());
    final refresh = controller.refresh();
    stations.requests.single.complete(empty());
    await refresh;
    stations.cache!.complete(empty());
    await pumpEventQueue();
    expect(stations.requests, hasLength(1));
    expect(controller.state.isOffline, false);
    controller.dispose();
  });
  test('dispose before cache completion starts no refresh', () async {
    final stations = Stations()..cache = Completer<DataBatch<Station>>();
    final controller =
        HomeController(stations, Banners(), Locations(), User(), Preferences());
    controller.dispose();
    stations.cache!.complete(empty());
    await pumpEventQueue();
    expect(stations.requests, isEmpty);
  });
  test('late saved layout cannot undo the user selection', () async {
    final stations = Stations();
    final preferences = DelayedPreferences();
    final controller =
        HomeController(stations, Banners(), Locations(), User(), preferences);
    await controller.setViewMode(StationViewMode.list);
    preferences.saved.complete('grid');
    await pumpEventQueue();
    expect(controller.state.viewMode, StationViewMode.list);
    stations.requests.single.complete(empty());
    await pumpEventQueue();
    controller.dispose();
  });
  test(
      'optional preference/profile failures still fetch stations; older failure cannot overwrite success',
      () async {
    final stations = Stations();
    final controller =
        HomeController(stations, Banners(), Locations(), User(), Preferences());
    await pumpEventQueue();
    expect(stations.requests.length, 1);
    final latest = controller.refresh();
    stations.requests.last.complete(empty());
    await latest;
    stations.requests.first.completeError(Exception('old failure'));
    await pumpEventQueue();
    expect(controller.state.failure, HomeFailure.none);
    expect(controller.state.isOffline, false);
    await controller.setViewMode(StationViewMode.list);
    expect(controller.state.viewMode, StationViewMode.list);
    controller.dispose();
  });
}

class DelayedPreferences extends Preferences {
  final saved = Completer<String?>();
  @override
  Future<String?> readViewMode() => saved.future;
}
