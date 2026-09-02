// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'هدهد إف إم';

  @override
  String get splashTagline => 'إذاعاتك في مكان واحد';

  @override
  String get guestGreeting => 'مرحبًا، مستمع';

  @override
  String get onlineStatus => 'متصل';

  @override
  String get offlineStatus => 'تعذر الاتصال — حاول التحديث';

  @override
  String get notifications => 'الإشعارات';

  @override
  String get audioPlaybackNotificationChannelName => 'تشغيل إذاعات هدهد';

  @override
  String get audioPlaybackNotificationChannelDescription =>
      'التحكم في البث الإذاعي الجاري من الإشعار وشاشة القفل';

  @override
  String get settings => 'الإعدادات';

  @override
  String get comingSoon => 'ستتوفر في خطوة لاحقة';

  @override
  String get account => 'الحساب';

  @override
  String get listenerInitial => 'م';

  @override
  String get signInTitle => 'تسجيل الدخول';

  @override
  String get createAccountTitle => 'إنشاء حساب مستمع';

  @override
  String get accountGuestNote =>
      'يمكنك مواصلة الاستماع كضيف، ويُطلب الحساب فقط عند التفاعل.';

  @override
  String get displayName => 'الاسم الظاهر';

  @override
  String get displayNameValidation => 'أدخل اسمًا من حرفين على الأقل';

  @override
  String get email => 'البريد الإلكتروني';

  @override
  String get emailValidation => 'أدخل بريدًا إلكترونيًا صحيحًا';

  @override
  String get password => 'كلمة المرور';

  @override
  String get passwordValidation => 'يجب ألا تقل كلمة المرور عن 8 أحرف';

  @override
  String get showPassword => 'إظهار كلمة المرور';

  @override
  String get hidePassword => 'إخفاء كلمة المرور';

  @override
  String get signIn => 'دخول';

  @override
  String get createAccount => 'إنشاء الحساب';

  @override
  String get signOut => 'تسجيل الخروج';

  @override
  String get forgotPassword => 'نسيت كلمة المرور؟';

  @override
  String get needAccount => 'ليس لديك حساب؟ أنشئ حسابًا';

  @override
  String get haveAccount => 'لديك حساب؟ سجّل الدخول';

  @override
  String get enterEmailFirst => 'أدخل البريد الإلكتروني أولًا';

  @override
  String get passwordResetSent =>
      'أُرسلت رسالة استعادة كلمة المرور إن كان البريد مسجلًا.';

  @override
  String get invalidCredentials => 'بيانات الدخول غير صحيحة';

  @override
  String get emailAlreadyInUse => 'هذا البريد مستخدم في حساب آخر';

  @override
  String get weakPassword => 'اختر كلمة مرور أقوى';

  @override
  String get accountNetworkError =>
      'تعذر الاتصال بخدمة الحسابات. حاول مرة أخرى.';

  @override
  String get accountUnavailable => 'تعذر إكمال العملية الآن. حاول لاحقًا.';

  @override
  String get deleteAccountSectionTitle => 'حذف الحساب والبيانات';

  @override
  String get deleteAccountSectionMessage =>
      'يمكنك حذف حسابك وبياناتك المرتبطة نهائيًا من داخل التطبيق.';

  @override
  String get deleteAccount => 'حذف حسابي';

  @override
  String get deleteAccountTitle => 'حذف الحساب نهائيًا؟';

  @override
  String get deleteAccountWarning =>
      'هذا الإجراء دائم ولا يمكن التراجع عنه. لن تتمكن من استعادة الحساب بعد اكتمال الحذف.';

  @override
  String get deleteAccountDataScope =>
      'سيُحذف ملف الحساب والتعليقات والمفضلة والاشتراكات والموافقات والبلاغات وقائمة الحظر المرتبطة به.';

  @override
  String get currentPassword => 'كلمة المرور الحالية';

  @override
  String get deleteAccountAcknowledgement =>
      'أفهم أن الحساب والبيانات سيُحذفان نهائيًا.';

  @override
  String get deleteAccountConfirm => 'حذف الحساب نهائيًا';

  @override
  String get accountDeleted => 'تم حذف حسابك وبياناتك المرتبطة.';

  @override
  String get accountReauthenticationFailed =>
      'كلمة المرور غير صحيحة أو تحتاج إلى تسجيل الدخول مجددًا.';

  @override
  String get accountDeletionFailed =>
      'تعذر إكمال حذف الحساب. لم يُعتبر الطلب مكتملًا؛ أعد المحاولة.';

  @override
  String episodeComments(Object title) {
    return 'تعليقات $title';
  }

  @override
  String commentsCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count تعليق',
      many: '$count تعليقًا',
      few: '$count تعليقات',
      two: 'تعليقان',
      one: 'تعليق واحد',
      zero: 'التعليقات',
    );
    return '$_temp0';
  }

  @override
  String get commentsLoadError =>
      'تعذر تحميل التعليقات. تحقق من الاتصال ثم أعد فتح الشاشة.';

  @override
  String get noCommentsYet => 'لا توجد تعليقات بعد. كن أول من يشارك رأيه.';

  @override
  String get signInToComment => 'سجّل الدخول لإضافة تعليق';

  @override
  String get writeComment => 'اكتب تعليقًا محترمًا…';

  @override
  String get sendComment => 'إرسال التعليق';

  @override
  String get commentValidation => 'اكتب تعليقًا من 1 إلى 1000 حرف';

  @override
  String get commentSubmitError => 'تعذر إرسال التعليق. حاول مرة أخرى.';

  @override
  String get editedComment => 'معدّل';

  @override
  String get ugcTermsGateTitle => 'شروط المشاركة مطلوبة';

  @override
  String get ugcTermsGateMessage =>
      'راجع شروط المشاركة ووافق عليها قبل إضافة أول تعليق.';

  @override
  String get ugcReviewTerms => 'عرض شروط المشاركة';

  @override
  String get ugcTermsTitle => 'شروط المشاركة والتعليقات';

  @override
  String get ugcTermsIntro =>
      'بالموافقة، تتعهد بأن تكون مشاركاتك محترمة وآمنة وقانونية.';

  @override
  String get ugcTermsRespectRule =>
      'احترم الآخرين، ولا تنشر تهديدًا أو تحرشًا أو خطاب كراهية.';

  @override
  String get ugcTermsSafetyRule =>
      'يُمنع المحتوى الجنسي أو الاستغلال أو أي محتوى يعرّض الأطفال للخطر.';

  @override
  String get ugcTermsPrivacyRule =>
      'لا تنشر بيانات شخصية، ولا تنتحل هوية شخص آخر.';

  @override
  String get ugcTermsSpamRule =>
      'يُمنع المحتوى غير القانوني والرسائل المزعجة والترويج المضلل.';

  @override
  String get ugcTermsModerationNotice =>
      'قد تُخفى أو تُحذف المشاركات المخالفة، وقد يُقيّد الحساب عند تكرار المخالفات.';

  @override
  String get ugcAcceptAndContinue => 'أوافق وأتابع';

  @override
  String get ugcTermsSaveError =>
      'تعذر حفظ موافقتك الآن. تحقق من الاتصال وحاول مرة أخرى.';

  @override
  String get ugcTermsRequired => 'وافق على شروط المشاركة قبل إرسال التعليق.';

  @override
  String get retryTerms => 'إعادة التحقق';

  @override
  String get cancel => 'إلغاء';

  @override
  String get close => 'إغلاق';

  @override
  String get commentSafetyActions => 'إجراءات أمان التعليق';

  @override
  String get reportComment => 'الإبلاغ عن التعليق';

  @override
  String get reportUser => 'الإبلاغ عن المستخدم';

  @override
  String get reportCommentTitle => 'الإبلاغ عن تعليق';

  @override
  String get reportCommentPrivacyNotice =>
      'سيصل البلاغ إلى فريق الإشراف، ولن نكشف هويتك لصاحب التعليق.';

  @override
  String get reportUserTitle => 'الإبلاغ عن مستخدم';

  @override
  String get reportUserPrivacyNotice =>
      'سيُراجع فريق الإشراف سلوك هذا المستخدم والسياق المرتبط، ولن نكشف له هويتك.';

  @override
  String get reportReason => 'سبب البلاغ';

  @override
  String get reportReasonHarassment => 'إساءة أو تحرش';

  @override
  String get reportReasonHate => 'كراهية أو تمييز';

  @override
  String get reportReasonSexual => 'محتوى جنسي أو استغلال';

  @override
  String get reportReasonViolence => 'تهديد أو عنف';

  @override
  String get reportReasonSpam => 'رسائل مزعجة أو تضليل';

  @override
  String get reportReasonPrivacy => 'خصوصية أو انتحال هوية';

  @override
  String get reportReasonOther => 'سبب آخر';

  @override
  String get reportDetailsOptional => 'تفاصيل إضافية (اختياري)';

  @override
  String get reportDetailsHint => 'اشرح المشكلة دون إضافة بيانات شخصية.';

  @override
  String get submitReport => 'إرسال البلاغ';

  @override
  String get commentReportSubmitted => 'تم إرسال البلاغ إلى فريق الإشراف.';

  @override
  String get commentAlreadyReported => 'سبق أن أبلغت عن هذا التعليق.';

  @override
  String get userReportSubmitted => 'تم إرسال بلاغ المستخدم إلى فريق الإشراف.';

  @override
  String get userAlreadyReported =>
      'سبق أن أبلغت عن هذا المستخدم من هذا التعليق.';

  @override
  String get blockUser => 'حظر المستخدم';

  @override
  String get blockUserTitle => 'حظر صاحب التعليق؟';

  @override
  String blockUserConfirmation(Object name) {
    return 'ستختفي جميع تعليقات $name من تجربتك. لا يؤدي الحظر إلى حذفها لدى الآخرين.';
  }

  @override
  String userBlocked(Object name) {
    return 'تم حظر $name وإخفاء تعليقاته.';
  }

  @override
  String get undo => 'تراجع';

  @override
  String get signInForCommentSafetyActions =>
      'سجّل الدخول للإبلاغ أو حظر المستخدم.';

  @override
  String get commentSafetyInvalid => 'تعذر تنفيذ الإجراء على هذا التعليق.';

  @override
  String get commentSafetyError =>
      'تعذر تنفيذ إجراء الأمان الآن. حاول مرة أخرى.';

  @override
  String get moderationPreferencesLoadError =>
      'تعذر تحميل قائمة الحظر بأمان. تحقق من الاتصال ثم أعد المحاولة.';

  @override
  String get notificationAnnouncements => 'إعلانات هدهد إف إم';

  @override
  String get notificationsEnabled =>
      'مفعّلة؛ ستصلك الإعلانات الجديدة من هدهد إف إم.';

  @override
  String get notificationsDisabled =>
      'متوقفة؛ فعّلها لاختيار استقبال الإعلانات.';

  @override
  String get notificationsDenied => 'الإذن مرفوض من إعدادات النظام.';

  @override
  String get notificationSetupError => 'تعذر تحديث إعداد الإشعارات الآن.';

  @override
  String get recentNotifications => 'وصل حديثًا';

  @override
  String get noRecentNotifications => 'لا توجد إشعارات مستلمة في هذه الجلسة.';

  @override
  String get notificationSessionNote =>
      'تعرض هذه القائمة إشعارات الجلسة الحالية فقط؛ إشعارات الخلفية تبقى في مركز إشعارات الجهاز.';

  @override
  String get searchHint => 'ابحث باسم الإذاعة أو المدينة أو التردد';

  @override
  String get clearSearch => 'مسح البحث';

  @override
  String get allCities => 'الكل';

  @override
  String get availableStations => 'الإذاعات المتاحة';

  @override
  String stationCount(num count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count إذاعة',
      many: '$count إذاعة',
      few: '$count إذاعات',
      two: 'إذاعتان',
      one: 'إذاعة واحدة',
      zero: 'لا توجد إذاعات',
    );
    return '$_temp0';
  }

  @override
  String get gridView => 'عرض شبكي';

  @override
  String get listView => 'عرض قائمة';

  @override
  String get live => 'مباشر';

  @override
  String get verifiedStation => 'إذاعة موثقة';

  @override
  String subscribersCount(Object count) {
    return '$count مشترك';
  }

  @override
  String programsCount(Object count) {
    return '$count برنامج';
  }

  @override
  String get noStationsTitle => 'لا توجد إذاعات متاحة';

  @override
  String get noStationsMessage => 'اسحب للتحديث أو حاول مرة أخرى لاحقًا.';

  @override
  String get noSearchResultsTitle => 'لا توجد نتائج مطابقة';

  @override
  String get noSearchResultsMessage =>
      'جرّب اسم إذاعة أو مدينة أو ترددًا مختلفًا.';

  @override
  String get loadErrorTitle => 'تعذر تحميل الإذاعات';

  @override
  String get loadErrorMessage => 'تحقق من اتصالك ثم أعد المحاولة.';

  @override
  String get firebaseSetupTitle => 'Firebase Development غير مهيأ';

  @override
  String get firebaseSetupMessage =>
      'أضف إعداد Firebase الخاص بتطبيق Android Development ثم أعد تشغيل التطبيق.';

  @override
  String get retry => 'إعادة المحاولة';

  @override
  String get refresh => 'تحديث';

  @override
  String get advertisement => 'إعلان';

  @override
  String get profileImage => 'صورة الحساب';

  @override
  String stationLogo(Object name) {
    return 'شعار $name';
  }

  @override
  String playStation(Object name) {
    return 'تشغيل $name';
  }

  @override
  String get contentUpdated => 'تم تحديث المحتوى';

  @override
  String get unknownFrequency => 'إذاعة عبر الإنترنت';

  @override
  String get stationDetails => 'تفاصيل الإذاعة';

  @override
  String get aboutStation => 'عن الإذاعة';

  @override
  String get stationDescriptionFallback =>
      'استمع إلى البث المباشر وتابع أحدث برامج هذه الإذاعة.';

  @override
  String get subscribers => 'مشتركون';

  @override
  String get programs => 'برامج';

  @override
  String get schedule => 'الجدول';

  @override
  String get featuredProgram => 'برنامج مميز';

  @override
  String episodesCount(Object count) {
    return '$count حلقة';
  }

  @override
  String get programsLoadErrorTitle => 'تعذر تحميل البرامج';

  @override
  String get programsLoadErrorMessage => 'تحقق من اتصالك ثم أعد المحاولة.';

  @override
  String get noProgramsTitle => 'لا توجد برامج متاحة';

  @override
  String get noProgramsMessage => 'لم تُنشر برامج لهذه المحطة بعد.';

  @override
  String get cachedContentNotice =>
      'تعرض بيانات محفوظة؛ تحقق من الاتصال للتحديث.';

  @override
  String get scheduleLoadError => 'تعذر تحميل جدول البث.';

  @override
  String get noScheduleForDay => 'لا توجد برامج مجدولة في هذا اليوم.';

  @override
  String get scheduleLive => 'الآن';

  @override
  String get scheduleNext => 'التالي';

  @override
  String get scheduleUpcoming => 'قادم';

  @override
  String get scheduleEnded => 'انتهى';

  @override
  String get monday => 'الاثنين';

  @override
  String get tuesday => 'الثلاثاء';

  @override
  String get wednesday => 'الأربعاء';

  @override
  String get thursday => 'الخميس';

  @override
  String get friday => 'الجمعة';

  @override
  String get saturday => 'السبت';

  @override
  String get sunday => 'الأحد';

  @override
  String get aboutProgram => 'عن البرنامج';

  @override
  String presentedBy(Object name) {
    return 'تقديم: $name';
  }

  @override
  String programTime(Object end, Object start) {
    return 'من $start إلى $end';
  }

  @override
  String programEpisodesTitle(Object count) {
    return 'حلقات البرنامج ($count)';
  }

  @override
  String get noEpisodesMessage => 'لم تُنشر حلقات لهذا البرنامج بعد.';

  @override
  String minutesCount(Object count) {
    return '$count دقيقة';
  }

  @override
  String playEpisode(Object title) {
    return 'تشغيل حلقة $title';
  }

  @override
  String get totalPlays => 'استماع';

  @override
  String get playNow => 'استمع الآن';

  @override
  String get pause => 'إيقاف مؤقت';

  @override
  String get resume => 'متابعة التشغيل';

  @override
  String get stop => 'إيقاف';

  @override
  String get connecting => 'جارٍ الاتصال بالبث…';

  @override
  String get nowPlaying => 'يُبث الآن';

  @override
  String get playbackPaused => 'التشغيل متوقف مؤقتًا';

  @override
  String get playbackErrorShort => 'تعذر تشغيل البث';

  @override
  String get playbackErrorMessage =>
      'تعذر الاتصال ببث الإذاعة. تحقق من اتصالك أو حاول مرة أخرى.';

  @override
  String get retryPlayback => 'إعادة محاولة التشغيل';

  @override
  String get closePlayer => 'إغلاق المشغل';

  @override
  String get listenLive => 'استمع للبث المباشر';

  @override
  String get stationInformation => 'معلومات وتفاصيل الإذاعة';

  @override
  String get onlineStation => 'إذاعة عبر الإنترنت';
}
