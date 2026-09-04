import 'package:flutter/material.dart';

class HomeEmptyState extends StatelessWidget {
  const HomeEmptyState({
    required this.title,
    required this.message,
    this.icon,
    this.imageAsset,
    this.actionLabel,
    this.onAction,
    super.key,
  });

  final IconData? icon;
  final String? imageAsset;
  final String title;
  final String message;
  final String? actionLabel;
  final Future<void> Function()? onAction;

  @override
  Widget build(BuildContext context) {
    return SliverFillRemaining(
      hasScrollBody: false,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (imageAsset != null)
                Image.asset(
                  imageAsset!,
                  height: 150,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Icon(
                    icon ?? Icons.radio_outlined,
                    size: 64,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                )
              else if (icon != null)
                Icon(
                  icon,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
              const SizedBox(height: 18),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              if (actionLabel != null && onAction != null) ...[
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: onAction,
                  icon: const Icon(Icons.refresh_rounded),
                  label: Text(actionLabel!),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
