class StationSubscription {
  const StationSubscription(
      {required this.stationId,
      required this.isActive,
      required this.notificationsEnabled});
  final String stationId;
  final bool isActive;
  final bool notificationsEnabled;
}

class SubscriptionBatch {
  const SubscriptionBatch(this.items, {this.isOffline = false});
  final Map<String, StationSubscription> items;
  final bool isOffline;
}

enum SubscriptionOutcome {
  saved,
  signIn,
  verifyEmail,
  permissionDenied,
  failed,
  ignored
}

abstract interface class StationSubscriptionsRepository {
  Stream<SubscriptionBatch> watch(String uid);
  Future<void> set(
      {required String stationId,
      required bool isActive,
      required bool notificationsEnabled});
  Future<bool> enableDeviceAlerts();
  Future<void> reconcileDevice({required bool enabled});
  Future<void> dispose();
}
