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
  String get settings => 'الإعدادات';

  @override
  String get comingSoon => 'ستتوفر في خطوة لاحقة';

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
  String stationProgramsTitle(int count) {
    return 'برامج المحطة ($count)';
  }

  @override
  String get stationProgramsNextStep =>
      'سيتم عرض قائمة البرامج والحلقات عند ربط مصدر بيانات البرامج في الخطوة التالية.';

  @override
  String get stationInformation => 'معلومات وتفاصيل الإذاعة';

  @override
  String get onlineStation => 'إذاعة عبر الإنترنت';
}
