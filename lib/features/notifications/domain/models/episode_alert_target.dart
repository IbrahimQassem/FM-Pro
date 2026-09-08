class EpisodeAlertTarget {
  const EpisodeAlertTarget(
      {required this.root,
      required this.eventId,
      required this.stationId,
      required this.programId,
      required this.episodeId});
  final String root;
  final String eventId;
  final String stationId;
  final String programId;
  final String episodeId;
  static EpisodeAlertTarget? parse(Map<String, dynamic> data,
      {required String expectedRoot}) {
    bool id(dynamic value) =>
        value is String &&
        value.isNotEmpty &&
        value.length <= 128 &&
        !value.contains('/') &&
        value != '.' &&
        value != '..';
    if (data['version'] != '1' ||
        data['type'] != 'episode' ||
        data['root'] != expectedRoot ||
        !['HudHudDev', 'HudHudOfficial'].contains(expectedRoot) ||
        !id(data['stationId']) ||
        !id(data['programId']) ||
        !id(data['episodeId']) ||
        data['eventId'] != '$expectedRoot:${data['episodeId']}') {
      return null;
    }
    return EpisodeAlertTarget(
        root: expectedRoot,
        eventId: data['eventId'] as String,
        stationId: data['stationId'] as String,
        programId: data['programId'] as String,
        episodeId: data['episodeId'] as String);
  }
}
