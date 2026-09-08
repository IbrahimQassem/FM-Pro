import '../domain/station_subscription.dart';
import 'station_subscriptions_data_source.dart';
import 'station_alert_device_data_source.dart';

class FirebaseStationSubscriptionsRepository
    implements StationSubscriptionsRepository {
  FirebaseStationSubscriptionsRepository(this._source, this._devices);
  final StationSubscriptionsDataSource _source;
  final StationAlertDeviceDataSource _devices;
  @override
  Stream<SubscriptionBatch> watch(String uid) => _source.watch(uid);
  @override
  Future<void> set(
          {required String stationId,
          required bool isActive,
          required bool notificationsEnabled}) =>
      _source.set(
          stationId: stationId,
          isActive: isActive,
          notificationsEnabled: notificationsEnabled);
  @override
  Future<bool> enableDeviceAlerts() => _devices.enable();
  @override
  Future<void> reconcileDevice({required bool enabled}) =>
      _devices.reconcile(enabled: enabled);
  @override
  Future<void> dispose() async {}
}
