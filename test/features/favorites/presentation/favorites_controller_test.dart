import 'dart:typed_data';
import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/account/domain/repositories/account_repository.dart';
import 'package:hudhud_fm/features/favorites/domain/models/favorite_item.dart';
import 'package:hudhud_fm/features/favorites/domain/repositories/favorites_repository.dart';
import 'package:hudhud_fm/features/favorites/presentation/controllers/favorites_controller.dart';

class FakeFavoritesRepository implements FavoritesRepository {
  final Set<String> currentFavorites = {};
  bool shouldFail = false;
  final Map<String, Completer<void>> delayed = {};
  int watchCalls = 0;
  int writeCalls = 0;
  final StreamController<Set<String>> _controller =
      StreamController<Set<String>>.broadcast();

  @override
  Stream<Set<String>> watchFavoriteTargetIds({
    required String uid,
    required FavoriteTargetType targetType,
  }) {
    watchCalls++;
    return _controller.stream;
  }

  void emit(Set<String> ids) {
    currentFavorites
      ..clear()
      ..addAll(ids);
    _controller.add(Set<String>.from(ids));
  }

  @override
  Future<void> addFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  }) async {
    writeCalls++;
    if (delayed[targetId] case final pending?) {
      await pending.future;
    }
    if (shouldFail) {
      throw const FavoritesException(FavoritesFailure.network);
    }
    currentFavorites.add(targetId);
    _controller.add(Set<String>.from(currentFavorites));
  }

  @override
  Future<void> removeFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  }) async {
    writeCalls++;
    if (delayed[targetId] case final pending?) {
      await pending.future;
    }
    if (shouldFail) {
      throw const FavoritesException(FavoritesFailure.network);
    }
    currentFavorites.remove(targetId);
    _controller.add(Set<String>.from(currentFavorites));
  }
}

class FakeAccountRepository implements AccountRepository {
  final StreamController<AccountUser?> _userController =
      StreamController<AccountUser?>.broadcast();

  void emitUser(AccountUser? user) {
    _userController.add(user);
  }

  @override
  Stream<AccountUser?> watchAccount() => _userController.stream;

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {}

  @override
  Future<void> deleteAccount({String? currentPassword}) async {}

  @override
  Future<void> register(
      {required String displayName,
      required String email,
      required String password}) async {}

  @override
  Future<void> requestEmailVerificationCode({String? email}) async {}

  @override
  Future<void> sendPasswordReset(String email) async {}

  @override
  Future<void> signIn(
      {required String email, required String password}) async {}

  @override
  Future<void> signOut() async {}

  @override
  Future<void> verifyEmailCode(String code) async {}

  @override
  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
    Uint8List? photoBytes,
  }) async {}
}

