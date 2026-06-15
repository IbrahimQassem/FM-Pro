import 'radio_program.dart';

abstract class ProgramRepository {
  Future<List<RadioProgram>> fetchPrograms(String radioId);
}
