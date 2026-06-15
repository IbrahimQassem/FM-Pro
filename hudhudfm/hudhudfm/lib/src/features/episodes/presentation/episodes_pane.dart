import 'package:flutter/material.dart';

import '../../radio/domain/radio_info.dart';
import '../domain/episode.dart';
import '../domain/episode_repository.dart';

class EpisodesPane extends StatefulWidget {
  const EpisodesPane({
    super.key,
    required this.selectedRadio,
    required this.episodeRepository,
  });

  final RadioInfo? selectedRadio;
  final EpisodeRepository episodeRepository;

  @override
  State<EpisodesPane> createState() => _EpisodesPaneState();
}

class _EpisodesPaneState extends State<EpisodesPane> {
  Future<List<Episode>>? _episodesFuture;

  @override
  void initState() {
    super.initState();
    _loadEpisodes();
  }

  @override
  void didUpdateWidget(covariant EpisodesPane oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedRadio?.radioId != widget.selectedRadio?.radioId) {
      _loadEpisodes();
    }
  }

  void _loadEpisodes() {
    final radio = widget.selectedRadio;
    _episodesFuture = radio == null
        ? Future.value(const [])
        : widget.episodeRepository.fetchEpisodes(radio.radioId);
  }

  @override
  Widget build(BuildContext context) {
    final radio = widget.selectedRadio;
    if (radio == null) {
      return const _EmptyPane(
        icon: Icons.podcasts,
        title: 'اختر إذاعة',
        message: 'اختر إذاعة أولًا لعرض حلقاتها.',
      );
    }

    return FutureBuilder<List<Episode>>(
      future: _episodesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return _EmptyPane(
            icon: Icons.error_outline,
            title: 'تعذر تحميل الحلقات',
            message: 'حدث خطأ أثناء تحميل حلقات ${radio.name}.',
          );
        }

        final episodes = snapshot.data ?? const [];
        if (episodes.isEmpty) {
          return _EmptyPane(
            icon: Icons.podcasts,
            title: 'لا توجد حلقات',
            message: 'لا توجد حلقات متاحة حاليًا لإذاعة ${radio.name}.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: episodes.length,
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final episode = episodes[index];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.podcasts),
                title: Text(episode.name),
                subtitle: Text(
                  _subtitle(episode),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            );
          },
        );
      },
    );
  }

  String _subtitle(Episode episode) {
    final announcer = episode.announcer.isEmpty
        ? 'بدون مذيع'
        : episode.announcer;
    final time = episode.schedule.isEmpty
        ? 'بدون موعد'
        : '${episode.schedule.first.timeStart} - ${episode.schedule.first.timeEnd}';

    return '${episode.programName} · $announcer · $time';
  }
}

class _EmptyPane extends StatelessWidget {
  const _EmptyPane({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: colors.primary),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
