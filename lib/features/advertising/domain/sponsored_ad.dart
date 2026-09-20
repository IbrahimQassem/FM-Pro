class SponsoredAd {
  const SponsoredAd(
      {required this.deliveryId,
      required this.title,
      required this.sponsor,
      required this.body,
      required this.imageUrl,
      required this.targetUrl,
      required this.expiresAt});
  final String deliveryId, title, sponsor, body, imageUrl, targetUrl;
  final DateTime expiresAt;
}

abstract interface class AdvertisingRepository {
  Future<SponsoredAd?> load();
  Future<void> record(String deliveryId, String event);
}

bool isSafeAdUrl(String value) {
  final uri = Uri.tryParse(value);
  return uri != null &&
      uri.scheme == 'https' &&
      uri.userInfo.isEmpty &&
      !uri.hasPort &&
      RegExp(r'^[a-z0-9.-]+\.[a-z]{2,}$', caseSensitive: false)
          .hasMatch(uri.host) &&
      !RegExp(r'(^|\.)(localhost|local|internal|test|invalid|example)$',
              caseSensitive: false)
          .hasMatch(uri.host);
}
