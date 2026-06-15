import '../constants/firebase_paths.dart';

class AppEnvironment {
  const AppEnvironment({
    required this.firebaseBaseDocument,
    required this.dataSourceLabel,
  });

  factory AppEnvironment.fromDartDefines() {
    const firebaseBaseDocument = String.fromEnvironment(
      'HUDHUD_FIREBASE_BASE_DOCUMENT',
      defaultValue: FirebasePaths.defaultBaseDocument,
    );
    const dataSourceLabel = String.fromEnvironment(
      'HUDHUD_DATA_SOURCE_LABEL',
      defaultValue: '',
    );

    return AppEnvironment.fromValues(
      firebaseBaseDocument: firebaseBaseDocument,
      dataSourceLabel: dataSourceLabel,
    );
  }

  factory AppEnvironment.fromValues({
    String firebaseBaseDocument = FirebasePaths.defaultBaseDocument,
    String dataSourceLabel = '',
  }) {
    final safeBaseDocument = _safeBaseDocument(firebaseBaseDocument);

    return AppEnvironment(
      firebaseBaseDocument: safeBaseDocument,
      dataSourceLabel: dataSourceLabel.trim().isEmpty
          ? 'Firebase ($safeBaseDocument)'
          : dataSourceLabel.trim(),
    );
  }

  final String firebaseBaseDocument;
  final String dataSourceLabel;

  static const allowedFirebaseBaseDocuments = {
    FirebasePaths.devBaseDocument,
    FirebasePaths.defaultBaseDocument,
    FirebasePaths.internewsBaseDocument,
  };
}

String _safeBaseDocument(String value) {
  final normalized = value.trim();
  if (AppEnvironment.allowedFirebaseBaseDocuments.contains(normalized)) {
    return normalized;
  }

  return FirebasePaths.defaultBaseDocument;
}
