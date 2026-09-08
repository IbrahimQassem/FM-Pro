import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../account/presentation/account_screen.dart';
import '../domain/station_subscription.dart';

class StationFollowControls extends ConsumerWidget {
  const StationFollowControls({required this.stationId, super.key});
  final String stationId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(stationSubscriptionsControllerProvider);
    final controller =
        ref.read(stationSubscriptionsControllerProvider.notifier);
    final strings = AppLocalizations.of(context);
    final subscription = state.items[stationId];
    final active = subscription?.isActive == true;
    final busy = state.loading || state.pending.contains(stationId);
    Future<void> change({required bool active, bool alerts = false}) async {
      final result =
          await controller.set(stationId, active: active, alerts: alerts);
      if (!context.mounted) return;
      if (result == SubscriptionOutcome.signIn ||
          result == SubscriptionOutcome.verifyEmail) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(result == SubscriptionOutcome.signIn
                ? strings.signInToFollow
                : strings.verifyToFollow)));
        await Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const AccountScreen()));
        return;
      }
      final message = switch (result) {
        SubscriptionOutcome.saved => strings.followSaved,
        SubscriptionOutcome.permissionDenied => strings.stationAlertsDenied,
        SubscriptionOutcome.failed => strings.followFailed,
        _ => null,
      };
      if (message != null) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message)));
      }
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      FilledButton.tonalIcon(
        key: Key('station-follow-$stationId'),
        onPressed: busy ? null : () => change(active: !active),
        icon: Icon(active ? Icons.check : Icons.add),
        label: Text(busy
            ? strings.followSaving
            : active
                ? strings.unfollowStation
                : strings.followStation),
      ),
      if (active)
        SwitchListTile.adaptive(
          contentPadding: EdgeInsets.zero,
          title: Text(strings.stationEpisodeAlerts),
          subtitle: Text(strings.stationEpisodeAlertsDescription),
          value: subscription!.notificationsEnabled,
          onChanged:
              busy ? null : (value) => change(active: true, alerts: value),
        ),
      if (state.failed)
        TextButton(
            onPressed: busy ? null : controller.retry,
            child: Text(strings.followRetry)),
      if (state.offline)
        Text(strings.followOffline,
            style: Theme.of(context).textTheme.bodySmall),
    ]);
  }
}
