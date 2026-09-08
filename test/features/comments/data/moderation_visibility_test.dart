import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/features/comments/data/datasources/comments_firestore_data_source.dart';
import 'package:hudhud_fm/features/comments/data/repositories/firebase_comments_repository.dart';

// Read-only SDK snapshot fixture, following the account data-source test pattern.
// ignore: subtype_of_sealed_class
class CommentDocument implements QueryDocumentSnapshot<Map<String, dynamic>> {
  CommentDocument(this.id, this.status);
  @override
  final String id;
  final String status;
  @override
  Map<String, dynamic> data() => {
        'episodeId': 'e',
        'authorId': 'author',
        'authorName': 'Synthetic author',
        'content': 'Synthetic comment',
        'createdAt': Timestamp.fromDate(DateTime.utc(2026, 9, 8)),
        'isEdited': false,
        'status': status
      };
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class Snapshot implements QuerySnapshot<Map<String, dynamic>> {
  @override
  List<QueryDocumentSnapshot<Map<String, dynamic>>> get docs => [
        CommentDocument('visible', 'published'),
        CommentDocument('hidden', 'hidden'),
        CommentDocument('removed', 'removed'),
        CommentDocument('unknown', 'unknown')
      ];
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class Source implements CommentsFirestoreDataSource {
  @override
  Stream<QuerySnapshot<Map<String, dynamic>>> watchComments(String episodeId) =>
      Stream.value(Snapshot());
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test(
      'admin hidden and removed comments never enter the public presentation model',
      () async {
    final repository = FirebaseCommentsRepository(Source());
    final comments = await repository.watchComments('e').first;
    expect(comments.map((comment) => comment.id), ['visible']);
  });
}
