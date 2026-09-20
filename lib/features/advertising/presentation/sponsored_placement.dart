import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../app/providers.dart';
import '../../../l10n/generated/app_localizations.dart';
import '../domain/sponsored_ad.dart';

class SponsoredPlacement extends ConsumerStatefulWidget {
  const SponsoredPlacement({this.clock = DateTime.now, super.key});
  final DateTime Function() clock;
  @override
  ConsumerState<SponsoredPlacement> createState() => _SponsoredPlacementState();
}

class _SponsoredPlacementState extends ConsumerState<SponsoredPlacement>
    with WidgetsBindingObserver {
  final _bounds = GlobalKey();
  Timer? _timer;
  SponsoredAd? _ad;
  DateTime? _visibleSince;
  DateTime _nextFetch = DateTime.fromMillisecondsSinceEpoch(0);
  bool _fetching = false, _imageReady = false, _impression = false;
  bool get _foreground =>
      (WidgetsBinding.instance.lifecycleState == null ||
          WidgetsBinding.instance.lifecycleState ==
              AppLifecycleState.resumed) &&
      ModalRoute.of(context)?.isCurrent != false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(const Duration(milliseconds: 250), (_) => _tick());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _tick();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _visibleSince = null;
    if (state == AppLifecycleState.resumed) _tick();
  }

  void _tick() {
    if (!mounted) return;
    final now = widget.clock();
    if (_ad != null && !now.isBefore(_ad!.expiresAt)) {
      setState(() => _ad = null);
      _visibleSince = null;
    }
    if (!_foreground) {
      _visibleSince = null;
      return;
    }
    if (!_fetching && !now.isBefore(_nextFetch)) unawaited(_load());
    if (_ad == null || !_imageReady || _impression || !_visible()) {
      _visibleSince = null;
      return;
    }
    _visibleSince ??= now;
    if (now.difference(_visibleSince!) >= const Duration(seconds: 1)) {
      _impression = true;
      unawaited(_record(_ad!, 'impression'));
    }
  }

  bool _visible() {
    final box = _bounds.currentContext?.findRenderObject();
    if (box is! RenderBox || !box.hasSize || box.size.isEmpty) return false;
    final rectangle = box.localToGlobal(Offset.zero) & box.size;
    final viewport = Offset.zero & MediaQuery.sizeOf(context);
    final visible = rectangle.intersect(viewport);
    return !visible.isEmpty &&
        visible.width * visible.height >=
            rectangle.width * rectangle.height / 2;
  }

  Future<void> _load() async {
    _fetching = true;
    _nextFetch = widget.clock().add(const Duration(minutes: 1));
    try {
      final ad = await ref.read(advertisingRepositoryProvider).load();
      if (!mounted || !_foreground) return;
      setState(() {
        _ad = ad;
        _imageReady = ad?.imageUrl.isEmpty ?? false;
        _impression = false;
        _visibleSince = null;
      });
    } on Object {
      /* A missing/unavailable Firebase environment hides the slot. */
    } finally {
      _fetching = false;
    }
  }

  Future<void> _record(SponsoredAd ad, String event) async {
    try {
      await ref
          .read(advertisingRepositoryProvider)
          .record(ad.deliveryId, event);
    } on Object {/* Isolated optional service. */}
  }

  Future<void> _open(SponsoredAd ad) async {
    if (!_foreground ||
        !widget.clock().isBefore(ad.expiresAt) ||
        !isSafeAdUrl(ad.targetUrl)) {
      return;
    }
    unawaited(_record(ad, 'click'));
    try {
      if (await launchUrl(Uri.parse(ad.targetUrl),
          mode: LaunchMode.externalApplication)) {
        return;
      }
    } on Object {
      /* Show the same localized failure for unavailable handlers. */
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(AppLocalizations.of(context).advertisementLinkFailed)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final ad = _ad;
    if (ad == null) return const SizedBox.shrink();
    final colors = Theme.of(context).colorScheme;
    final strings = AppLocalizations.of(context);
    return Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: Material(
          key: _bounds,
          color: colors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(20),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: ad.targetUrl.isEmpty ? null : () => unawaited(_open(ad)),
            child: Semantics(
                label:
                    ad.targetUrl.isEmpty ? null : strings.advertisementOpenLink,
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (ad.imageUrl.isNotEmpty)
                        Image.network(ad.imageUrl,
                            height: 140, fit: BoxFit.cover, cacheWidth: 1080,
                            frameBuilder: (context, child, frame, synchronous) {
                          if ((frame != null || synchronous) && !_imageReady) {
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              if (mounted && _ad?.deliveryId == ad.deliveryId) {
                                _imageReady = true;
                              }
                            });
                          }
                          return child;
                        }, errorBuilder: (context, error, stack) {
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (mounted && _ad?.deliveryId == ad.deliveryId) {
                              setState(() => _ad = null);
                            }
                          });
                          return const SizedBox.shrink();
                        }),
                      Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${strings.advertisement} · ${ad.sponsor}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelMedium),
                                const SizedBox(height: 6),
                                Text(ad.title,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium),
                                if (ad.body.isNotEmpty) Text(ad.body),
                                if (ad.targetUrl.isNotEmpty)
                                  Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(strings.advertisementOpenLink,
                                          style: TextStyle(
                                              color: colors.primary))),
                              ])),
                    ])),
          ),
        ));
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
