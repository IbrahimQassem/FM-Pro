import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hudhudfm/src/app/app_theme.dart';
import 'package:hudhudfm/src/features/version/presentation/force_update_screen.dart';

void main() {
  testWidgets('shows current and required build numbers', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Directionality(
          textDirection: TextDirection.rtl,
          child: ForceUpdateScreen(requiredVersion: 9, currentVersion: 4),
        ),
      ),
    );

    expect(find.text('يتطلب التطبيق تحديثًا'), findsOneWidget);
    expect(find.text('الإصدار الحالي: 4 · المطلوب: 9'), findsOneWidget);
  });
}
