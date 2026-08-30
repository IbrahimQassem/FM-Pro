import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../../core/config/firestore_paths.dart';

class CommentsFirestoreDataSource {
  const CommentsFirestoreDataSource(this._firestore, this._auth);

  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  Stream<QuerySnapshot<Map<String, dynamic>>> watchComments(String episodeId) {
    return FirestorePaths.episodeComments(
      _firestore,
      episodeId,
    ).orderBy('createdAt', descending: true).limit(100).snapshots();
  }

  Future<void> addComment({
    required String episodeId,
    required String content,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw const CommentAuthRequiredException();

    final userSnapshot = await FirestorePaths.users(
      _firestore,
    ).doc(user.uid).get();
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
    });
  }
}

class CommentAuthRequiredException implements Exception {
  const CommentAuthRequiredException();
}

class CommentProfileUnavailableException implements Exception {
  const CommentProfileUnavailableException();
}
