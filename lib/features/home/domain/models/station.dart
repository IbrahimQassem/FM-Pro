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
}
