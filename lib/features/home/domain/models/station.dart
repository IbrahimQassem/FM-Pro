class Station {
  const Station({
    required this.id,
    required this.name,
    required this.streamUrl,
    required this.countryCode,
    required this.countryNameAr,
    required this.cityCode,
    required this.cityNameAr,
    required this.priority,
    required this.isLive,
    required this.isActive,
    required this.isVerified,
    required this.isFeatured,
    required this.programsCount,
    required this.subscribersCount,
    required this.totalPlays,
    this.nameEn = '',
    this.tagline = '',
    this.description = '',
    this.backupStreamUrl = '',
    this.logoUrl = '',
    this.thumbnailUrl = '',
    this.frequency = '',
    this.websiteUrl = '',
    this.facebookUrl = '',
    this.instagramUrl = '',
    this.youtubeUrl = '',
    this.twitterUrl = '',
    this.whatsapp = '',
    this.healthStatus = '',
    this.lastCheckedAt,
    this.streamHealthSource = 'primary',
    this.consecutiveFailures = 0,
  });

  final String id;
  final String name;
  final String nameEn;
  final String tagline;
  final String description;
  final String streamUrl;
  final String backupStreamUrl;
  final String logoUrl;
  final String thumbnailUrl;
  final String frequency;
  final String websiteUrl;
  final String facebookUrl;
  final String instagramUrl;
  final String youtubeUrl;
  final String twitterUrl;
  final String whatsapp;
  final String countryCode;
  final String countryNameAr;
  final String cityCode;
  final String cityNameAr;
  final int priority;
  final bool isLive;
  final bool isActive;
  final bool isVerified;
  final bool isFeatured;
  final int programsCount;
  final int subscribersCount;
  final int totalPlays;
  final String healthStatus;
  final DateTime? lastCheckedAt;
  final String streamHealthSource;
  final int consecutiveFailures;

  StationStreamHealthState resolveStreamHealthState({
    DateTime? now,
    Duration freshnessThreshold = const Duration(minutes: 45),
    bool hasDeviceConnectionError = false,
  }) {
    if (hasDeviceConnectionError) {
      return StationStreamHealthState.deviceConnectionError;
    }
    if (streamUrl.isEmpty && backupStreamUrl.isEmpty) {
      return StationStreamHealthState.noOnlineSource;
    }
    if (lastCheckedAt == null) {
      return StationStreamHealthState.unverified;
    }
    final currentTime = now ?? DateTime.now();
    if (currentTime.difference(lastCheckedAt!).abs() > freshnessThreshold) {
      return StationStreamHealthState.unverified;
    }
    if (healthStatus == 'offline' || consecutiveFailures >= 3) {
      return StationStreamHealthState.temporarilyStopped;
    }
    if (healthStatus == 'degraded') {
      if (streamHealthSource == 'backup') {
        return StationStreamHealthState.backupAvailable;
      }
      return StationStreamHealthState.unstable;
    }
    if (healthStatus == 'online') {
      return StationStreamHealthState.available;
    }
    return StationStreamHealthState.unverified;
  }

  StationStreamHealthState get streamHealthState => resolveStreamHealthState();
}

enum StationStreamHealthState {
  available,
  backupAvailable,
  unstable,
  temporarilyStopped,
  unverified,
  noOnlineSource,
  deviceConnectionError,
}
