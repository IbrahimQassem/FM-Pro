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
    final streamUrl = _requiredUrl(data, 'streamUrl');
    final stats = data['stats'];
    if (stats is! Map<String, dynamic>) {
      throw const SchemaDataException('Station stats are missing or invalid.');
    }

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
      countryCode: _requiredString(data, 'countryCode'),
      countryNameAr: _requiredString(data, 'countryNameAr'),
      cityCode: _requiredString(data, 'cityCode'),
      cityNameAr: _requiredString(data, 'cityNameAr'),
      priority: _requiredInt(data, 'priority'),
      isLive: _requiredBool(data, 'isLive'),
      isActive: _requiredBool(data, 'isActive'),
      isVerified: _requiredBool(data, 'isVerified'),
      isFeatured: _requiredBool(data, 'isFeatured'),
      programsCount: _nonNegativeStat(stats, 'programsCount'),
      subscribersCount: _nonNegativeStat(stats, 'subscribersCount'),
      totalPlays: _nonNegativeStat(stats, 'totalPlays'),
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
    if (value is! num || value < 0) {
      throw SchemaDataException('Station stat is invalid: $key.');
    }
    return value.toInt();
  }

  static String _requiredUrl(Map<String, dynamic> data, String key) {
    final value = _requiredString(data, key);
    if (!_isNetworkUrl(value)) {
      throw SchemaDataException('Required station URL is invalid: $key.');
    }
    return value;
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
}
