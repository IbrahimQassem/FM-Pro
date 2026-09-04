import 'package:flutter/material.dart';

import '../../../core/widgets/mascot_feedback_view.dart';
import '../../../l10n/generated/app_localizations.dart';

class FirebaseSetupScreen extends StatelessWidget {
  const FirebaseSetupScreen({required this.onRetry, super.key});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: MascotFeedbackView(
          imageAsset: 'assets/images/mascot/mascot_offline.webp',
          title: strings.firebaseSetupTitle,
          subtitle: strings.firebaseSetupMessage,
          actionLabel: strings.retry,
          onAction: onRetry,
        ),
      ),
    );
  }
}
