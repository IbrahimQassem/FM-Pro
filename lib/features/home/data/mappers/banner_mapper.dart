import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/banner_item.dart';

abstract final class BannerMapper {
  static BannerItem fromMap({
    required String id,
    required Map<String, dynamic> data,
  }) {
    if (id.trim().isEmpty) {
      throw const SchemaDataException('Banner document ID is invalid.');
    }
    return BannerItem(
      id: id.trim(),
      title: _requiredString(data, 'title'),
      imageUrl: _requiredUrl(data, 'imageUrl'),
      targetType: _requiredString(data, 'targetType'),
      targetId: _optionalString(data, 'targetId'),
      targetUrl: _optionalUrl(data, 'targetUrl'),
      priority: _requiredInt(data, 'priority'),
      isActive: _requiredBool(data, 'isActive'),
      startAt: _optionalTimestamp(data, 'startAt'),
      expiresAt: _optionalTimestamp(data, 'expiresAt'),
    );
  }

  static String _requiredString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! String || value.trim().isEmpty) {
      throw SchemaDataException('Required banner field is invalid: $key.');
    }
    return value.trim();
  }

  static String _optionalString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return '';
    if (value is! String) {
      throw SchemaDataException('Optional banner field is invalid: $key.');
    }
    return value.trim();
  }

  static String _requiredUrl(Map<String, dynamic> data, String key) {
    final value = _requiredString(data, key);
    if (!_isNetworkUrl(value)) {
      throw SchemaDataException('Required banner URL is invalid: $key.');
    }
    return value;
  }

  static String _optionalUrl(Map<String, dynamic> data, String key) {
    final value = _optionalString(data, key);
    if (value.isNotEmpty && !_isNetworkUrl(value)) {
      throw SchemaDataException('Optional banner URL is invalid: $key.');
    }
    return value;
  }

  static int _requiredInt(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! num) {
      throw SchemaDataException('Required banner number is invalid: $key.');
    }
    return value.toInt();
  }

  static bool _requiredBool(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! bool) {
      throw SchemaDataException('Required banner flag is invalid: $key.');
    }
    return value;
  }

  static DateTime? _optionalTimestamp(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return null;
    if (value is! Timestamp) {
      throw SchemaDataException('Optional banner timestamp is invalid: $key.');
    }
    return value.toDate();
  }

  static bool _isNetworkUrl(String value) {
    final uri = Uri.tryParse(value);
    return uri != null && uri.hasAuthority && uri.scheme == 'https';
  }
}
