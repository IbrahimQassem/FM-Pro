import 'radio_info.dart';

abstract class RadioRepository {
  Future<List<RadioInfo>> fetchActiveRadios();
}
