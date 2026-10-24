import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/station.dart';

abstract final class StationMapper {
  static Station fromMap({
    required String id,
    required Map<String, dynamic> data,
  }) {
    if (id.trim().isEmpty) {
      throw const SchemaDataException('Station document ID is invalid.');
    }
    final streamUrl = _optionalUrl(data, 'streamUrl');
    final stats = data['stats'];
    final statsMap =
        stats is Map<String, dynamic> ? stats : const <String, dynamic>{};

    return Station(
      id: id.trim(),
      name: _requiredString(data, 'name'),
      nameEn: _optionalString(data, 'nameEn'),
      tagline: _optionalString(data, 'tagline'),
      description: _optionalString(data, 'description'),
      streamUrl: streamUrl,
      backupStreamUrl: _optionalUrl(data, 'backupStreamUrl'),
      logoUrl: _optionalUrl(data, 'logoUrl'),
      thumbnailUrl: _optionalUrl(data, 'thumbnailUrl'),
      frequency: _optionalString(data, 'frequency'),
      websiteUrl: _optionalUrl(data, 'websiteUrl').isNotEmpty
          ? _optionalUrl(data, 'websiteUrl')
          : _optionalUrl(data, 'website'),
      facebookUrl: _optionalUrl(data, 'facebookUrl'),
      instagramUrl: _optionalUrl(data, 'instagramUrl'),
      youtubeUrl: _optionalUrl(data, 'youtubeUrl'),
      twitterUrl: _optionalUrl(data, 'twitterUrl'),
      whatsapp: _optionalString(data, 'whatsapp'),
      countryCode: _requiredString(data, 'countryCode'),
      countryNameAr: _requiredString(data, 'countryNameAr'),
      cityCode: _requiredString(data, 'cityCode'),
      cityNameAr: _requiredString(data, 'cityNameAr'),
      priority: _requiredInt(data, 'priority'),
      isLive: _requiredBool(data, 'isLive') && streamUrl.isNotEmpty,
      isActive: _requiredBool(data, 'isActive'),
      isVerified: _requiredBool(data, 'isVerified'),
      isFeatured: _requiredBool(data, 'isFeatured'),
      programsCount: _nonNegativeStat(statsMap, 'programsCount'),
      subscribersCount: _nonNegativeStat(statsMap, 'subscribersCount'),
      totalPlays: _nonNegativeStat(statsMap, 'totalPlays'),
      healthStatus: _optionalString(data, 'healthStatus'),
      lastCheckedAt: _optionalDateTime(data, 'lastCheckedAt'),
      streamHealthSource: _optionalString(data, 'streamHealthSource').isNotEmpty
          ? _optionalString(data, 'streamHealthSource')
          : 'primary',
      consecutiveFailures: _optionalInt(data, 'consecutiveFailures'),
    );
  }

  static String _requiredString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! String || value.trim().isEmpty) {
      throw SchemaDataException('Required station field is invalid: $key.');
    }
    return value.trim();
  }

  static String _optionalString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return '';
    if (value is! String) {
      throw SchemaDataException('Optional station field is invalid: $key.');
    }
    return value.trim();
  }

  static bool _requiredBool(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! bool) {
      throw SchemaDataException('Required station flag is invalid: $key.');
    }
    return value;
  }

  static int _requiredInt(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! num) {
      throw SchemaDataException('Required station number is invalid: $key.');
    }
    return value.toInt();
  }

  static int _nonNegativeStat(Map<String, dynamic> stats, String key) {
    final value = stats[key];
    if (value is num && value >= 0) {
      return value.toInt();
    }
    if (value is String) {
      final parsed = int.tryParse(value);
      if (parsed != null && parsed >= 0) return parsed;
    }
    return 0;
  }

  static String _optionalUrl(Map<String, dynamic> data, String key) {
    final value = _optionalString(data, key);
    if (value.isNotEmpty && !_isNetworkUrl(value)) {
      throw SchemaDataException('Optional station URL is invalid: $key.');
    }
    return value;
  }

  static bool _isNetworkUrl(String value) {
    final uri = Uri.tryParse(value);
    return uri != null &&
        uri.hasAuthority &&
        (uri.scheme == 'https' || uri.scheme == 'http');
  }

  static DateTime? _optionalDateTime(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return null;
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
    try {
      final dynamic d = value;
      if (d.toDate is Function) {
        return d.toDate() as DateTime;
      }
      if (d.toMillis is Function) {
        return DateTime.fromMillisecondsSinceEpoch(
          (d.toMillis() as num).toInt(),
        );
      }
    } catch (_) {}
    return null;
  }

  static int _optionalInt(
    Map<String, dynamic> data,
    String key, {
    int defaultValue = 0,
  }) {
    final value = data[key];
    if (value == null) return defaultValue;
    final parsed = value is num
        ? value
        : value is String && value.trim().isNotEmpty
            ? num.tryParse(value)
            : null;
    if (parsed != null &&
        parsed.isFinite &&
        parsed >= 0 &&
        parsed == parsed.truncateToDouble()) {
      return parsed.toInt();
    }
    return -1;
  }
}
