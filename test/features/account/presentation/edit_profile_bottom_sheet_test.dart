import 'dart:ui' as ui;
import 'package:hudhud_fm/features/account/domain/services/profile_image_picker.dart';
import 'dart:typed_data';
import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:hudhud_fm/app/providers.dart";
import "package:hudhud_fm/features/account/domain/models/account_sign_in_provider.dart";
import "package:hudhud_fm/features/account/domain/models/account_user.dart";
import "package:hudhud_fm/features/account/domain/repositories/account_repository.dart";
import "package:hudhud_fm/features/account/presentation/widgets/edit_profile_bottom_sheet.dart";
import "package:hudhud_fm/l10n/generated/app_localizations.dart";

void main() {
  testWidgets(
      'gallery selection previews and forwards image bytes; cancellation preserves selection',
      (tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final bytes = (await tester.runAsync(() async {
      final recorder = ui.PictureRecorder();
      Canvas(recorder).drawColor(Colors.red, BlendMode.src);
      final picture = recorder.endRecording();
      final image = await picture.toImage(2, 2);
      final bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!
          .buffer
          .asUint8List();
      image.dispose();
      picture.dispose();
      return bytes;
    }))!;
    final picker = _FakeImagePicker(bytes);
    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository, picker: picker));
    await tester.pumpAndSettle();
    await tester.tap(find.text('اختيار من المعرض'));
    await tester.pumpAndSettle();
    expect(picker.source, ProfileImageSource.gallery);
    picker.bytes = null;
    await tester.tap(find.text('التقاط صورة'));
    await tester.pumpAndSettle();
    expect(picker.source, ProfileImageSource.camera);
    await tester.tap(find.byKey(const Key('save-profile-button')));
    await tester.pumpAndSettle();
    expect(repository.updatedPhotoBytes, bytes);
    expect(repository.updatedPhotoUrl, isNull);
  });

  testWidgets("edits profile name and chooses mascot avatar", (tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final repository = _FakeAccountRepository();
    await tester.pumpWidget(_TestApp(repository: repository));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("edit-display-name")), findsOneWidget);
    expect(find.text("Old Name"), findsOneWidget);

    await tester.enterText(
      find.byKey(const Key("edit-display-name")),
      "New Name",
    );
    await tester.tap(find.byKey(const Key("mascot-avatar-2")));
    await tester.pump();

    await tester.tap(find.byKey(const Key("save-profile-button")));
    await tester.pumpAndSettle();

    expect(repository.updatedDisplayName, "New Name");
    expect(
      repository.updatedPhotoUrl,
      "assets/images/mascot/mascot_empty_favorites.webp",
    );
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp({required this.repository, this.picker});

  final ProfileImagePicker? picker;

  final AccountRepository repository;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [
        accountRepositoryProvider.overrideWithValue(repository),
        if (picker != null)
          profileImagePickerProvider.overrideWithValue(picker!)
      ],
      child: const MaterialApp(
        locale: Locale("ar"),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: Scaffold(
          body: EditProfileBottomSheet(
            user: AccountUser(
              uid: "user-1",
              displayName: "Old Name",
              email: "old@example.com",
            ),
          ),
        ),
      ),
    );
  }
}

class _FakeAccountRepository implements AccountRepository {
  String? updatedDisplayName;
  String? updatedPhotoUrl;
  Uint8List? updatedPhotoBytes;

  @override
  Stream<AccountUser?> watchAccount() => Stream.value(null);

  @override
  Future<void> continueWithProvider(AccountSignInProvider provider) async {}
  @override
  Future<void> deleteAccount({String? currentPassword}) async {}
  @override
  Future<void> requestEmailVerificationCode({String? email}) async {}
  @override
  Future<void> verifyEmailCode(String code) async {}
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
  Future<void> updateProfile({
    required String displayName,
    String? photoUrl,
    Uint8List? photoBytes,
  }) async {
    updatedDisplayName = displayName;
    updatedPhotoUrl = photoUrl;
    updatedPhotoBytes = photoBytes;
  }
}

class _FakeImagePicker implements ProfileImagePicker {
  _FakeImagePicker(this.bytes);
  Uint8List? bytes;
  ProfileImageSource? source;
  @override
  Future<Uint8List?> pick(ProfileImageSource source) async {
    this.source = source;
    return bytes;
  }
}
