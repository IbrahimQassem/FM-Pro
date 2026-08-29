class AudioPlaybackItem {
  const AudioPlaybackItem({
    required this.id,
    required this.title,
    required this.streamUrls,
    this.artworkUrl = '',
    this.album = '',
  });

  final String id;
  final String title;
  final List<String> streamUrls;
  final String artworkUrl;
  final String album;
}
