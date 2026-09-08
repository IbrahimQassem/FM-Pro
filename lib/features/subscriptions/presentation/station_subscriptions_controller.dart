import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../account/domain/models/account_user.dart';
import '../../account/domain/repositories/account_repository.dart';
import '../domain/station_subscription.dart';

class StationSubscriptionsState {
  const StationSubscriptionsState(
      {this.items = const {},
      this.pending = const {},
      this.loading = false,
      this.failed = false,
      this.offline = false});
  final Map<String, StationSubscription> items;
  final Set<String> pending;
  final bool loading;
  final bool failed;
  final bool offline;
  StationSubscriptionsState copyWith(
          {Map<String, StationSubscription>? items,
          Set<String>? pending,
          bool? loading,
          bool? failed,
          bool? offline}) =>
      StationSubscriptionsState(
          items: items ?? this.items,
          pending: pending ?? this.pending,
          loading: loading ?? this.loading,
          failed: failed ?? this.failed,
          offline: offline ?? this.offline);
}

class StationSubscriptionsController
    extends StateNotifier<StationSubscriptionsState> {
  StationSubscriptionsController(this._repository, AccountRepository accounts)
      : super(const StationSubscriptionsState()) {
    _accounts = accounts.watchAccount().listen((user) {
      final changed = user?.uid != _user?.uid ||
          user?.emailVerified != _user?.emailVerified;
      _user = user;
      if (changed) retry();
    }, onError: (Object _) {
      if (mounted) {
        _user = null;
        ++_generation;
        unawaited(_subscription?.cancel());
        state = const StationSubscriptionsState(failed: true);
      }
    });
  }
  final StationSubscriptionsRepository _repository;
  late final StreamSubscription<AccountUser?> _accounts;
  StreamSubscription<SubscriptionBatch>? _subscription;
  AccountUser? _user;
  int _generation = 0;
  void retry() {
    final generation = ++_generation;
    unawaited(_subscription?.cancel());
    state = const StationSubscriptionsState();
    final user = _user;
    if (user == null || !user.emailVerified) {
      unawaited(_repository
          .reconcileDevice(enabled: false)
          .catchError((Object _) {}));
      return;
    }
    state = const StationSubscriptionsState(loading: true);
    _subscription = _repository.watch(user.uid).listen((batch) {
      if (!mounted || generation != _generation) return;
      state = state.copyWith(
          items: batch.items,
          loading: false,
          failed: false,
          offline: batch.isOffline);
      unawaited(reconcileDevice());
    }, onError: (Object _) {
      if (mounted && generation == _generation) {
        state = state.copyWith(loading: false, failed: true);
      }
    });
  }

  Future<void> reconcileDevice() async {
    final generation = _generation;
    try {
      await _repository.reconcileDevice(
          enabled: state.items.values
              .any((item) => item.isActive && item.notificationsEnabled));
    } on Object {
      if (mounted && generation == _generation) {
        state = state.copyWith(failed: true);
      }
    }
  }

  Future<SubscriptionOutcome> set(String stationId,
      {required bool active, bool alerts = false}) async {
    if (_user == null) return SubscriptionOutcome.signIn;
    if (!_user!.emailVerified) return SubscriptionOutcome.verifyEmail;
    if (state.pending.contains(stationId) || state.loading) {
      return SubscriptionOutcome.ignored;
    }
    final generation = _generation;
    state =
        state.copyWith(pending: {...state.pending, stationId}, failed: false);
    try {
      if (active && alerts && !await _repository.enableDeviceAlerts()) {
        return SubscriptionOutcome.permissionDenied;
      }
      if (!mounted || generation != _generation) {
        return SubscriptionOutcome.ignored;
      }
      await _repository.set(
          stationId: stationId,
          isActive: active,
          notificationsEnabled: active && alerts);
      if (!mounted || generation != _generation) {
        return SubscriptionOutcome.ignored;
      }
      state = state.copyWith(items: {
        ...state.items,
        stationId: StationSubscription(
            stationId: stationId,
            isActive: active,
            notificationsEnabled: active && alerts)
      });
      return SubscriptionOutcome.saved;
    } on Object {
      if (!mounted || generation != _generation) {
        return SubscriptionOutcome.ignored;
      }
      state = state.copyWith(failed: true);
      return SubscriptionOutcome.failed;
    } finally {
      if (mounted && generation == _generation) {
        state = state.copyWith(pending: {...state.pending}..remove(stationId));
      }
    }
  }

  @override
  void dispose() {
    ++_generation;
    unawaited(_accounts.cancel());
    unawaited(_subscription?.cancel());
    super.dispose();
  }
}
