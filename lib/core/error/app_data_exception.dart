sealed class AppDataException implements Exception {
  const AppDataException(this.safeMessage);

  final String safeMessage;
}

final class NetworkDataException extends AppDataException {
  const NetworkDataException(super.safeMessage);
}

final class SchemaDataException extends AppDataException {
  const SchemaDataException(super.safeMessage);
}

final class FirebaseConfigurationException extends AppDataException {
  const FirebaseConfigurationException(super.safeMessage);
}
