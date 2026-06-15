import '../domain/program_repository.dart';
import '../domain/radio_program.dart';

class InMemoryProgramRepository implements ProgramRepository {
  @override
  Future<List<RadioProgram>> fetchPrograms(String radioId) async {
    return _programs
        .where((program) => program.radioId == radioId && program.isVisible)
        .toList(growable: false);
  }

  static const _programs = [
    RadioProgram(
      programId: 'morning-sanaa',
      radioId: 'sanaa-fm',
      name: 'صباح هدهد',
      description: 'برنامج صباحي تجريبي لعرض بنية البرامج.',
      profileUrl: '',
      disabled: false,
      createdBy: 'migration',
    ),
    RadioProgram(
      programId: 'news-sanaa',
      radioId: 'sanaa-fm',
      name: 'نشرة الأخبار',
      description: 'نموذج برنامج مرتبط بإذاعة صنعاء.',
      profileUrl: '',
      disabled: false,
      createdBy: 'migration',
    ),
    RadioProgram(
      programId: 'aden-evening',
      radioId: 'aden-fm',
      name: 'مساء عدن',
      description: 'نموذج برنامج مرتبط بإذاعة عدن.',
      profileUrl: '',
      disabled: false,
      createdBy: 'migration',
    ),
  ];
}
