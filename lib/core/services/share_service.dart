import "package:flutter/material.dart";
import "package:share_plus/share_plus.dart";

import "../../features/home/domain/models/station.dart";
import "../../features/station_content/domain/models/episode.dart";
import "../../l10n/generated/app_localizations.dart";

class ShareService {
  const ShareService({SharePlus? sharePlugin}) : _sharePlugin = sharePlugin;

  final SharePlus? _sharePlugin;

  SharePlus get _plugin => _sharePlugin ?? SharePlus.instance;

  Future<void> shareStation(BuildContext context, Station station) async {
    final strings = AppLocalizations.of(context);
    final text = strings.shareStationMessage(station.name, station.streamUrl);
    final box = context.findRenderObject() as RenderBox?;
    final origin = box != null ? box.localToGlobal(Offset.zero) & box.size : null;

    await _plugin.share(
      ShareParams(
        text: text,
        subject: station.name,
        sharePositionOrigin: origin,
      ),
    );
  }

  Future<void> shareEpisode(
    BuildContext context,
    Episode episode,
    Station station,
  ) async {
    final strings = AppLocalizations.of(context);
    final text = strings.shareEpisodeMessage(
      episode.title,
      station.name,
      station.name,
      episode.audioUrl,
    );
    final box = context.findRenderObject() as RenderBox?;
    final origin = box != null ? box.localToGlobal(Offset.zero) & box.size : null;

    await _plugin.share(
      ShareParams(
        text: text,
        subject: episode.title,
        sharePositionOrigin: origin,
      ),
    );
  }
  Future<void> shareApp(BuildContext context) async {
    final strings = AppLocalizations.of(context);
    final text = strings.shareAppMessage;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box != null ? box.localToGlobal(Offset.zero) & box.size : null;

    await _plugin.share(
      ShareParams(
        text: text,
        subject: strings.shareAppTitle,
        sharePositionOrigin: origin,
      ),
    );
  }
}
