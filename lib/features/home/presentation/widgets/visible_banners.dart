import 'dart:async';
import 'package:flutter/material.dart';
import '../../domain/models/banner_item.dart';
import 'banner_carousel.dart';

class VisibleBanners extends StatefulWidget {
  const VisibleBanners(
      {required this.banners, this.clock = DateTime.now, super.key});
  final List<BannerItem> banners;
  final DateTime Function() clock;
  @override
  State<VisibleBanners> createState() => _VisibleBannersState();
}

class _VisibleBannersState extends State<VisibleBanners>
    with WidgetsBindingObserver {
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _schedule();
  }

  @override
  void didUpdateWidget(VisibleBanners oldWidget) {
    super.didUpdateWidget(oldWidget);
    _schedule();
  }

  void _schedule() {
    _timer?.cancel();
    final now = widget.clock();
    final boundaries = widget.banners
        .expand((banner) => [banner.startAt, banner.expiresAt])
        .whereType<DateTime>()
        .where((time) => time.isAfter(now))
        .toList()
      ..sort();
    if (boundaries.isNotEmpty) {
      _timer = Timer(boundaries.first.difference(now), () {
        if (mounted) {
          setState(() {});
          _schedule();
        }
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      setState(() {});
      _schedule();
    } else {
      _timer?.cancel();
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = widget.banners
        .where((banner) => banner.isVisibleAt(widget.clock()))
        .toList();
    if (visible.isEmpty) return const SizedBox.shrink();
    return BannerCarousel(
        key: ValueKey(visible.map((banner) => banner.id).join('|')),
        banners: visible);
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
