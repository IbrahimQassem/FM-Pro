// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'HudHud FM';

  @override
  String get splashTagline => 'Your stations, in one place';

  @override
  String get guestGreeting => 'Welcome, listener';

  @override
  String get onlineStatus => 'Connected';

  @override
  String get offlineStatus => 'Connection failed — try refreshing';

  @override
  String get notifications => 'Notifications';

  @override
  String get audioPlaybackNotificationChannelName => 'HudHud radio playback';

  @override
  String get audioPlaybackNotificationChannelDescription =>
      'Control the active radio stream from notifications and the lock screen';

  @override
  String get settings => 'Settings';

  @override
  String get comingSoon => 'Coming in a later step';

  @override
  String get searchHint => 'Search by station, city, or frequency';

  @override
  String get clearSearch => 'Clear search';

  @override
  String get allCities => 'All';

  @override
  String get availableStations => 'Available stations';

  @override
  String stationCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stations',
      one: 'One station',
      zero: 'No stations',
    );
    return '$_temp0';
  }

  @override
  String get gridView => 'Grid view';

  @override
  String get listView => 'List view';

  @override
  String get live => 'LIVE';

  @override
  String get verifiedStation => 'Verified station';

  @override
  String subscribersCount(Object count) {
    return '$count subscribers';
  }

  @override
  String programsCount(Object count) {
    return '$count programs';
  }

  @override
  String get noStationsTitle => 'No stations available';

  @override
  String get noStationsMessage => 'Pull to refresh or try again later.';

  @override
  String get noSearchResultsTitle => 'No matching stations';

  @override
  String get noSearchResultsMessage =>
      'Try another station name, city, or frequency.';

  @override
  String get loadErrorTitle => 'Stations could not be loaded';

  @override
  String get loadErrorMessage => 'Check your connection and try again.';

  @override
  String get firebaseSetupTitle => 'Development Firebase is not configured';

  @override
  String get firebaseSetupMessage =>
      'Add the Android development Firebase configuration, then restart the app.';

  @override
  String get retry => 'Try again';

  @override
  String get refresh => 'Refresh';

  @override
  String get advertisement => 'Advertisement';

  @override
  String get profileImage => 'Profile image';

  @override
  String stationLogo(Object name) {
    return '$name logo';
  }

  @override
  String playStation(Object name) {
    return 'Play $name';
  }

  @override
  String get contentUpdated => 'Content updated';

  @override
  String get unknownFrequency => 'Online radio';

  @override
  String get stationDetails => 'Station details';

  @override
  String get aboutStation => 'About the station';

  @override
  String get stationDescriptionFallback =>
      'Listen to the live stream and follow this station\'s latest programs.';

  @override
  String get subscribers => 'Subscribers';

  @override
  String get programs => 'Programs';

  @override
  String get totalPlays => 'Plays';

  @override
  String get playNow => 'Listen now';

  @override
  String get pause => 'Pause';

  @override
  String get resume => 'Resume';

  @override
  String get stop => 'Stop';

  @override
  String get connecting => 'Connecting to the stream…';

  @override
  String get nowPlaying => 'Now playing';

  @override
  String get playbackPaused => 'Playback paused';

  @override
  String get playbackErrorShort => 'Stream unavailable';

  @override
  String get playbackErrorMessage =>
      'The station stream could not be reached. Check your connection or try again.';

  @override
  String get retryPlayback => 'Retry playback';

  @override
  String get closePlayer => 'Close player';

  @override
  String get listenLive => 'Listen to the live stream';

  @override
  String stationProgramsTitle(int count) {
    return 'Station programs ($count)';
  }

  @override
  String get stationProgramsNextStep =>
      'Programs and episodes will appear when their data source is connected in the next step.';

  @override
  String get stationInformation => 'Station information and details';

  @override
  String get onlineStation => 'Online radio';
}
