import "package:hudhud_fm/features/comments/presentation/widgets/ugc_guidelines_dialog.dart";
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/app/providers.dart';
import 'package:hudhud_fm/features/account/domain/models/account_user.dart';
import 'package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart';
import 'package:hudhud_fm/features/account/domain/repositories/account_repository.dart';
import 'package:hudhud_fm/features/comments/domain/models/episode_comment.dart';
import 'package:hudhud_fm/features/comments/domain/repositories/comments_repository.dart';
import 'package:hudhud_fm/features/comments/presentation/episode_comments_screen.dart';
import 'package:hudhud_fm/features/station_content/domain/models/episode.dart';
import 'package:hudhud_fm/l10n/generated/app_localizations.dart';

void main() {
  testWidgets('requires explicit UGC terms acceptance before composing', (
    tester,
  ) async {
    final commentsRepository = _FakeCommentsRepository();
    await tester.pumpWidget(_TestApp(commentsRepository: commentsRepository));
    await tester.pumpAndSettle();

    expect(find.text('شروط المشاركة مطلوبة'), findsOneWidget);
    expect(find.byKey(const Key('comment-input')), findsNothing);

    await tester.tap(find.byKey(const Key('comments-open-ugc-terms')));
    await tester.pumpAndSettle();
    expect(find.text('شروط المشاركة والتعليقات'), findsOneWidget);
    expect(find.textContaining('لا تنشر تهديدًا أو تحرشًا'), findsOneWidget);

    await tester.tap(find.text('إلغاء'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('comment-input')), findsNothing);

    await tester.tap(find.byKey(const Key('comments-open-ugc-terms')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('comments-accept-ugc-terms')));
    await tester.pumpAndSettle();

    expect(commentsRepository.didAcceptTerms, isTrue);
    expect(find.byKey(const Key('comment-input')), findsOneWidget);
    expect(find.byKey(const Key('comments-review-ugc-terms')), findsOneWidget);
  });

  testWidgets('shows snackbar when terms acceptance fails and stays on terms gate', (
    tester,
  ) async {
    final commentsRepository = _FakeCommentsRepository();
    commentsRepository.throwOnAcceptTerms = true;
    await tester.pumpWidget(_TestApp(commentsRepository: commentsRepository));
    await tester.pumpAndSettle();

    expect(find.text('شروط المشاركة مطلوبة'), findsOneWidget);
    expect(find.byKey(const Key('comment-input')), findsNothing);

    await tester.tap(find.byKey(const Key('comments-open-ugc-terms')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('comments-accept-ugc-terms')), findsOneWidget);

    await tester.tap(find.byKey(const Key('comments-accept-ugc-terms')));
    await tester.pumpAndSettle();

    expect(commentsRepository.didAcceptTerms, isFalse);
    expect(find.byKey(const Key('comment-input')), findsNothing);
    expect(find.byType(SnackBar), findsOneWidget);
    expect(
      find.text('تعذر حفظ موافقتك الآن. تحقق من الاتصال وحاول مرة أخرى.'),
      findsAtLeastNWidgets(1),
    );
  });

  testWidgets('UGC terms remain usable on a small screen at 200% text scale', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(640, 1136);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      _TestApp(
        commentsRepository: _FakeCommentsRepository(),
        textScaler: const TextScaler.linear(2),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.tap(find.byKey(const Key('comments-open-ugc-terms')));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.byKey(const Key('comments-accept-ugc-terms')), findsOneWidget);
  });

  testWidgets('reports and blocks another comment author with undo', (
    tester,
  ) async {
    final repository = _FakeCommentsRepository(initialComments: [_comment]);
    repository.didAcceptTerms = true;
    await tester.pumpWidget(_TestApp(commentsRepository: repository));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('comment-actions-comment-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('الإبلاغ عن التعليق'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('comment-report-details')),
      'تفاصيل آمنة',
    );
    await tester.tap(find.byKey(const Key('submit-comment-report')));
    await tester.pumpAndSettle();
    expect(repository.reportedComment?.id, 'comment-2');
    expect(find.text('تم إرسال البلاغ إلى فريق الإشراف.'), findsOneWidget);

    await tester.tap(find.byKey(const Key('comment-actions-comment-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('الإبلاغ عن المستخدم'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('submit-comment-report')));
    await tester.pumpAndSettle();
    expect(repository.reportedUserId, 'user-2');

    await tester.tap(find.byKey(const Key('comment-actions-comment-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حظر المستخدم'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirm-block-user')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(repository.blockedAuthorIds, {'user-2'});
    expect(find.text('تعليق يحتاج مراجعة'), findsNothing);

    tester.widget<SnackBarAction>(find.byType(SnackBarAction)).onPressed();
    await tester.pumpAndSettle();
    expect(repository.blockedAuthorIds, isEmpty);
    expect(find.text('تعليق يحتاج مراجعة'), findsOneWidget);
  });

  testWidgets('comment safety actions fit a small screen at 200% text scale', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(640, 1136);
    tester.view.devicePixelRatio = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = _FakeCommentsRepository(initialComments: [_comment]);
    repository.didAcceptTerms = true;

    await tester.pumpWidget(
      _TestApp(
        commentsRepository: repository,
        textScaler: const TextScaler.linear(2),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.tap(find.byKey(const Key('comment-actions-comment-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('الإبلاغ عن التعليق'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('submit-comment-report')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('displays mascot empty comments state when there are no comments', (
    tester,
  ) async {
    final repository = _FakeCommentsRepository(initialComments: []);
    repository.didAcceptTerms = true;

    await tester.pumpWidget(_TestApp(commentsRepository: repository));
    await tester.pumpAndSettle();

    expect(find.text('لا توجد تعليقات بعد'), findsOneWidget);
    expect(
      find.text('كن أول من يشارك برأيه ويبدأ النقاش حول هذه الحلقة!'),
      findsOneWidget,
    );
  });

  testWidgets('UgcGuidelinesDialog displays mascot and rules correctly', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        locale: Locale('ar'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: Scaffold(
          body: UgcGuidelinesDialog(allowAcceptance: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('شروط المشاركة والتعليقات'), findsOneWidget);
    expect(find.text('إرشادات هدهد لمجتمع محترم وآمن'), findsOneWidget);
    expect(find.textContaining('لا تنشر تهديدًا أو تحرشًا'), findsOneWidget);
    expect(find.byKey(const Key('comments-accept-ugc-terms')), findsOneWidget);
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp({required this.commentsRepository, this.textScaler});

  final CommentsRepository commentsRepository;
  final TextScaler? textScaler;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [
        accountRepositoryProvider.overrideWithValue(_FakeAccountRepository()),
        commentsRepositoryProvider.overrideWithValue(commentsRepository),
      ],
      child: MaterialApp(
        locale: const Locale('ar'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        builder: textScaler == null
            ? null
            : (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(textScaler: textScaler),
                child: child!,
              ),
        home: EpisodeCommentsScreen(episode: _episode),
      ),
    );
  }
}

class _FakeAccountRepository implements AccountRepository {
  @override
  Future<void> deleteAccount({String? currentPassword}) async {}

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {}

  @override
  Future<void> requestEmailVerificationCode({String? email}) async {}

  @override
  Future<void> verifyEmailCode(String code) async {}

  @override
  Stream<AccountUser?> watchAccount() => Stream.value(_accountUser);

  @override
  Future<void> register({
    required String displayName,
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> sendPasswordReset(String email) async {}

  @override
  Future<void> signIn({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signOut() async {}

  @override
  Future<void> updateProfile({required String displayName, String? photoUrl}) async {}
}

class _FakeCommentsRepository implements CommentsRepository {
  _FakeCommentsRepository({this.initialComments = const []});

  final List<EpisodeComment> initialComments;
  bool didAcceptTerms = false;
  bool throwOnAcceptTerms = false;
  final Set<String> blockedAuthorIds = {};
  EpisodeComment? reportedComment;
  String? reportedUserId;

  @override
  Stream<List<EpisodeComment>> watchComments(String episodeId) =>
      Stream.value(initialComments);

  @override
  Future<bool> hasAcceptedCurrentTerms() async => didAcceptTerms;

  @override
  Future<void> acceptCurrentTerms() async {
    if (throwOnAcceptTerms) {
      throw Exception('Failed to save terms');
    }
    didAcceptTerms = true;
  }

  @override
  Future<Set<String>> loadBlockedAuthorIds() async =>
      Set<String>.of(blockedAuthorIds);

  @override
  Future<void> addComment({
    required String episodeId,
    required String content,
  }) async {}

  @override
  Future<void> reportComment({
    required EpisodeComment comment,
    required CommentReportReason reason,
    required String details,
  }) async {
    reportedComment = comment;
  }

  @override
  Future<void> reportUser({
    required EpisodeComment sourceComment,
    required CommentReportReason reason,
    required String details,
  }) async {
    reportedUserId = sourceComment.authorId;
  }

  @override
  Future<void> blockAuthor(String authorId) async {
    blockedAuthorIds.add(authorId);
  }

  @override
  Future<void> unblockAuthor(String authorId) async {
    blockedAuthorIds.remove(authorId);
  }
}

final _comment = EpisodeComment(
  id: 'comment-2',
  episodeId: 'episode-1',
  authorId: 'user-2',
  authorName: 'مستمع آخر',
  content: 'تعليق يحتاج مراجعة',
  createdAt: DateTime.utc(2026, 9, 1),
  isEdited: false,
);

const _accountUser = AccountUser(
  uid: 'user-1',
  displayName: 'Listener',
  email: 'listener@example.com',
  emailVerified: true,
);

final _episode = Episode(
  id: 'episode-1',
  programId: 'program-1',
  stationId: 'station-1',
  title: 'حلقة تجريبية',
  audioUrl: 'https://audio.example.com/episode.mp3',
  durationSeconds: 1200,
  priority: 1,
  isPublished: true,
  isFeatured: false,
  broadcastAt: DateTime.utc(2026, 9, 1),
  utcOffsetMinutes: 180,
  playsCount: 0,
  likesCount: 0,
  commentsCount: 0,
);
