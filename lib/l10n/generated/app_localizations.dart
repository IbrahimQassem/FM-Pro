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
    Locale('en')
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

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @listenerInitial.
  ///
  /// In en, this message translates to:
  /// **'L'**
  String get listenerInitial;

  /// No description provided for @signInTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInTitle;

  /// No description provided for @createAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Create a listener account'**
  String get createAccountTitle;

  /// No description provided for @accountGuestNote.
  ///
  /// In en, this message translates to:
  /// **'You can keep listening as a guest; an account is only required to interact.'**
  String get accountGuestNote;

  /// No description provided for @displayName.
  ///
  /// In en, this message translates to:
  /// **'Display name'**
  String get displayName;

  /// No description provided for @displayNameValidation.
  ///
  /// In en, this message translates to:
  /// **'Enter a name with at least two characters'**
  String get displayNameValidation;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @emailValidation.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address'**
  String get emailValidation;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @passwordValidation.
  ///
  /// In en, this message translates to:
  /// **'Password must contain at least 8 characters'**
  String get passwordValidation;

  /// No description provided for @showPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get hidePassword;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get createAccount;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @forgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get forgotPassword;

  /// No description provided for @needAccount.
  ///
  /// In en, this message translates to:
  /// **'No account? Create one'**
  String get needAccount;

  /// No description provided for @haveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign in'**
  String get haveAccount;

  /// No description provided for @enterEmailFirst.
  ///
  /// In en, this message translates to:
  /// **'Enter your email first'**
  String get enterEmailFirst;

  /// No description provided for @passwordResetSent.
  ///
  /// In en, this message translates to:
  /// **'A password reset email was sent if the address is registered.'**
  String get passwordResetSent;

  /// No description provided for @invalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'The sign-in details are incorrect'**
  String get invalidCredentials;

  /// No description provided for @emailAlreadyInUse.
  ///
  /// In en, this message translates to:
  /// **'This email is already used by another account'**
  String get emailAlreadyInUse;

  /// No description provided for @weakPassword.
  ///
  /// In en, this message translates to:
  /// **'Choose a stronger password'**
  String get weakPassword;

  /// No description provided for @accountNetworkError.
  ///
  /// In en, this message translates to:
  /// **'The account service could not be reached. Try again.'**
  String get accountNetworkError;

  /// No description provided for @accountUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This action cannot be completed now. Try later.'**
  String get accountUnavailable;

  /// No description provided for @deleteAccountSectionTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete account and data'**
  String get deleteAccountSectionTitle;

  /// No description provided for @deleteAccountSectionMessage.
  ///
  /// In en, this message translates to:
  /// **'You can permanently delete your account and its associated data from the app.'**
  String get deleteAccountSectionMessage;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete my account'**
  String get deleteAccount;

  /// No description provided for @deleteAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Permanently delete account?'**
  String get deleteAccountTitle;

  /// No description provided for @deleteAccountWarning.
  ///
  /// In en, this message translates to:
  /// **'This action is permanent and cannot be undone. You will not be able to recover the account after deletion completes.'**
  String get deleteAccountWarning;

  /// No description provided for @deleteAccountDataScope.
  ///
  /// In en, this message translates to:
  /// **'Your profile, comments, favorites, subscriptions, agreements, reports, and block list will be deleted.'**
  String get deleteAccountDataScope;

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get currentPassword;

  /// No description provided for @deleteAccountAcknowledgement.
  ///
  /// In en, this message translates to:
  /// **'I understand that the account and data will be permanently deleted.'**
  String get deleteAccountAcknowledgement;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In en, this message translates to:
  /// **'Permanently delete account'**
  String get deleteAccountConfirm;

  /// No description provided for @accountDeleted.
  ///
  /// In en, this message translates to:
  /// **'Your account and associated data were deleted.'**
  String get accountDeleted;

  /// No description provided for @accountReauthenticationFailed.
  ///
  /// In en, this message translates to:
  /// **'The password is incorrect or you need to sign in again.'**
  String get accountReauthenticationFailed;

  /// No description provided for @accountDeletionFailed.
  ///
  /// In en, this message translates to:
  /// **'Account deletion could not be completed. The request was not considered complete; try again.'**
  String get accountDeletionFailed;

  /// No description provided for @episodeComments.
  ///
  /// In en, this message translates to:
  /// **'Comments on {title}'**
  String episodeComments(Object title);

  /// No description provided for @commentsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{Comments} =1{One comment} other{{count} comments}}'**
  String commentsCount(num count);

  /// No description provided for @commentsLoadError.
  ///
  /// In en, this message translates to:
  /// **'Comments could not be loaded. Check your connection and reopen the screen.'**
  String get commentsLoadError;

  /// No description provided for @noCommentsYet.
  ///
  /// In en, this message translates to:
  /// **'No comments yet. Be the first to share your thoughts.'**
  String get noCommentsYet;

  /// No description provided for @signInToComment.
  ///
  /// In en, this message translates to:
  /// **'Sign in to add a comment'**
  String get signInToComment;

  /// No description provided for @writeComment.
  ///
  /// In en, this message translates to:
  /// **'Write a respectful comment…'**
  String get writeComment;

  /// No description provided for @sendComment.
  ///
  /// In en, this message translates to:
  /// **'Send comment'**
  String get sendComment;

  /// No description provided for @commentValidation.
  ///
  /// In en, this message translates to:
  /// **'Write a comment between 1 and 1000 characters'**
  String get commentValidation;

  /// No description provided for @commentSubmitError.
  ///
  /// In en, this message translates to:
  /// **'The comment could not be sent. Try again.'**
  String get commentSubmitError;

  /// No description provided for @editedComment.
  ///
  /// In en, this message translates to:
  /// **'Edited'**
  String get editedComment;

  /// No description provided for @ugcTermsGateTitle.
  ///
  /// In en, this message translates to:
  /// **'Participation terms required'**
  String get ugcTermsGateTitle;

  /// No description provided for @ugcTermsGateMessage.
  ///
  /// In en, this message translates to:
  /// **'Review and accept the participation terms before adding your first comment.'**
  String get ugcTermsGateMessage;

  /// No description provided for @ugcReviewTerms.
  ///
  /// In en, this message translates to:
  /// **'View participation terms'**
  String get ugcReviewTerms;

  /// No description provided for @ugcTermsTitle.
  ///
  /// In en, this message translates to:
  /// **'Participation and comment terms'**
  String get ugcTermsTitle;

  /// No description provided for @ugcTermsIntro.
  ///
  /// In en, this message translates to:
  /// **'By accepting, you agree to keep your contributions respectful, safe, and lawful.'**
  String get ugcTermsIntro;

  /// No description provided for @ugcTermsRespectRule.
  ///
  /// In en, this message translates to:
  /// **'Respect others. Do not post threats, harassment, or hateful content.'**
  String get ugcTermsRespectRule;

  /// No description provided for @ugcTermsSafetyRule.
  ///
  /// In en, this message translates to:
  /// **'Sexual, exploitative, or child-endangering content is prohibited.'**
  String get ugcTermsSafetyRule;

  /// No description provided for @ugcTermsPrivacyRule.
  ///
  /// In en, this message translates to:
  /// **'Do not share personal information or impersonate another person.'**
  String get ugcTermsPrivacyRule;

  /// No description provided for @ugcTermsSpamRule.
  ///
  /// In en, this message translates to:
  /// **'Illegal content, spam, and deceptive promotion are prohibited.'**
  String get ugcTermsSpamRule;

  /// No description provided for @ugcTermsModerationNotice.
  ///
  /// In en, this message translates to:
  /// **'Violating contributions may be hidden or removed, and repeated violations may restrict the account.'**
  String get ugcTermsModerationNotice;

  /// No description provided for @ugcAcceptAndContinue.
  ///
  /// In en, this message translates to:
  /// **'Accept and continue'**
  String get ugcAcceptAndContinue;

  /// No description provided for @ugcTermsSaveError.
  ///
  /// In en, this message translates to:
  /// **'Your acceptance could not be saved. Check your connection and try again.'**
  String get ugcTermsSaveError;

  /// No description provided for @ugcTermsRequired.
  ///
  /// In en, this message translates to:
  /// **'Accept the participation terms before sending a comment.'**
  String get ugcTermsRequired;

  /// No description provided for @retryTerms.
  ///
  /// In en, this message translates to:
  /// **'Check again'**
  String get retryTerms;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @commentSafetyActions.
  ///
  /// In en, this message translates to:
  /// **'Comment safety actions'**
  String get commentSafetyActions;

  /// No description provided for @reportComment.
  ///
  /// In en, this message translates to:
  /// **'Report comment'**
  String get reportComment;

  /// No description provided for @reportUser.
  ///
  /// In en, this message translates to:
  /// **'Report user'**
  String get reportUser;

  /// No description provided for @reportCommentTitle.
  ///
  /// In en, this message translates to:
  /// **'Report a comment'**
  String get reportCommentTitle;

  /// No description provided for @reportCommentPrivacyNotice.
  ///
  /// In en, this message translates to:
  /// **'The report will go to the moderation team. Your identity will not be shown to the comment author.'**
  String get reportCommentPrivacyNotice;

  /// No description provided for @reportUserTitle.
  ///
  /// In en, this message translates to:
  /// **'Report a user'**
  String get reportUserTitle;

  /// No description provided for @reportUserPrivacyNotice.
  ///
  /// In en, this message translates to:
  /// **'The moderation team will review this user\'s behavior and the related context. Your identity will not be shown to them.'**
  String get reportUserPrivacyNotice;

  /// No description provided for @reportReason.
  ///
  /// In en, this message translates to:
  /// **'Report reason'**
  String get reportReason;

  /// No description provided for @reportReasonHarassment.
  ///
  /// In en, this message translates to:
  /// **'Abuse or harassment'**
  String get reportReasonHarassment;

  /// No description provided for @reportReasonHate.
  ///
  /// In en, this message translates to:
  /// **'Hate or discrimination'**
  String get reportReasonHate;

  /// No description provided for @reportReasonSexual.
  ///
  /// In en, this message translates to:
  /// **'Sexual or exploitative content'**
  String get reportReasonSexual;

  /// No description provided for @reportReasonViolence.
  ///
  /// In en, this message translates to:
  /// **'Threats or violence'**
  String get reportReasonViolence;

  /// No description provided for @reportReasonSpam.
  ///
  /// In en, this message translates to:
  /// **'Spam or deception'**
  String get reportReasonSpam;

  /// No description provided for @reportReasonPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy or impersonation'**
  String get reportReasonPrivacy;

  /// No description provided for @reportReasonOther.
  ///
  /// In en, this message translates to:
  /// **'Other reason'**
  String get reportReasonOther;

  /// No description provided for @reportDetailsOptional.
  ///
  /// In en, this message translates to:
  /// **'Additional details (optional)'**
  String get reportDetailsOptional;

  /// No description provided for @reportDetailsHint.
  ///
  /// In en, this message translates to:
  /// **'Explain the issue without adding personal information.'**
  String get reportDetailsHint;

  /// No description provided for @submitReport.
  ///
  /// In en, this message translates to:
  /// **'Submit report'**
  String get submitReport;

  /// No description provided for @commentReportSubmitted.
  ///
  /// In en, this message translates to:
  /// **'The report was sent to the moderation team.'**
  String get commentReportSubmitted;

  /// No description provided for @commentAlreadyReported.
  ///
  /// In en, this message translates to:
  /// **'You have already reported this comment.'**
  String get commentAlreadyReported;

  /// No description provided for @userReportSubmitted.
  ///
  /// In en, this message translates to:
  /// **'The user report was sent to the moderation team.'**
  String get userReportSubmitted;

  /// No description provided for @userAlreadyReported.
  ///
  /// In en, this message translates to:
  /// **'You have already reported this user from this comment.'**
  String get userAlreadyReported;

  /// No description provided for @blockUser.
  ///
  /// In en, this message translates to:
  /// **'Block user'**
  String get blockUser;

  /// No description provided for @blockUserTitle.
  ///
  /// In en, this message translates to:
  /// **'Block this comment author?'**
  String get blockUserTitle;

  /// No description provided for @blockUserConfirmation.
  ///
  /// In en, this message translates to:
  /// **'All comments from {name} will be hidden from your experience. Blocking does not remove them for others.'**
  String blockUserConfirmation(Object name);

  /// No description provided for @userBlocked.
  ///
  /// In en, this message translates to:
  /// **'{name} was blocked and their comments were hidden.'**
  String userBlocked(Object name);

  /// No description provided for @undo.
  ///
  /// In en, this message translates to:
  /// **'Undo'**
  String get undo;

  /// No description provided for @signInForCommentSafetyActions.
  ///
  /// In en, this message translates to:
  /// **'Sign in to report or block a user.'**
  String get signInForCommentSafetyActions;

  /// No description provided for @commentSafetyInvalid.
  ///
  /// In en, this message translates to:
  /// **'This safety action cannot be applied to the comment.'**
  String get commentSafetyInvalid;

  /// No description provided for @commentSafetyError.
  ///
  /// In en, this message translates to:
  /// **'The safety action could not be completed. Try again.'**
  String get commentSafetyError;

  /// No description provided for @moderationPreferencesLoadError.
  ///
  /// In en, this message translates to:
  /// **'Your block list could not be loaded safely. Check your connection and try again.'**
  String get moderationPreferencesLoadError;

  /// No description provided for @notificationAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'HudHud FM announcements'**
  String get notificationAnnouncements;

  /// No description provided for @notificationsEnabled.
  ///
  /// In en, this message translates to:
  /// **'Enabled; you will receive new HudHud FM announcements.'**
  String get notificationsEnabled;

  /// No description provided for @notificationsDisabled.
  ///
  /// In en, this message translates to:
  /// **'Off; enable to opt into announcements.'**
  String get notificationsDisabled;

  /// No description provided for @notificationsDenied.
  ///
  /// In en, this message translates to:
  /// **'Permission is denied in system settings.'**
  String get notificationsDenied;

  /// No description provided for @notificationSetupError.
  ///
  /// In en, this message translates to:
  /// **'Notification settings could not be updated now.'**
  String get notificationSetupError;

  /// No description provided for @recentNotifications.
  ///
  /// In en, this message translates to:
  /// **'Recently received'**
  String get recentNotifications;

  /// No description provided for @noRecentNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications were received in this session.'**
  String get noRecentNotifications;

  /// No description provided for @notificationSessionNote.
  ///
  /// In en, this message translates to:
  /// **'This list only shows the current session; background notifications remain in the device notification center.'**
  String get notificationSessionNote;

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

  /// No description provided for @schedule.
  ///
  /// In en, this message translates to:
  /// **'Schedule'**
  String get schedule;

  /// No description provided for @featuredProgram.
  ///
  /// In en, this message translates to:
  /// **'Featured program'**
  String get featuredProgram;

  /// No description provided for @episodesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} episodes'**
  String episodesCount(Object count);

  /// No description provided for @programsLoadErrorTitle.
  ///
  /// In en, this message translates to:
  /// **'Programs could not be loaded'**
  String get programsLoadErrorTitle;

  /// No description provided for @programsLoadErrorMessage.
  ///
  /// In en, this message translates to:
  /// **'Check your connection and try again.'**
  String get programsLoadErrorMessage;

  /// No description provided for @noProgramsTitle.
  ///
  /// In en, this message translates to:
  /// **'No programs available'**
  String get noProgramsTitle;

  /// No description provided for @noProgramsMessage.
  ///
  /// In en, this message translates to:
  /// **'No programs have been published for this station yet.'**
  String get noProgramsMessage;

  /// No description provided for @cachedContentNotice.
  ///
  /// In en, this message translates to:
  /// **'Showing saved content; reconnect to refresh.'**
  String get cachedContentNotice;

  /// No description provided for @scheduleLoadError.
  ///
  /// In en, this message translates to:
  /// **'The broadcast schedule could not be loaded.'**
  String get scheduleLoadError;

  /// No description provided for @noScheduleForDay.
  ///
  /// In en, this message translates to:
  /// **'No programs are scheduled for this day.'**
  String get noScheduleForDay;

  /// No description provided for @scheduleLive.
  ///
  /// In en, this message translates to:
  /// **'NOW'**
  String get scheduleLive;

  /// No description provided for @scheduleNext.
  ///
  /// In en, this message translates to:
  /// **'NEXT'**
  String get scheduleNext;

  /// No description provided for @scheduleUpcoming.
  ///
  /// In en, this message translates to:
  /// **'UPCOMING'**
  String get scheduleUpcoming;

  /// No description provided for @scheduleEnded.
  ///
  /// In en, this message translates to:
  /// **'ENDED'**
  String get scheduleEnded;

  /// No description provided for @monday.
  ///
  /// In en, this message translates to:
  /// **'Monday'**
  String get monday;

  /// No description provided for @tuesday.
  ///
  /// In en, this message translates to:
  /// **'Tuesday'**
  String get tuesday;

  /// No description provided for @wednesday.
  ///
  /// In en, this message translates to:
  /// **'Wednesday'**
  String get wednesday;

  /// No description provided for @thursday.
  ///
  /// In en, this message translates to:
  /// **'Thursday'**
  String get thursday;

  /// No description provided for @friday.
  ///
  /// In en, this message translates to:
  /// **'Friday'**
  String get friday;

  /// No description provided for @saturday.
  ///
  /// In en, this message translates to:
  /// **'Saturday'**
  String get saturday;

  /// No description provided for @sunday.
  ///
  /// In en, this message translates to:
  /// **'Sunday'**
  String get sunday;

  /// No description provided for @aboutProgram.
  ///
  /// In en, this message translates to:
  /// **'About the program'**
  String get aboutProgram;

  /// No description provided for @presentedBy.
  ///
  /// In en, this message translates to:
  /// **'Presented by {name}'**
  String presentedBy(Object name);

  /// No description provided for @programTime.
  ///
  /// In en, this message translates to:
  /// **'From {start} to {end}'**
  String programTime(Object end, Object start);

  /// No description provided for @programEpisodesTitle.
  ///
  /// In en, this message translates to:
  /// **'Program episodes ({count})'**
  String programEpisodesTitle(Object count);

  /// No description provided for @noEpisodesMessage.
  ///
  /// In en, this message translates to:
  /// **'No episodes have been published for this program yet.'**
  String get noEpisodesMessage;

  /// No description provided for @minutesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} min'**
  String minutesCount(Object count);

  /// No description provided for @playEpisode.
  ///
  /// In en, this message translates to:
  /// **'Play episode {title}'**
  String playEpisode(Object title);

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

  /// No description provided for @emailVerificationTitle.
  ///
  /// In en, this message translates to:
  /// **'Verify your email'**
  String get emailVerificationTitle;

  /// No description provided for @emailVerificationMessage.
  ///
  /// In en, this message translates to:
  /// **'Enter the six-digit code sent to your email. The code expires after 10 minutes.'**
  String get emailVerificationMessage;

  /// No description provided for @emailVerificationMissingEmail.
  ///
  /// In en, this message translates to:
  /// **'This provider did not return an email. Enter an email you can access before requesting a code.'**
  String get emailVerificationMissingEmail;

  /// No description provided for @verificationCode.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get verificationCode;

  /// No description provided for @verificationCodeValidation.
  ///
  /// In en, this message translates to:
  /// **'Enter the six-digit code.'**
  String get verificationCodeValidation;

  /// No description provided for @verifyEmail.
  ///
  /// In en, this message translates to:
  /// **'Verify email'**
  String get verifyEmail;

  /// No description provided for @sendVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'Send verification code'**
  String get sendVerificationCode;

  /// No description provided for @resendVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get resendVerificationCode;

  /// No description provided for @verificationCodeSent.
  ///
  /// In en, this message translates to:
  /// **'A new verification code was sent. Check your inbox and spam folder.'**
  String get verificationCodeSent;

  /// No description provided for @emailVerifiedMessage.
  ///
  /// In en, this message translates to:
  /// **'Your email was verified successfully.'**
  String get emailVerifiedMessage;

  /// No description provided for @socialSignInDivider.
  ///
  /// In en, this message translates to:
  /// **'or continue with'**
  String get socialSignInDivider;

  /// No description provided for @continueWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get continueWithGoogle;

  /// No description provided for @continueWithFacebook.
  ///
  /// In en, this message translates to:
  /// **'Continue with Facebook'**
  String get continueWithFacebook;

  /// No description provided for @continueWithApple.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get continueWithApple;

  /// No description provided for @linkedSignInMethods.
  ///
  /// In en, this message translates to:
  /// **'Linked sign-in methods'**
  String get linkedSignInMethods;

  /// No description provided for @linkAnotherMethod.
  ///
  /// In en, this message translates to:
  /// **'Link another sign-in method'**
  String get linkAnotherMethod;

  /// No description provided for @providerLinked.
  ///
  /// In en, this message translates to:
  /// **'The sign-in method was linked to your account.'**
  String get providerLinked;

  /// No description provided for @socialDeleteReauthentication.
  ///
  /// In en, this message translates to:
  /// **'You will confirm your identity using your linked sign-in provider before deletion.'**
  String get socialDeleteReauthentication;

  /// No description provided for @invalidVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'The verification code is incorrect.'**
  String get invalidVerificationCode;

  /// No description provided for @expiredVerificationCode.
  ///
  /// In en, this message translates to:
  /// **'The verification code expired. Request a new one.'**
  String get expiredVerificationCode;

  /// No description provided for @verificationRateLimited.
  ///
  /// In en, this message translates to:
  /// **'Too many requests or attempts. Wait before trying again.'**
  String get verificationRateLimited;

  /// No description provided for @verificationDeliveryFailed.
  ///
  /// In en, this message translates to:
  /// **'The verification email could not be sent. Try again later.'**
  String get verificationDeliveryFailed;

  /// No description provided for @providerCancelled.
  ///
  /// In en, this message translates to:
  /// **'Sign-in was cancelled.'**
  String get providerCancelled;

  /// No description provided for @providerFailed.
  ///
  /// In en, this message translates to:
  /// **'The sign-in provider could not complete the request.'**
  String get providerFailed;

  /// No description provided for @providerNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'This sign-in method is not configured yet.'**
  String get providerNotConfigured;

  /// No description provided for @providerAlreadyLinked.
  ///
  /// In en, this message translates to:
  /// **'This sign-in method is already linked.'**
  String get providerAlreadyLinked;

  /// No description provided for @accountConflict.
  ///
  /// In en, this message translates to:
  /// **'This email belongs to another sign-in method. Sign in with the existing method, then link this one from your account.'**
  String get accountConflict;

  /// No description provided for @verifyEmailToComment.
  ///
  /// In en, this message translates to:
  /// **'Verify your email to comment or use safety actions'**
  String get verifyEmailToComment;

  /// No description provided for @mascotEmptyCommentsTitle.
  ///
  /// In en, this message translates to:
  /// **'No comments yet'**
  String get mascotEmptyCommentsTitle;

  /// No description provided for @mascotEmptyCommentsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Be the first to share your thoughts and start the conversation!'**
  String get mascotEmptyCommentsSubtitle;

  /// No description provided for @mascotEmptySearchTitle.
  ///
  /// In en, this message translates to:
  /// **'No matching results found'**
  String get mascotEmptySearchTitle;

  /// No description provided for @mascotEmptySearchSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Try searching for a different station name or category.'**
  String get mascotEmptySearchSubtitle;

  /// No description provided for @mascotOfflineTitle.
  ///
  /// In en, this message translates to:
  /// **'Stream connection lost'**
  String get mascotOfflineTitle;

  /// No description provided for @mascotOfflineSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Radio signal was interrupted. Check your internet connection and try again.'**
  String get mascotOfflineSubtitle;

  /// No description provided for @mascotEmptyFavoritesTitle.
  ///
  /// In en, this message translates to:
  /// **'Your favorites list is empty'**
  String get mascotEmptyFavoritesTitle;

  /// No description provided for @mascotEmptyFavoritesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Add your favorite stations to access them anytime with one tap.'**
  String get mascotEmptyFavoritesSubtitle;

  /// No description provided for @mascotUgcGuidelinesBadge.
  ///
  /// In en, this message translates to:
  /// **'Hudhud Guidelines for a respectful community'**
  String get mascotUgcGuidelinesBadge;

  /// No description provided for @favoritesFilter.
  ///
  /// In en, this message translates to:
  /// **'Favorites'**
  String get favoritesFilter;

  /// No description provided for @addToFavorites.
  ///
  /// In en, this message translates to:
  /// **'Add to favorites'**
  String get addToFavorites;

  /// No description provided for @removeFromFavorites.
  ///
  /// In en, this message translates to:
  /// **'Remove from favorites'**
  String get removeFromFavorites;

  /// No description provided for @signInToFavoritePrompt.
  ///
  /// In en, this message translates to:
  /// **'Sign in to save stations to favorites'**
  String get signInToFavoritePrompt;

  /// No description provided for @verifyEmailToFavoritePrompt.
  ///
  /// In en, this message translates to:
  /// **'Verify your email to save stations to favorites'**
  String get verifyEmailToFavoritePrompt;

  /// No description provided for @favoriteAddedMessage.
  ///
  /// In en, this message translates to:
  /// **'Station added to favorites'**
  String get favoriteAddedMessage;

  /// No description provided for @favoriteRemovedMessage.
  ///
  /// In en, this message translates to:
  /// **'Station removed from favorites'**
  String get favoriteRemovedMessage;

  /// No description provided for @favoriteActionFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not update favorites. Try again.'**
  String get favoriteActionFailed;

  /// No description provided for @ugcGuidelinesMenu.
  ///
  /// In en, this message translates to:
  /// **'Community & Safety Guidelines'**
  String get ugcGuidelinesMenu;

  /// No description provided for @ugcGuidelinesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Community standards and acceptable conduct'**
  String get ugcGuidelinesSubtitle;

  /// No description provided for @onboardingTitle1.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Hudhud FM'**
  String get onboardingTitle1;

  /// No description provided for @onboardingSubtitle1.
  ///
  /// In en, this message translates to:
  /// **'Your premier gateway to Yemeni radio stations with crystal clear sound wherever you are.'**
  String get onboardingSubtitle1;

  /// No description provided for @onboardingTitle2.
  ///
  /// In en, this message translates to:
  /// **'Your Favorites at Hand'**
  String get onboardingTitle2;

  /// No description provided for @onboardingSubtitle2.
  ///
  /// In en, this message translates to:
  /// **'Save your favorite stations with one tap to access them quickly anytime with ease.'**
  String get onboardingSubtitle2;

  /// No description provided for @onboardingTitle3.
  ///
  /// In en, this message translates to:
  /// **'Shows, Episodes & Community'**
  String get onboardingTitle3;

  /// No description provided for @onboardingSubtitle3.
  ///
  /// In en, this message translates to:
  /// **'Listen to recorded episodes, join the discussion, and enjoy a safe radio community.'**
  String get onboardingSubtitle3;

  /// No description provided for @startListening.
  ///
  /// In en, this message translates to:
  /// **'Start Listening Now'**
  String get startListening;

  /// No description provided for @skip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get skip;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get next;

  /// No description provided for @appTour.
  ///
  /// In en, this message translates to:
  /// **'App Tour'**
  String get appTour;

  /// No description provided for @appTourSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Explore the features of Hudhud FM'**
  String get appTourSubtitle;

  /// No description provided for @shareStation.
  ///
  /// In en, this message translates to:
  /// **'Share Station'**
  String get shareStation;

  /// No description provided for @shareEpisode.
  ///
  /// In en, this message translates to:
  /// **'Share Episode'**
  String get shareEpisode;

  /// No description provided for @shareStationMessage.
  ///
  /// In en, this message translates to:
  /// **'Listen now to {stationName} on Hudhud FM 📻🇾🇪\n{url}'**
  String shareStationMessage(String stationName, String url);

  /// No description provided for @shareEpisodeMessage.
  ///
  /// In en, this message translates to:
  /// **'Listen to \"{episodeTitle}\" from {programTitle} - {stationName} on Hudhud FM 🎙️\n{url}'**
  String shareEpisodeMessage(
      String episodeTitle, String programTitle, String stationName, String url);

  /// No description provided for @mascotEmptyNotificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'No new notifications'**
  String get mascotEmptyNotificationsTitle;

  /// No description provided for @mascotEmptyNotificationsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We will notify you about live broadcasts and new shows as soon as they are available.'**
  String get mascotEmptyNotificationsSubtitle;
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
      'that was used.');
}
