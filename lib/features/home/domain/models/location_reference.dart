class LocationReference {
  const LocationReference({
    required this.countryCode,
    required this.countryNameAr,
    required this.cityCode,
    required this.cityNameAr,
    required this.sortOrder,
    required this.isActive,
  });

  final String countryCode;
  final String countryNameAr;
  final String cityCode;
  final String cityNameAr;
  final int sortOrder;
  final bool isActive;
}

/// ARAB is a catalog region identifier, never an ISO country or governorate.
bool isDiscoveryLocation(String countryCode, String cityCode) =>
    countryCode.toUpperCase() == 'YE' ||
    (countryCode.toUpperCase() == 'ARAB' && cityCode == 'global-ar');
