class AudioPlaybackItem {
  const AudioPlaybackItem({
    required this.id,
    required this.title,
    required this.streamUrls,
    this.artworkUrl = '',
    this.album = '',
    this.isLive = true,
  });

  final bool isLive;
  final String id;
  final String title;
  final List<String> streamUrls;
  final String artworkUrl;
  final String album;
}
