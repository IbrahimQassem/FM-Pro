import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/error/app_data_exception.dart';
import '../../domain/models/episode.dart';

abstract final class EpisodeMapper {
  static Episode fromMap({
    required String id,
    required Map<String, dynamic> data,
  }) {
    if (id.trim().isEmpty) {
      throw const SchemaDataException('Episode document ID is invalid.');
    }
    final stats = data['stats'];
    if (stats is! Map<String, dynamic>) {
      throw const SchemaDataException('Episode stats are invalid.');
    }

    return Episode(
      id: id.trim(),
      programId: _requiredString(data, 'programId'),
      stationId: _requiredString(data, 'stationId'),
      title: _requiredString(data, 'title'),
      description: _optionalString(data, 'description'),
      audioUrl: _requiredHttpsUrl(data, 'audioUrl'),
      durationSeconds: _nonNegativeInt(data, 'durationSeconds'),
      coverUrl: _optionalHttpsUrl(data, 'coverUrl'),
      presenter: _optionalString(data, 'presenter'),
      guest: _optionalString(data, 'guest'),
      priority: _requiredInt(data, 'priority'),
      isPublished: _requiredBool(data, 'isPublished'),
      isFeatured: _requiredBool(data, 'isFeatured'),
      broadcastAt: _requiredTimestamp(data, 'broadcastAt').toDate(),
      utcOffsetMinutes: _utcOffset(data),
      publishedAt: _optionalTimestamp(data, 'publishedAt')?.toDate(),
      playsCount: _nonNegativeStat(stats, 'playsCount'),
      likesCount: _nonNegativeStat(stats, 'likesCount'),
      commentsCount: _nonNegativeStat(stats, 'commentsCount'),
    );
  }

  static String _requiredString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! String || value.trim().isEmpty) {
      throw SchemaDataException('Required episode field is invalid: $key.');
    }
    return value.trim();
  }

  static String _optionalString(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return '';
    if (value is! String) {
      throw SchemaDataException('Optional episode field is invalid: $key.');
    }
    return value.trim();
  }

  static String _requiredHttpsUrl(Map<String, dynamic> data, String key) {
    final value = _requiredString(data, key);
    if (!_isHttpsUrl(value)) {
      throw SchemaDataException('Episode URL is invalid: $key.');
    }
    return value;
  }

  static String _optionalHttpsUrl(Map<String, dynamic> data, String key) {
    final value = _optionalString(data, key);
    if (value.isNotEmpty && !_isHttpsUrl(value)) {
      throw SchemaDataException('Episode URL is invalid: $key.');
    }
    return value;
  }

  static bool _isHttpsUrl(String value) {
    final uri = Uri.tryParse(value);
    return uri != null && uri.scheme == 'https' && uri.hasAuthority;
  }

  static bool _requiredBool(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! bool) {
      throw SchemaDataException('Required episode flag is invalid: $key.');
    }
    return value;
  }

  static int _requiredInt(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! num) {
      throw SchemaDataException('Required episode number is invalid: $key.');
    }
    return value.toInt();
  }

  static int _nonNegativeInt(Map<String, dynamic> data, String key) {
    final value = _requiredInt(data, key);
    if (value < 0) {
      throw SchemaDataException('Episode number is invalid: $key.');
    }
    return value;
  }

  static int _utcOffset(Map<String, dynamic> data) {
    final value = _requiredInt(data, 'utcOffsetMinutes');
    if (value < -720 || value > 840) {
      throw const SchemaDataException('Episode UTC offset is invalid.');
    }
    return value;
  }

  static int _nonNegativeStat(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! num || value < 0) {
      throw SchemaDataException('Episode stat is invalid: $key.');
    }
    return value.toInt();
  }

  static Timestamp _requiredTimestamp(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value is! Timestamp) {
      throw SchemaDataException('Required episode timestamp is invalid: $key.');
    }
    return value;
  }

  static Timestamp? _optionalTimestamp(Map<String, dynamic> data, String key) {
    final value = data[key];
    if (value == null) return null;
    if (value is! Timestamp) {
      throw SchemaDataException('Optional episode timestamp is invalid: $key.');
    }
    return value;
  }
}
