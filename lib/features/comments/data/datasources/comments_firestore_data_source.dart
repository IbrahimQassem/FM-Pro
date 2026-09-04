import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../../core/config/firestore_paths.dart';
import '../../domain/models/episode_comment.dart';
import '../../domain/repositories/comments_repository.dart';

class CommentsFirestoreDataSource {
  const CommentsFirestoreDataSource(this._firestore, this._auth);

  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  Stream<QuerySnapshot<Map<String, dynamic>>> watchComments(String episodeId) {
    return FirestorePaths.episodeComments(_firestore, episodeId)
        .where('status', isEqualTo: 'published')
        .orderBy('createdAt', descending: true)
        .limit(100)
        .snapshots();
  }

  Future<Set<String>> loadBlockedAuthorIds() async {
    final user = _auth.currentUser;
    if (user == null) return const <String>{};
    final snapshot = await FirestorePaths.blockedUsers(
      _firestore,
      user.uid,
    ).get();
    return snapshot.docs.map((document) => document.id).toSet();
  }

  Future<bool> hasAcceptedCurrentTerms() async {
    final user = _auth.currentUser;
    if (user == null) return false;
    final snapshot = await FirestorePaths.ugcAgreement(
      _firestore,
      user.uid,
    ).get();
    return snapshot.data()?['termsVersion'] == currentUgcTermsVersion;
  }

  Future<void> acceptCurrentTerms() async {
    final user = _auth.currentUser;
    if (user == null) throw const CommentAuthRequiredException();
    try {
      await user.reload();
      await user.getIdToken(true);
    } on Object {
      // Best-effort token refresh.
    }

    try {
      final userDoc = FirestorePaths.users(_firestore).doc(user.uid);
      final userSnapshot = await userDoc.get();
      if (!userSnapshot.exists) {
        final displayName = user.displayName?.trim().isNotEmpty == true
            ? user.displayName!.trim()
            : (user.email?.split('@').first ?? 'Listener');
        await userDoc.set({
          'displayName': displayName,
          'username': '',
          'avatarUrl': user.photoURL ?? '',
          'isActive': true,
          'role': 'listener',
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    } on Object {
      // Best-effort profile provisioning.
    }

    await FirestorePaths.ugcAgreement(_firestore, user.uid).set({
      'termsVersion': currentUgcTermsVersion,
      'acceptedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> addComment({
    required String episodeId,
    required String content,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw const CommentAuthRequiredException();
    if (!await hasAcceptedCurrentTerms()) {
      throw const CommentTermsAcceptanceRequiredException();
    }

    final userRef = FirestorePaths.users(_firestore).doc(user.uid);
    var userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      final displayName = user.displayName?.trim().isNotEmpty == true
          ? user.displayName!.trim()
          : (user.email?.split('@').first ?? 'Listener');
      try {
        await userRef.set({
          'displayName': displayName,
          'username': '',
          'avatarUrl': user.photoURL ?? '',
          'isActive': true,
          'role': 'listener',
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
        userSnapshot = await userRef.get();
      } on Object {
        // Fallback to existing check below.
      }
    }
    final profile = userSnapshot.data();
    final displayName = profile?['displayName'];
    final isActive = profile?['isActive'];
    if (displayName is! String ||
        displayName.trim().isEmpty ||
        isActive != true) {
      throw const CommentProfileUnavailableException();
    }

    await FirestorePaths.episodeComments(_firestore, episodeId).add({
      'episodeId': episodeId,
      'authorId': user.uid,
      'authorName': displayName.trim(),
      'content': content.trim(),
      'createdAt': FieldValue.serverTimestamp(),
      'isEdited': false,
      'status': 'published',
    });
  }

  Future<void> reportComment({
    required EpisodeComment comment,
    required CommentReportReason reason,
    required String details,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw const CommentAuthRequiredException();
    final report = FirestorePaths.commentReports(
      _firestore,
      user.uid,
      comment.episodeId,
    ).doc(comment.id);
    await _firestore.runTransaction((transaction) async {
      if ((await transaction.get(report)).exists) {
        throw const CommentAlreadyReportedException();
      }
      transaction.set(report, {
        'targetType': 'comment',
        'episodeId': comment.episodeId,
        'commentId': comment.id,
        'reportedAuthorId': comment.authorId,
        'reason': reason.name,
        'details': details.trim(),
        'status': 'open',
        'createdAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> reportUser({
    required EpisodeComment sourceComment,
    required CommentReportReason reason,
    required String details,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw const CommentAuthRequiredException();
    final report = FirestorePaths.userReport(
      _firestore,
      user.uid,
      sourceComment.authorId,
      sourceComment.id,
    );
    await _firestore.runTransaction((transaction) async {
      if ((await transaction.get(report)).exists) {
        throw const CommentAlreadyReportedException();
      }
      transaction.set(report, {
        'targetType': 'user',
        'episodeId': sourceComment.episodeId,
        'commentId': sourceComment.id,
        'reportedAuthorId': sourceComment.authorId,
        'reason': reason.name,
        'details': details.trim(),
        'status': 'open',
        'createdAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> blockAuthor(String authorId) async {
    final user = _auth.currentUser;
    if (user == null) throw const CommentAuthRequiredException();
    if (authorId.isEmpty || authorId == user.uid) {
      throw const CommentModerationInputException();
    }
    final block = FirestorePaths.blockedUsers(
      _firestore,
      user.uid,
    ).doc(authorId);
    await _firestore.runTransaction((transaction) async {
      if ((await transaction.get(block)).exists) return;
      transaction.set(block, {
        'blockedUserId': authorId,
        'createdAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> unblockAuthor(String authorId) async {
    final user = _auth.currentUser;
    if (user == null) throw const CommentAuthRequiredException();
    await FirestorePaths.blockedUsers(
      _firestore,
      user.uid,
    ).doc(authorId).delete();
  }
}

class CommentAuthRequiredException implements Exception {
  const CommentAuthRequiredException();
}

class CommentProfileUnavailableException implements Exception {
  const CommentProfileUnavailableException();
}

class CommentTermsAcceptanceRequiredException implements Exception {
  const CommentTermsAcceptanceRequiredException();
}

class CommentAlreadyReportedException implements Exception {
  const CommentAlreadyReportedException();
}

class CommentModerationInputException implements Exception {
  const CommentModerationInputException();
}
