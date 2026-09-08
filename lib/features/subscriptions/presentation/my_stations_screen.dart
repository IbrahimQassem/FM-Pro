import '../../home/presentation/controllers/home_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../station_details/presentation/station_details_screen.dart';
import '../../account/presentation/account_screen.dart';
import 'station_follow_controls.dart';

class MyStationsScreen extends ConsumerWidget {
  const MyStationsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = AppLocalizations.of(context);
    final account = ref.watch(accountControllerProvider).user;
    final subscriptions = ref.watch(stationSubscriptionsControllerProvider);
    final home = ref.watch(homeControllerProvider);
    final followed =
        subscriptions.items.values.where((item) => item.isActive).toList();
    final stations = {for (final station in home.stations) station.id: station};
    return Scaffold(
        appBar: AppBar(title: Text(strings.myStations)),
        body: account?.emailVerified != true
            ? Center(
                child: FilledButton(
                    onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const AccountScreen())),
                    child: Text(account == null
                        ? strings.signInToFollow
                        : strings.verifyToFollow)))
            : subscriptions.loading || home.isInitialLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () async {
                      ref
                          .read(stationSubscriptionsControllerProvider.notifier)
                          .retry();
                      await ref.read(homeControllerProvider.notifier).refresh();
                    },
                    child: ListView(
                        padding: const EdgeInsets.all(16),
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          if (subscriptions.offline || home.isOffline)
                            Text(strings.followOffline),
                          if (subscriptions.failed ||
                              home.failure != HomeFailure.none)
                            TextButton(
                                onPressed: () {
                                  ref
                                      .read(
                                          stationSubscriptionsControllerProvider
                                              .notifier)
                                      .retry();
                                  ref
                                      .read(homeControllerProvider.notifier)
                                      .refresh();
                                },
                                child: Text(strings.followRetry)),
                          if (followed.isEmpty && !subscriptions.failed)
                            Padding(
                                padding: const EdgeInsets.all(24),
                                child: Text(strings.myStationsEmpty,
                                    textAlign: TextAlign.center)),
                          for (final item in followed)
                            Card(
                                child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(children: [
                                      ListTile(
                                          title: Text(stations[item.stationId]
                                                  ?.name ??
                                              strings.followStationUnavailable),
                                          trailing: stations
                                                  .containsKey(item.stationId)
                                              ? const Icon(Icons.chevron_right)
                                              : null,
                                          onTap: stations.containsKey(item.stationId)
                                              ? () => Navigator.of(context)
                                                  .push(MaterialPageRoute<void>(
                                                      builder: (_) =>
                                                          StationDetailsScreen(
                                                              station:
                                                                  stations[item.stationId]!)))
                                              : null),
                                      StationFollowControls(
                                          stationId: item.stationId),
                                    ]))),
                        ])));
  }
}
