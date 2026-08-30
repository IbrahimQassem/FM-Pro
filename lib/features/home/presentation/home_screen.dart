import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../account/presentation/account_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../player/presentation/widgets/mini_player.dart';
import '../../station_details/presentation/station_details_screen.dart';
import '../domain/models/station.dart';
import 'widgets/home_view.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(homeControllerProvider);
    final controller = ref.read(homeControllerProvider.notifier);
    final playerState = ref.watch(stationPlayerControllerProvider);
    final playerController = ref.read(stationPlayerControllerProvider.notifier);
    ref.watch(notificationsControllerProvider);

    ref.listen(accountControllerProvider, (previous, next) {
      if (previous?.user?.uid != next.user?.uid) {
        unawaited(controller.refreshUser());
      }
    });

    ref.listen(notificationsControllerProvider, (previous, next) {
      final latest = next.latest;
      if (latest == null || previous?.latest?.id == latest.id) return;
      final text = latest.title.isEmpty ? latest.body : latest.title;
      if (text.isEmpty) return;
      final messenger = ScaffoldMessenger.of(context);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(text)));
    });

    void openStation(Station station) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (context) => StationDetailsScreen(station: station),
        ),
      );
    }

    Future<void> openAccount() async {
      await Navigator.of(
        context,
      ).push(MaterialPageRoute<void>(builder: (_) => const AccountScreen()));
      await controller.refreshUser();
    }

    void openNotifications() {
      Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
      );
    }

    return HomeView(
      state: state,
      onRefresh: controller.refresh,
      onSearchChanged: controller.updateSearch,
      onCitySelected: controller.selectCity,
      onViewModeChanged: controller.setViewMode,
      onNotificationsPressed: openNotifications,
      onSettingsPressed: openAccount,
      onStationPressed: openStation,
      onStationPlayPressed: playerController.play,
      playerBar: !playerState.hasSelection
          ? null
          : MiniPlayer(
              state: playerState,
              onOpen: () => openStation(playerState.station!),
              onToggle: playerController.toggleCurrent,
              onStop: playerController.stop,
            ),
    );
  }
}
