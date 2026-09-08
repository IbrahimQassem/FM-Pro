import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/subscriptions/domain/station_subscription.dart';
import 'package:hudhud_fm/features/subscriptions/presentation/station_subscriptions_controller.dart';
import '../favorites/presentation/favorites_controller_test.dart'
    show FakeAccountRepository;

class FakeSubscriptions implements StationSubscriptionsRepository {
  final streams = <String, StreamController<SubscriptionBatch>>{};
  Completer<void>? pending;
  bool permission = true;
  bool fail = false;
  int writes = 0;
  @override
  Stream<SubscriptionBatch> watch(String uid) =>
      (streams[uid] ??= StreamController.broadcast()).stream;
  @override
  Future<void> set(
      {required String stationId,
      required bool isActive,
      required bool notificationsEnabled}) async {
    writes++;
    await pending?.future;
    if (fail) throw Exception('failure');
  }

  @override
  Future<bool> enableDeviceAlerts() async => permission;
  @override
  Future<void> reconcileDevice({required bool enabled}) async {}
  @override
  Future<void> dispose() async {
    for (final stream in streams.values) {
      await stream.close();
    }
  }
}

void main() {
  late FakeAccountRepository accounts;
  late FakeSubscriptions repository;
  late StationSubscriptionsController controller;
  const a = AccountUser(
      uid: 'a', displayName: 'A', email: 'a@example.test', emailVerified: true);
  const b = AccountUser(
      uid: 'b', displayName: 'B', email: 'b@example.test', emailVerified: true);
  Future<void> signIn(AccountUser user) async {
    accounts.emitUser(user);
    await pumpEventQueue();
    repository.streams[user.uid]!.add(const SubscriptionBatch({}));
    await pumpEventQueue();
  }

  setUp(() {
    accounts = FakeAccountRepository();
    repository = FakeSubscriptions();
    controller = StationSubscriptionsController(repository, accounts);
  });
  tearDown(() async {
    controller.dispose();
    await repository.dispose();
  });
  test('guest and unverified cannot mutate', () async {
    expect(await controller.set('s', active: true), SubscriptionOutcome.signIn);
    accounts.emitUser(
        const AccountUser(uid: 'a', displayName: 'A', email: 'a@example.test'));
    await pumpEventQueue();
    expect(await controller.set('s', active: true),
        SubscriptionOutcome.verifyEmail);
    expect(repository.writes, 0);
  });
  test(
      'follow defaults alerts off; denial preserves follow; unfollow disables alerts',
      () async {
    await signIn(a);
    await controller.set('s', active: true);
    expect(controller.state.items['s']!.notificationsEnabled, false);
    repository.permission = false;
    expect(await controller.set('s', active: true, alerts: true),
        SubscriptionOutcome.permissionDenied);
    expect(controller.state.items['s']!.isActive, true);
    expect(repository.writes, 1);
    await controller.set('s', active: false);
    expect(controller.state.items['s']!.isActive, false);
  });
  test(
      'pending prevents repeats and stale completion cannot change a new account',
      () async {
    await signIn(a);
    repository.pending = Completer<void>();
    final action = controller.set('s', active: true);
    expect(
        await controller.set('s', active: true), SubscriptionOutcome.ignored);
    await signIn(b);
    repository.pending!.complete();
    expect(await action, SubscriptionOutcome.ignored);
    expect(controller.state.items, isEmpty);
  });
  test('failed write retains confirmed follow and clears pending', () async {
    await signIn(a);
    await controller.set('s', active: true);
    repository.fail = true;
    expect(
        await controller.set('s', active: false), SubscriptionOutcome.failed);
    expect(controller.state.items['s']!.isActive, true);
    expect(controller.state.pending, isEmpty);
  });
}
