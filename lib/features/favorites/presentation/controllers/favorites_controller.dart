import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../account/domain/models/account_user.dart';
import '../../../account/domain/repositories/account_repository.dart';
import '../../domain/models/favorite_item.dart';
import '../../domain/repositories/favorites_repository.dart';
import 'favorites_state.dart';

enum FavoriteActionOutcome {
  successAdded,
  successRemoved,
  requireSignIn,
  requireEmailVerification,
  failed,
}

class FavoritesController extends StateNotifier<FavoritesState> {
  FavoritesController({
    required FavoritesRepository favoritesRepository,
    required AccountRepository accountRepository,
  })  : _favoritesRepository = favoritesRepository,
        _accountRepository = accountRepository,
        super(const FavoritesState()) {
    _init();
  }

  final FavoritesRepository _favoritesRepository;
  final AccountRepository _accountRepository;

  StreamSubscription<AccountUser?>? _accountSubscription;
  StreamSubscription<Set<String>>? _favoritesSubscription;
  AccountUser? _currentUser;

  void _init() {
    _accountSubscription = _accountRepository.watchAccount().listen((user) {
      if (user?.uid != _currentUser?.uid) {
        _currentUser = user;
        _onUserChanged(user);
      } else {
        _currentUser = user;
      }
    });
  }

  void _onUserChanged(AccountUser? user) {
    _favoritesSubscription?.cancel();
    _favoritesSubscription = null;

    if (user == null || user.uid.isEmpty) {
      state = const FavoritesState();
      return;
    }

    state = state.copyWith(isLoading: true, clearFailure: true);
    _favoritesSubscription = _favoritesRepository
        .watchFavoriteTargetIds(
          uid: user.uid,
          targetType: FavoriteTargetType.station,
        )
        .listen(
          (ids) {
            if (mounted) {
              state = state.copyWith(
                favoriteStationIds: ids,
                isLoading: false,
                clearFailure: true,
              );
            }
          },
          onError: (error) {
            if (mounted) {
              final failure = error is FavoritesException
                  ? error.failure
                  : FavoritesFailure.unknown;
              state = state.copyWith(isLoading: false, lastFailure: failure);
            }
          },
        );
  }

  Future<FavoriteActionOutcome> toggleFavoriteStation(String stationId) async {
    final user = _currentUser;
    if (user == null || user.uid.isEmpty) {
      return FavoriteActionOutcome.requireSignIn;
    }
    if (!user.emailVerified) {
      return FavoriteActionOutcome.requireEmailVerification;
    }

    final isCurrentlyFavorite = state.isFavorite(stationId);
    final previousFavorites = Set<String>.from(state.favoriteStationIds);
    final updatedFavorites = Set<String>.from(previousFavorites);

    if (isCurrentlyFavorite) {
      updatedFavorites.remove(stationId);
    } else {
      updatedFavorites.add(stationId);
    }

    // Optimistic update
    state = state.copyWith(
      favoriteStationIds: updatedFavorites,
      pendingStationIds: {...state.pendingStationIds, stationId},
      clearFailure: true,
    );

    try {
      if (isCurrentlyFavorite) {
        await _favoritesRepository.removeFavorite(
          uid: user.uid,
          targetType: FavoriteTargetType.station,
          targetId: stationId,
        );
      } else {
        await _favoritesRepository.addFavorite(
          uid: user.uid,
          targetType: FavoriteTargetType.station,
          targetId: stationId,
        );
      }

      if (mounted) {
        final pending = Set<String>.from(state.pendingStationIds)
          ..remove(stationId);
        state = state.copyWith(pendingStationIds: pending);
      }
      return isCurrentlyFavorite
          ? FavoriteActionOutcome.successRemoved
          : FavoriteActionOutcome.successAdded;
    } catch (e) {
      // Rollback on failure
      if (mounted) {
        final pending = Set<String>.from(state.pendingStationIds)
          ..remove(stationId);
        final failure =
            e is FavoritesException ? e.failure : FavoritesFailure.unknown;
        state = state.copyWith(
          favoriteStationIds: previousFavorites,
          pendingStationIds: pending,
          lastFailure: failure,
        );
      }
      return FavoriteActionOutcome.failed;
    }
  }

  @override
  void dispose() {
    _accountSubscription?.cancel();
    _favoritesSubscription?.cancel();
    super.dispose();
  }
}
