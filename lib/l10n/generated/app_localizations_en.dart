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
  String get account => 'Account';

  @override
  String get listenerInitial => 'L';

  @override
  String get signInTitle => 'Sign in';

  @override
  String get createAccountTitle => 'Create a listener account';

  @override
  String get accountGuestNote =>
      'You can keep listening as a guest; an account is only required to interact.';

  @override
  String get displayName => 'Display name';

  @override
  String get displayNameValidation =>
      'Enter a name with at least two characters';

  @override
  String get email => 'Email';

  @override
  String get emailValidation => 'Enter a valid email address';

  @override
  String get password => 'Password';

  @override
  String get passwordValidation =>
      'Password must contain at least 8 characters';

  @override
  String get showPassword => 'Show password';

  @override
  String get hidePassword => 'Hide password';

  @override
  String get signIn => 'Sign in';

  @override
  String get createAccount => 'Create account';

  @override
  String get signOut => 'Sign out';

  @override
  String get forgotPassword => 'Forgot password?';

  @override
  String get needAccount => 'No account? Create one';

  @override
  String get haveAccount => 'Already have an account? Sign in';

  @override
  String get enterEmailFirst => 'Enter your email first';

  @override
  String get passwordResetSent =>
      'A password reset email was sent if the address is registered.';

  @override
  String get invalidCredentials => 'The sign-in details are incorrect';

  @override
  String get emailAlreadyInUse =>
      'This email is already used by another account';

  @override
  String get weakPassword => 'Choose a stronger password';

  @override
  String get accountNetworkError =>
      'The account service could not be reached. Try again.';

  @override
  String get accountUnavailable =>
      'This action cannot be completed now. Try later.';

  @override
  String episodeComments(Object title) {
    return 'Comments on $title';
  }

  @override
  String commentsCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count comments',
      one: 'One comment',
      zero: 'Comments',
    );
    return '$_temp0';
  }

  @override
  String get commentsLoadError =>
      'Comments could not be loaded. Check your connection and reopen the screen.';

  @override
  String get noCommentsYet =>
      'No comments yet. Be the first to share your thoughts.';

  @override
  String get signInToComment => 'Sign in to add a comment';

  @override
  String get writeComment => 'Write a respectful comment…';

  @override
  String get sendComment => 'Send comment';

  @override
  String get commentValidation =>
      'Write a comment between 1 and 1000 characters';

  @override
  String get commentSubmitError => 'The comment could not be sent. Try again.';

  @override
  String get editedComment => 'Edited';

  @override
  String get notificationAnnouncements => 'HudHud FM announcements';

  @override
  String get notificationsEnabled =>
      'Enabled; you will receive new HudHud FM announcements.';

  @override
  String get notificationsDisabled => 'Off; enable to opt into announcements.';

  @override
  String get notificationsDenied => 'Permission is denied in system settings.';

  @override
  String get notificationSetupError =>
      'Notification settings could not be updated now.';

  @override
  String get recentNotifications => 'Recently received';

  @override
  String get noRecentNotifications =>
      'No notifications were received in this session.';

  @override
  String get notificationSessionNote =>
      'This list only shows the current session; background notifications remain in the device notification center.';

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
  String get schedule => 'Schedule';

  @override
  String get featuredProgram => 'Featured program';

  @override
  String episodesCount(Object count) {
    return '$count episodes';
  }

  @override
  String get programsLoadErrorTitle => 'Programs could not be loaded';

  @override
  String get programsLoadErrorMessage => 'Check your connection and try again.';

  @override
  String get noProgramsTitle => 'No programs available';

  @override
  String get noProgramsMessage =>
      'No programs have been published for this station yet.';

  @override
  String get cachedContentNotice =>
      'Showing saved content; reconnect to refresh.';

  @override
  String get scheduleLoadError => 'The broadcast schedule could not be loaded.';

  @override
  String get noScheduleForDay => 'No programs are scheduled for this day.';

  @override
  String get scheduleLive => 'NOW';

  @override
  String get scheduleNext => 'NEXT';

  @override
  String get scheduleUpcoming => 'UPCOMING';

  @override
  String get scheduleEnded => 'ENDED';

  @override
  String get monday => 'Monday';

  @override
  String get tuesday => 'Tuesday';

  @override
  String get wednesday => 'Wednesday';

  @override
  String get thursday => 'Thursday';

  @override
  String get friday => 'Friday';

  @override
  String get saturday => 'Saturday';

  @override
  String get sunday => 'Sunday';

  @override
  String get aboutProgram => 'About the program';

  @override
  String presentedBy(Object name) {
    return 'Presented by $name';
  }

  @override
  String programTime(Object end, Object start) {
    return 'From $start to $end';
  }

  @override
  String programEpisodesTitle(Object count) {
    return 'Program episodes ($count)';
  }

  @override
  String get noEpisodesMessage =>
      'No episodes have been published for this program yet.';

  @override
  String minutesCount(Object count) {
    return '$count min';
  }

  @override
  String playEpisode(Object title) {
    return 'Play episode $title';
  }

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
  String get stationInformation => 'Station information and details';

  @override
  String get onlineStation => 'Online radio';
}
