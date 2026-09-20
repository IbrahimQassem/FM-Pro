import 'package:cloud_functions/cloud_functions.dart';
import '../../../core/config/firestore_paths.dart';
import '../domain/sponsored_ad.dart';

class FirebaseAdvertisingRepository implements AdvertisingRepository {
  FirebaseAdvertisingRepository(this._functions);
  final FirebaseFunctions _functions;
  Map<String, Object> get _base => {'version': 1, 'root': FirestorePaths.root};

  @override
  Future<SponsoredAd?> load() async {
    final requestedAt = DateTime.now();
    try {
      final response = await _functions
          .httpsCallable('serveAds',
              options:
                  HttpsCallableOptions(timeout: const Duration(seconds: 8)))
          .call<Map<String, dynamic>>(
              {..._base, 'platform': 'app', 'placement': 'home.sponsor'});
      if (response.data['version'] != 1 || response.data['ad'] is! Map) {
        return null;
      }
      final ad = Map<String, dynamic>.from(response.data['ad'] as Map);
      final kind = ad['kind'];
      if (kind != 'image' && kind != 'sponsorship') return null;
      for (final key in [
        'deliveryId',
        'title',
        'sponsor',
        'body',
        'imageUrl',
        'targetUrl'
      ]) {
        if (ad[key] is! String) return null;
      }
      if (!RegExp(r'^[a-zA-Z0-9_-]{1,100}$')
              .hasMatch(ad['deliveryId'] as String) ||
          (ad['title'] as String).isEmpty ||
          (ad['title'] as String).length > 100 ||
          (ad['body'] as String).length > 240 ||
          (kind == 'image' && !isSafeAdUrl(ad['imageUrl'] as String)) ||
          ((ad['targetUrl'] as String).isNotEmpty &&
              !isSafeAdUrl(ad['targetUrl'] as String))) {
        return null;
      }
      final ttl = ad['validForMs'];
      if (ttl is! num || ttl <= 0 || ttl > 60000) return null;
      final expiresAt = requestedAt.add(Duration(milliseconds: ttl.toInt()));
      if (!DateTime.now().isBefore(expiresAt)) return null;
      return SponsoredAd(
          deliveryId: ad['deliveryId'],
          title: ad['title'],
          sponsor: ad['sponsor'],
          body: ad['body'],
          imageUrl: kind == 'image' ? ad['imageUrl'] : '',
          targetUrl: ad['targetUrl'],
          expiresAt: expiresAt);
    } on Object {
      // Advertising must not become a dependency of discovery or playback.
      return null;
    }
  }

  @override
  Future<void> record(String deliveryId, String event) async {
    try {
      await _functions
          .httpsCallable('recordAdEvent',
              options:
                  HttpsCallableOptions(timeout: const Duration(seconds: 5)))
          .call<void>({..._base, 'deliveryId': deliveryId, 'event': event});
    } on Object {/* Best effort; no persistent tracking or offline replay. */}
  }
}
