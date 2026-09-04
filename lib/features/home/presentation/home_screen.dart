import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../../favorites/presentation/controllers/favorites_controller.dart';
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
    ref.watch(favoritesControllerProvider);
    final favoritesController = ref.read(favoritesControllerProvider.notifier);
    ref.watch(notificationsControllerProvider);

    // Synchronize favorite IDs with HomeState
    ref.listen(favoritesControllerProvider, (previous, next) {
      if (previous?.favoriteStationIds != next.favoriteStationIds) {
        controller.updateFavoriteStationIds(next.favoriteStationIds);
      }
    });

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

    Future<void> handleFavoriteToggle(Station station) async {
      final strings = AppLocalizations.of(context);
      final messenger = ScaffoldMessenger.of(context);
      final outcome = await favoritesController.toggleFavoriteStation(station.id);
      switch (outcome) {
        case FavoriteActionOutcome.successAdded:
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(
              content: Text(strings.favoriteAddedMessage),
              duration: const Duration(seconds: 2),
            ),
          );
          break;
        case FavoriteActionOutcome.successRemoved:
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(
              content: Text(strings.favoriteRemovedMessage),
              duration: const Duration(seconds: 2),
            ),
          );
          break;
        case FavoriteActionOutcome.requireSignIn:
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(
              content: Text(strings.signInToFavoritePrompt),
              action: SnackBarAction(
                label: strings.signIn,
                onPressed: openAccount,
              ),
            ),
          );
          break;
        case FavoriteActionOutcome.requireEmailVerification:
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(
              content: Text(strings.verifyEmailToFavoritePrompt),
              action: SnackBarAction(
                label: strings.verifyEmail,
                onPressed: openAccount,
              ),
            ),
          );
          break;
        case FavoriteActionOutcome.failed:
          messenger.hideCurrentSnackBar();
          messenger.showSnackBar(
            SnackBar(content: Text(strings.favoriteActionFailed)),
          );
          break;
      }
    }

    return HomeView(
      state: state,
      onRefresh: controller.refresh,
      onSearchChanged: controller.updateSearch,
      onCitySelected: controller.selectCity,
      onFavoritesFilterToggled: controller.toggleFavoritesFilter,
      onFavoriteToggle: handleFavoriteToggle,
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
