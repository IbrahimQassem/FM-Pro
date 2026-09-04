import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/models/favorite_item.dart';
import '../../domain/repositories/favorites_repository.dart';
import '../datasources/favorites_firestore_data_source.dart';

class FirebaseFavoritesRepository implements FavoritesRepository {
  const FirebaseFavoritesRepository(this._dataSource);

  final FavoritesFirestoreDataSource _dataSource;

  @override
  Stream<Set<String>> watchFavoriteTargetIds({
    required String uid,
    required FavoriteTargetType targetType,
  }) {
    if (uid.isEmpty) return Stream.value(const <String>{});
    return _dataSource
        .watchFavoriteTargetIds(uid: uid, targetType: targetType)
        .handleError((error) {
      if (error is FirebaseException) {
        if (error.code == 'permission-denied') {
          throw const FavoritesException(FavoritesFailure.unauthenticated);
        }
        throw const FavoritesException(FavoritesFailure.server);
      }
      throw const FavoritesException(FavoritesFailure.unknown);
    });
  }

  @override
  Future<void> addFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  }) async {
    if (uid.isEmpty) {
      throw const FavoritesException(FavoritesFailure.unauthenticated);
    }
    final cleanTargetId = targetId.trim();
    if (cleanTargetId.isEmpty || cleanTargetId.length > 128) {
      throw const FavoritesException(FavoritesFailure.unknown);
    }
    try {
      await _dataSource.addFavorite(
        uid: uid,
        targetType: targetType,
        targetId: cleanTargetId,
      );
    } on FirebaseException catch (e) {
      if (e.code == 'permission-denied') {
        throw const FavoritesException(FavoritesFailure.unauthenticated);
      }
      if (e.code == 'unavailable') {
        throw const FavoritesException(FavoritesFailure.network);
      }
      throw const FavoritesException(FavoritesFailure.server);
    } catch (_) {
      throw const FavoritesException(FavoritesFailure.unknown);
    }
  }

  @override
  Future<void> removeFavorite({
    required String uid,
    required FavoriteTargetType targetType,
    required String targetId,
  }) async {
    if (uid.isEmpty) {
      throw const FavoritesException(FavoritesFailure.unauthenticated);
    }
    final cleanTargetId = targetId.trim();
    if (cleanTargetId.isEmpty || cleanTargetId.length > 128) {
      throw const FavoritesException(FavoritesFailure.unknown);
    }
    try {
      await _dataSource.removeFavorite(
        uid: uid,
        targetType: targetType,
        targetId: cleanTargetId,
      );
    } on FirebaseException catch (e) {
      if (e.code == 'permission-denied') {
        throw const FavoritesException(FavoritesFailure.unauthenticated);
      }
      if (e.code == 'unavailable') {
        throw const FavoritesException(FavoritesFailure.network);
      }
      throw const FavoritesException(FavoritesFailure.server);
    } catch (_) {
      throw const FavoritesException(FavoritesFailure.unknown);
    }
  }
}
