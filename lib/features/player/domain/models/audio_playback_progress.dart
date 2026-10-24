/// Native progress for one loaded source; no URL or catalog-duration fallback.
class AudioPlaybackProgress {
  const AudioPlaybackProgress({
    this.itemId,
    this.position = Duration.zero,
    this.duration,
    this.isLive = true,
    this.seekFailed = false,
  });

  final String? itemId;
  final Duration position;
  final Duration? duration;
  final bool isLive;
  final bool seekFailed;

  bool get canSeek =>
      itemId?.isNotEmpty == true &&
      !isLive &&
      !seekFailed &&
      duration != null &&
      duration! > Duration.zero;

  Duration clampPosition(Duration value) {
    if (value < Duration.zero) return Duration.zero;
    final total = duration;
    if (total != null && total > Duration.zero && value > total) return total;
    return value;
  }
}
