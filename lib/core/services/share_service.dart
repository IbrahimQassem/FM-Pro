import "dart:io";
import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:path_provider/path_provider.dart";
import "package:share_plus/share_plus.dart";

import "../config/app_config.dart";
import "../utils/store_url_helper.dart";
import "../../features/home/domain/models/station.dart";
import "../../features/station_content/domain/models/episode.dart";
import "../../l10n/generated/app_localizations.dart";

class ShareService {
  const ShareService({
    SharePlus? sharePlugin,
    Future<XFile?> Function()? mascotImageLoader,
  })  : _sharePlugin = sharePlugin,
        _mascotImageLoader = mascotImageLoader;

  final SharePlus? _sharePlugin;
  final Future<XFile?> Function()? _mascotImageLoader;

  SharePlus get _plugin => _sharePlugin ?? SharePlus.instance;

  static const String mascotShareAsset =
      "assets/images/branding/mascot_radio_placeholder.webp";

  String _resolveStoreUrl() {
    try {
      return StoreUrlHelper.getStoreUrl();
    } catch (_) {
      return AppConfig.domain;
    }
  }

  Future<XFile?> _defaultMascotLoader() async {
    if (Platform.environment.containsKey("FLUTTER_TEST")) {
      return null;
    }
    try {
      final byteData = await rootBundle
          .load(mascotShareAsset)
          .timeout(const Duration(seconds: 2));
      final buffer = byteData.buffer.asUint8List(
        byteData.offsetInBytes,
        byteData.lengthInBytes,
      );
      final tempDir = await getTemporaryDirectory();
      final file = File("${tempDir.path}/hudhud_fm_mascot.webp");
      if (!await file.exists() || (await file.length()) != buffer.length) {
        await file.writeAsBytes(buffer, flush: true);
      }
      return XFile(
        file.path,
        mimeType: "image/webp",
        name: "hudhud_fm_mascot.webp",
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> shareStation(BuildContext context, Station station) async {
    final strings = AppLocalizations.of(context);
    final text =
        strings.shareStationMessage(station.name, _resolveStoreUrl());
    final box = context.findRenderObject() as RenderBox?;
    final origin =
        box != null ? box.localToGlobal(Offset.zero) & box.size : null;

    try {
      await _plugin.share(
        ShareParams(
          text: text,
          subject: station.name,
          sharePositionOrigin: origin,
        ),
      );
    } on Object {
      if (context.mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).shareFailed)));
      }
    }
  }

  Future<void> shareEpisode(
    BuildContext context,
    Episode episode,
    Station station, {
    String? programTitle,
  }) async {
    final strings = AppLocalizations.of(context);
    final text = strings.shareEpisodeMessage(
      episode.title,
      programTitle ?? station.name,
      station.name,
      _resolveStoreUrl(),
    );
    final box = context.findRenderObject() as RenderBox?;
    final origin =
        box != null ? box.localToGlobal(Offset.zero) & box.size : null;

    try {
      await _plugin.share(
        ShareParams(
          text: text,
          subject: episode.title,
          sharePositionOrigin: origin,
        ),
      );
    } on Object {
      if (context.mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).shareFailed)));
      }
    }
  }

  Future<void> shareApp(BuildContext context) async {
    final strings = AppLocalizations.of(context);
    final text = strings.shareAppMessage(_resolveStoreUrl());
    final box = context.findRenderObject() as RenderBox?;
    final origin =
        box != null ? box.localToGlobal(Offset.zero) & box.size : null;

    final loader = _mascotImageLoader ?? _defaultMascotLoader;
    XFile? mascotFile;
    try {
      mascotFile = await loader();
    } catch (_) {
      mascotFile = null;
    }

    try {
      if (mascotFile != null) {
        try {
          await _plugin.share(
            ShareParams(
              text: text,
              subject: strings.shareAppTitle,
              files: [mascotFile],
              sharePositionOrigin: origin,
            ),
          );
          return;
        } catch (_) {
          // Fall back to text-only share if file sharing fails on device.
        }
      }

      await _plugin.share(
        ShareParams(
          text: text,
          subject: strings.shareAppTitle,
          sharePositionOrigin: origin,
        ),
      );
    } on Object {
      if (context.mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context).shareFailed)));
      }
    }
  }
}
