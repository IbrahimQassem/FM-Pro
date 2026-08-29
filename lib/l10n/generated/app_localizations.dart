import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'HudHud FM'**
  String get appName;

  /// No description provided for @splashTagline.
  ///
  /// In en, this message translates to:
  /// **'Your stations, in one place'**
  String get splashTagline;

  /// No description provided for @guestGreeting.
  ///
  /// In en, this message translates to:
  /// **'Welcome, listener'**
  String get guestGreeting;

  /// No description provided for @onlineStatus.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get onlineStatus;

  /// No description provided for @offlineStatus.
  ///
  /// In en, this message translates to:
  /// **'Connection failed — try refreshing'**
  String get offlineStatus;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @audioPlaybackNotificationChannelName.
  ///
  /// In en, this message translates to:
  /// **'HudHud radio playback'**
  String get audioPlaybackNotificationChannelName;

  /// No description provided for @audioPlaybackNotificationChannelDescription.
  ///
  /// In en, this message translates to:
  /// **'Control the active radio stream from notifications and the lock screen'**
  String get audioPlaybackNotificationChannelDescription;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming in a later step'**
  String get comingSoon;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Search by station, city, or frequency'**
  String get searchHint;

  /// No description provided for @clearSearch.
  ///
  /// In en, this message translates to:
  /// **'Clear search'**
  String get clearSearch;

  /// No description provided for @allCities.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allCities;

  /// No description provided for @availableStations.
  ///
  /// In en, this message translates to:
  /// **'Available stations'**
  String get availableStations;

  /// No description provided for @stationCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No stations} =1{One station} other{{count} stations}}'**
  String stationCount(num count);

  /// No description provided for @gridView.
  ///
  /// In en, this message translates to:
  /// **'Grid view'**
  String get gridView;

  /// No description provided for @listView.
  ///
  /// In en, this message translates to:
  /// **'List view'**
  String get listView;

  /// No description provided for @live.
  ///
  /// In en, this message translates to:
  /// **'LIVE'**
  String get live;

  /// No description provided for @verifiedStation.
  ///
  /// In en, this message translates to:
  /// **'Verified station'**
  String get verifiedStation;

  /// No description provided for @subscribersCount.
  ///
  /// In en, this message translates to:
  /// **'{count} subscribers'**
  String subscribersCount(Object count);

  /// No description provided for @programsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} programs'**
  String programsCount(Object count);

  /// No description provided for @noStationsTitle.
  ///
  /// In en, this message translates to:
  /// **'No stations available'**
  String get noStationsTitle;

  /// No description provided for @noStationsMessage.
  ///
  /// In en, this message translates to:
  /// **'Pull to refresh or try again later.'**
  String get noStationsMessage;

  /// No description provided for @noSearchResultsTitle.
  ///
  /// In en, this message translates to:
  /// **'No matching stations'**
  String get noSearchResultsTitle;

  /// No description provided for @noSearchResultsMessage.
  ///
  /// In en, this message translates to:
  /// **'Try another station name, city, or frequency.'**
  String get noSearchResultsMessage;

  /// No description provided for @loadErrorTitle.
  ///
  /// In en, this message translates to:
  /// **'Stations could not be loaded'**
  String get loadErrorTitle;

  /// No description provided for @loadErrorMessage.
  ///
  /// In en, this message translates to:
  /// **'Check your connection and try again.'**
  String get loadErrorMessage;

  /// No description provided for @firebaseSetupTitle.
  ///
  /// In en, this message translates to:
  /// **'Development Firebase is not configured'**
  String get firebaseSetupTitle;

  /// No description provided for @firebaseSetupMessage.
  ///
  /// In en, this message translates to:
  /// **'Add the Android development Firebase configuration, then restart the app.'**
  String get firebaseSetupMessage;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @advertisement.
  ///
  /// In en, this message translates to:
  /// **'Advertisement'**
  String get advertisement;

  /// No description provided for @profileImage.
  ///
  /// In en, this message translates to:
  /// **'Profile image'**
  String get profileImage;

  /// No description provided for @stationLogo.
  ///
  /// In en, this message translates to:
  /// **'{name} logo'**
  String stationLogo(Object name);

  /// No description provided for @playStation.
  ///
  /// In en, this message translates to:
  /// **'Play {name}'**
  String playStation(Object name);

  /// No description provided for @contentUpdated.
  ///
  /// In en, this message translates to:
  /// **'Content updated'**
  String get contentUpdated;

  /// No description provided for @unknownFrequency.
  ///
  /// In en, this message translates to:
  /// **'Online radio'**
  String get unknownFrequency;

  /// No description provided for @stationDetails.
  ///
  /// In en, this message translates to:
  /// **'Station details'**
  String get stationDetails;

  /// No description provided for @aboutStation.
  ///
  /// In en, this message translates to:
  /// **'About the station'**
  String get aboutStation;

  /// No description provided for @stationDescriptionFallback.
  ///
  /// In en, this message translates to:
  /// **'Listen to the live stream and follow this station\'s latest programs.'**
  String get stationDescriptionFallback;

  /// No description provided for @subscribers.
  ///
  /// In en, this message translates to:
  /// **'Subscribers'**
  String get subscribers;

  /// No description provided for @programs.
  ///
  /// In en, this message translates to:
  /// **'Programs'**
  String get programs;

  /// No description provided for @totalPlays.
  ///
  /// In en, this message translates to:
  /// **'Plays'**
  String get totalPlays;

  /// No description provided for @playNow.
  ///
  /// In en, this message translates to:
  /// **'Listen now'**
  String get playNow;

  /// No description provided for @pause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get pause;

  /// No description provided for @resume.
  ///
  /// In en, this message translates to:
  /// **'Resume'**
  String get resume;

  /// No description provided for @stop.
  ///
  /// In en, this message translates to:
  /// **'Stop'**
  String get stop;

  /// No description provided for @connecting.
  ///
  /// In en, this message translates to:
  /// **'Connecting to the stream…'**
  String get connecting;

  /// No description provided for @nowPlaying.
  ///
  /// In en, this message translates to:
  /// **'Now playing'**
  String get nowPlaying;

  /// No description provided for @playbackPaused.
  ///
  /// In en, this message translates to:
  /// **'Playback paused'**
  String get playbackPaused;

  /// No description provided for @playbackErrorShort.
  ///
  /// In en, this message translates to:
  /// **'Stream unavailable'**
  String get playbackErrorShort;

  /// No description provided for @playbackErrorMessage.
  ///
  /// In en, this message translates to:
  /// **'The station stream could not be reached. Check your connection or try again.'**
  String get playbackErrorMessage;

  /// No description provided for @retryPlayback.
  ///
  /// In en, this message translates to:
  /// **'Retry playback'**
  String get retryPlayback;

  /// No description provided for @closePlayer.
  ///
  /// In en, this message translates to:
  /// **'Close player'**
  String get closePlayer;

  /// No description provided for @listenLive.
  ///
  /// In en, this message translates to:
  /// **'Listen to the live stream'**
  String get listenLive;

  /// No description provided for @stationProgramsTitle.
  ///
  /// In en, this message translates to:
  /// **'Station programs ({count})'**
  String stationProgramsTitle(int count);

  /// No description provided for @stationProgramsNextStep.
  ///
  /// In en, this message translates to:
  /// **'Programs and episodes will appear when their data source is connected in the next step.'**
  String get stationProgramsNextStep;

  /// No description provided for @stationInformation.
  ///
  /// In en, this message translates to:
  /// **'Station information and details'**
  String get stationInformation;

  /// No description provided for @onlineStation.
  ///
  /// In en, this message translates to:
  /// **'Online radio'**
  String get onlineStation;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
