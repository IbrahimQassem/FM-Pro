import 'dart:async';

import 'package:flutter/material.dart';

import '../application/player_controller.dart';

class PlayerBar extends StatelessWidget {
  const PlayerBar({super.key, required this.controller});

  final PlayerController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final currentRadio = controller.currentRadio;
        final colors = Theme.of(context).colorScheme;

        return Material(
          color: colors.surface,
          elevation: 8,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: colors.primaryContainer,
                    child: Icon(Icons.graphic_eq, color: colors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          currentRadio?.name ?? 'لا يوجد بث قيد التشغيل',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _statusLabel(controller.status),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filledTonal(
                    tooltip: controller.isPlaying ? 'إيقاف مؤقت' : 'تشغيل',
                    onPressed: currentRadio == null
                        ? null
                        : () {
                            if (controller.isPlaying) {
                              unawaited(controller.pause());
                            } else {
                              unawaited(controller.resume());
                            }
                          },
                    icon: Icon(
                      controller.isPlaying ? Icons.pause : Icons.play_arrow,
                    ),
                  ),
                  IconButton(
                    tooltip: 'إيقاف',
                    onPressed: currentRadio == null
                        ? null
                        : () => unawaited(controller.stop()),
                    icon: const Icon(Icons.stop),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _statusLabel(PlaybackStatus status) {
    return switch (status) {
      PlaybackStatus.idle => 'اختر إذاعة لبدء البث',
      PlaybackStatus.loading => 'جاري تجهيز البث',
      PlaybackStatus.playing => 'يعمل الآن',
      PlaybackStatus.paused => 'متوقف مؤقتًا',
      PlaybackStatus.failed => 'تعذر تشغيل البث',
    };
  }
}
