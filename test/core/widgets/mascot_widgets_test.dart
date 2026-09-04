import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/widgets/mascot_avatar.dart';
import 'package:hudhud_fm/core/widgets/mascot_feedback_view.dart';

void main() {
  group('MascotFeedbackView', () {
    testWidgets('renders title, subtitle and triggers action', (tester) async {
      var actionTriggered = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MascotFeedbackView(
              imageAsset: 'assets/images/mascot/mascot_empty_comments.webp',
              title: 'لا توجد تعليقات بعد',
              subtitle: 'كن أول من يشارك برأيه',
              actionLabel: 'إعادة المحاولة',
              onAction: () => actionTriggered = true,
            ),
          ),
        ),
      );

      expect(find.text('لا توجد تعليقات بعد'), findsOneWidget);
      expect(find.text('كن أول من يشارك برأيه'), findsOneWidget);
      expect(find.text('إعادة المحاولة'), findsOneWidget);

      await tester.tap(find.text('إعادة المحاولة'));
      expect(actionTriggered, isTrue);
    });

    testWidgets('renders cleanly at 200% text scale without overflow', (tester) async {
      tester.view.physicalSize = const Size(640, 1136);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: const TextScaler.linear(2.0),
            ),
            child: child!,
          ),
          home: const Scaffold(
            body: MascotFeedbackView(
              imageAsset: 'assets/images/mascot/mascot_offline.webp',
              title: 'انقطع الاتصال بالبث',
              subtitle: 'يبدو أن إشارة الراديو انقطعت مؤقتًا',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('MascotAvatar', () {
    testWidgets('renders with default fallback asset', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: MascotAvatar(radius: 32),
            ),
          ),
        ),
      );

      expect(find.byType(MascotAvatar), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