void main() {
  late FakeFavoritesRepository favoritesRepo;
  late FakeAccountRepository accountRepo;
  late FavoritesController controller;

  setUp(() {
    favoritesRepo = FakeFavoritesRepository();
    accountRepo = FakeAccountRepository();
    controller = FavoritesController(
      favoritesRepository: favoritesRepo,
      accountRepository: accountRepo,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  const userA = AccountUser(
      uid: 'a', displayName: 'A', email: 'a@example.test', emailVerified: true);
  const userB = AccountUser(
      uid: 'b', displayName: 'B', email: 'b@example.test', emailVerified: true);
  test('clears A immediately and ignores a failed A write after switching to B',
      () async {
    accountRepo.emitUser(userA);
    await pumpEventQueue();
    favoritesRepo.emit({'saved-a'});
    await pumpEventQueue();
    favoritesRepo.delayed['pending-a'] = Completer<void>();
    final action = controller.toggleFavoriteStation('pending-a');
    accountRepo.emitUser(userB);
    await pumpEventQueue();
    expect(controller.state.favoriteStationIds, isEmpty);
    expect(controller.state.pendingStationIds, isEmpty);
    favoritesRepo.emit({'saved-b'});
    await pumpEventQueue();
    favoritesRepo.delayed['pending-a']!.completeError(Exception('failure'));
    expect(await action, FavoriteActionOutcome.ignored);
    expect(controller.state.favoriteStationIds, {'saved-b'});
  });
  test('a failed target does not roll back another successful target',
      () async {
    accountRepo.emitUser(userA);
    await pumpEventQueue();
    favoritesRepo.delayed['a'] = Completer<void>();
    final action = controller.toggleFavoriteStation('a');
    expect(await controller.toggleFavoriteStation('a'),
        FavoriteActionOutcome.ignored);
    await controller.toggleFavoriteStation('b');
    favoritesRepo.delayed['a']!.completeError(Exception('failure'));
    await action;
    expect(controller.state.favoriteStationIds, {'b'});
    expect(favoritesRepo.writeCalls, 2);
  });
  test('verification change for the same UID starts a new eligible listener',
      () async {
    accountRepo.emitUser(
        const AccountUser(uid: 'a', displayName: 'A', email: 'a@example.test'));
    await pumpEventQueue();
    expect(favoritesRepo.watchCalls, 0);
    accountRepo.emitUser(userA);
    await pumpEventQueue();
    expect(favoritesRepo.watchCalls, 1);
  });

  test('requires sign in when guest tries to toggle favorite', () async {
    final outcome = await controller.toggleFavoriteStation('sanaa');
    expect(outcome, FavoriteActionOutcome.requireSignIn);
    expect(controller.state.favoriteStationIds, isEmpty);
  });

  test('requires email verification when account is unverified', () async {
    accountRepo.emitUser(
      const AccountUser(
        uid: 'user_1',
        displayName: 'User',
        email: 'user@test.com',
        emailVerified: false,
      ),
    );
    await pumpEventQueue();

    final outcome = await controller.toggleFavoriteStation('sanaa');
    expect(outcome, FavoriteActionOutcome.requireEmailVerification);
    expect(controller.state.favoriteStationIds, isEmpty);
  });

  test('adds and removes favorite with optimistic update for verified user',
      () async {
    accountRepo.emitUser(
      const AccountUser(
        uid: 'user_1',
        displayName: 'User',
        email: 'user@test.com',
        emailVerified: true,
      ),
    );
    await pumpEventQueue();

    // Add to favorites
    final addOutcome = await controller.toggleFavoriteStation('sanaa');
    expect(addOutcome, FavoriteActionOutcome.successAdded);
    expect(controller.state.isFavorite('sanaa'), isTrue);

    // Remove from favorites
    final removeOutcome = await controller.toggleFavoriteStation('sanaa');
    expect(removeOutcome, FavoriteActionOutcome.successRemoved);
    expect(controller.state.isFavorite('sanaa'), isFalse);
  });

  test('rolls back state when repository throws error', () async {
    accountRepo.emitUser(
      const AccountUser(
        uid: 'user_1',
        displayName: 'User',
        email: 'user@test.com',
        emailVerified: true,
      ),
    );
    await pumpEventQueue();

    favoritesRepo.shouldFail = true;
    final outcome = await controller.toggleFavoriteStation('sanaa');
    expect(outcome, FavoriteActionOutcome.failed);
    expect(controller.state.isFavorite('sanaa'), isFalse);
    expect(controller.state.lastFailure, FavoritesFailure.network);
  });

  test('clears favorites when user logs out', () async {
    accountRepo.emitUser(
      const AccountUser(
        uid: 'user_1',
        displayName: 'User',
        email: 'user@test.com',
        emailVerified: true,
      ),
    );
    await pumpEventQueue();

    await controller.toggleFavoriteStation('sanaa');
    expect(controller.state.isFavorite('sanaa'), isTrue);

    // Log out
    accountRepo.emitUser(null);
    await pumpEventQueue();

    expect(controller.state.favoriteStationIds, isEmpty);
  });
}
