import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/location_reference.dart';

abstract final class LocationMapper {
  static LocationReference fromMap(Map<String, dynamic> data) {
    return LocationReference(
      countryCode: _requiredString(data, 'countryCode'),
      countryNameAr: _requiredString(data, 'countryNameAr'),
      cityCode: _requiredString(data, 'cityCode'),
      cityNameAr: _requiredString(data, 'cityNameAr'),
      sortOrder: _requiredInt(data, 'sortOrder'),
      isActive: _requiredBool(data, 'isActive'),
    );
  }

  static String _requiredString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! String || value.trim().isEmpty) {
      throw SchemaDataException('Required location field is invalid: $key.');
    }
    return value.trim();
  }

  static int _requiredInt(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! num || value < 0) {
      throw SchemaDataException('Required location number is invalid: $key.');
    }
    return value.toInt();
  }

  static bool _requiredBool(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! bool) {
      throw SchemaDataException('Required location flag is invalid: $key.');
    }
    return value;
  }
}
