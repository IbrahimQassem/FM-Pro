import 'package:flutter_test/flutter_test.dart';
import 'package:hudhud_fm/core/error/app_data_exception.dart';
import 'package:hudhud_fm/features/station_content/data/mappers/program_mapper.dart';

void main() {
  test('maps a canonical active program and weekly schedule', () {
    final program = ProgramMapper.fromMap(id: 'morning', data: _validProgram);

    expect(program.stationId, 'sanaa-radio');
    expect(program.title, 'صباح اليمن');
    expect(program.schedule!.weekdays, [6, 7, 1, 2, 3, 4]);
    expect(program.schedule!.startMinute, 480);
    expect(program.episodesCount, 2);
  });

  test('rejects invalid schedule ranges', () {
    final data = Map<String, dynamic>.from(_validProgram);
    data['schedule'] = {
      'weekdays': [6],
      'startMinute': 600,
      'endMinute': 500,
      'utcOffsetMinutes': 180,
    };

    expect(
      () => ProgramMapper.fromMap(id: 'morning', data: data),
      throwsA(isA<SchemaDataException>()),
    );
  });

  test('keeps an on-demand program without a schedule', () {
    final data = Map<String, dynamic>.from(_validProgram)..remove('schedule');

    final program = ProgramMapper.fromMap(id: 'on-demand', data: data);

    expect(program.schedule, isNull);
  });

  test('rejects non-HTTPS artwork', () {
    final data = Map<String, dynamic>.from(_validProgram)
      ..['coverUrl'] = 'http://images.example.com/program.png';

    expect(
      () => ProgramMapper.fromMap(id: 'morning', data: data),
      throwsA(isA<SchemaDataException>()),
    );
  });
}

final _validProgram = <String, dynamic>{
  'stationId': 'sanaa-radio',
  'title': 'صباح اليمن',
  'titleEn': 'Yemen Morning',
  'description': 'برنامج صباحي.',
  'coverUrl': 'https://images.example.com/program.png',
  'categories': ['مجتمعي'],
  'presenters': ['أحمد'],
  'priority': 100,
  'isActive': true,
  'isFeatured': true,
  'schedule': {
    'weekdays': [6, 7, 1, 2, 3, 4],
    'startMinute': 480,
    'endMinute': 600,
    'utcOffsetMinutes': 180,
  },
  'stats': {'episodesCount': 2, 'subscribersCount': 30, 'totalPlays': 90},
};
