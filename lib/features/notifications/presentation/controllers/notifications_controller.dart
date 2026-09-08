import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/models/app_notification.dart';
import '../../domain/repositories/notifications_repository.dart';
import 'notifications_state.dart';

class NotificationsController extends StateNotifier<NotificationsState> {
  NotificationsController(this._repository)
      : super(const NotificationsState()) {
    _subscription = _repository.incomingNotifications.listen(_onNotification);
    unawaited(_initialize());
  }

  final NotificationsRepository _repository;
  int _generation = 0;
  final Set<String> _openedEvents = {};
  late final StreamSubscription<AppNotification> _subscription;

  Future<void> retry() => _initialize();

  Future<void> _initialize() async {
    final generation = ++_generation;
    state = state.copyWith(isLoading: true);
    try {
      final preference = await _repository.initialize();
      if (mounted && generation == _generation) {
        state = state.copyWith(
          permission: preference.permission,
          isEnabled: preference.isEnabled,
          isLoading: false,
          hasFailure: false,
        );
      }
    } on Object {
      if (mounted && generation == _generation) {
        state = state.copyWith(isLoading: false, hasFailure: true);
      }
    }
  }

  Future<void> setEnabled(bool enabled) async {
    if (state.isLoading) return;
    final generation = ++_generation;
    state = state.copyWith(isLoading: true, hasFailure: false);
    try {
      final preference = await _repository.setEnabled(enabled);
      if (mounted && generation == _generation) {
        state = state.copyWith(
          permission: preference.permission,
          isEnabled: preference.isEnabled,
          isLoading: false,
        );
      }
    } on Object {
      if (mounted && generation == _generation) {
        state = state.copyWith(isLoading: false, hasFailure: true);
      }
    }
  }

  void _onNotification(AppNotification message) {
    if (!mounted) return;
    if (message.openRequested &&
        message.target != null &&
        !_openedEvents.add(message.id)) {
      return;
    }
    final messages = [
      message,
      ...state.messages.where((item) => item.id != message.id),
    ].take(20).toList(growable: false);
    state = state.copyWith(messages: messages);
  }

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    unawaited(_repository.dispose());
    super.dispose();
  }
}
