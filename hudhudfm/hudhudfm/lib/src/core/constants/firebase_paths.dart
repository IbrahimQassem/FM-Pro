class FirebasePaths {
  const FirebasePaths._();

  static const defaultBaseDocument = 'HudHudFmGooglePlay';
  static const devBaseDocument = 'HudHudFM';
  static const internewsBaseDocument = 'InterNews';

  static const radioInfo = 'RadioInfo';
  static const radioProgram = 'RadioProgram';
  static const episode = 'Episode';
  static const users = 'Users';
  static const advertisement = 'Advertisement';

  static String storageFolder({String base = defaultBaseDocument}) {
    return '${base}_Folder';
  }

  static String radioCollection({String base = defaultBaseDocument}) {
    return '$base/$radioInfo/$radioInfo';
  }

  static String programCollection(
    String radioId, {
    String base = defaultBaseDocument,
  }) {
    return '$base/$radioProgram/$radioId/$radioProgram/$radioProgram';
  }

  static String episodeCollection(
    String radioId, {
    String base = defaultBaseDocument,
  }) {
    return '$base/$episode/$radioId/$episode/$episode';
  }

  static String userCollection({String base = defaultBaseDocument}) {
    return '$base/$users/$users';
  }

  static String mediaObjectPath({
    required String parentId,
    required String fileName,
    String base = defaultBaseDocument,
  }) {
    return '${storageFolder(base: base)}/$parentId/$fileName';
  }
}
