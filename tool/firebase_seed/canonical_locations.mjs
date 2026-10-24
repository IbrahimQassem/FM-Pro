/**
 * Legacy 22-entry Yemeni coverage catalog plus national and regional scopes.
 * Governorate accuracy remains under editorial review; do not equate count with validation.
 * Compliant with Station Governorates, Stream Health, Brand Identity, and Import Deduplication Contract
 * and Roadmap 2026-10 (PKG-01).
 */

export const CANONICAL_GOVERNORATES = [
  { id: 'sanaa', cityCode: 'sanaa', cityNameAr: 'صنعاء', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 10, isActive: true },
  { id: 'aden', cityCode: 'aden', cityNameAr: 'عدن', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 20, isActive: true },
  { id: 'taiz', cityCode: 'taiz', cityNameAr: 'تعز', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 30, isActive: true },
  { id: 'mukalla', cityCode: 'mukalla', cityNameAr: 'المكلا', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 40, isActive: true },
  { id: 'seiyun', cityCode: 'seiyun', cityNameAr: 'سيئون', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 50, isActive: true },
  { id: 'hudaydah', cityCode: 'hudaydah', cityNameAr: 'الحديدة', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 60, isActive: true },
  { id: 'ibb', cityCode: 'ibb', cityNameAr: 'إب', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 70, isActive: true },
  { id: 'marib', cityCode: 'marib', cityNameAr: 'مأرب', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 80, isActive: true },
  { id: 'dhamar', cityCode: 'dhamar', cityNameAr: 'ذمار', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 90, isActive: true },
  { id: 'shabwah', cityCode: 'shabwah', cityNameAr: 'شبوة', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 100, isActive: true },
  { id: 'al_mahrah', cityCode: 'al_mahrah', cityNameAr: 'المهرة', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 110, isActive: true },
  { id: 'lahj', cityCode: 'lahj', cityNameAr: 'لحج', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 120, isActive: true },
  { id: 'abyan', cityCode: 'abyan', cityNameAr: 'أبين', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 130, isActive: true },
  { id: 'socotra', cityCode: 'socotra', cityNameAr: 'سقطرى', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 140, isActive: true },
  { id: 'saadah', cityCode: 'saadah', cityNameAr: 'صعدة', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 150, isActive: true },
  { id: 'amran', cityCode: 'amran', cityNameAr: 'عمران', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 160, isActive: true },
  { id: 'hajjah', cityCode: 'hajjah', cityNameAr: 'حجة', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 170, isActive: true },
  { id: 'al_mahwit', cityCode: 'al_mahwit', cityNameAr: 'المحويت', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 180, isActive: true },
  { id: 'raymah', cityCode: 'raymah', cityNameAr: 'ريمة', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 190, isActive: true },
  { id: 'al_jawf', cityCode: 'al_jawf', cityNameAr: 'الجوف', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 200, isActive: true },
  { id: 'al_bayda', cityCode: 'al_bayda', cityNameAr: 'البيضاء', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 210, isActive: true },
  { id: 'al_dhalee', cityCode: 'al_dhalee', cityNameAr: 'الضالع', countryCode: 'YE', countryNameAr: 'اليمن', locationType: 'governorate', sortOrder: 220, isActive: true },
];

export const CANONICAL_NATIONAL_LOCATION = {
  id: 'yemen',
  cityCode: 'yemen',
  cityNameAr: 'الجمهورية اليمنية (إذاعات وطنية)',
  countryCode: 'YE',
  countryNameAr: 'اليمن',
  locationType: 'national',
  sortOrder: 1,
  isActive: true,
};

export const CANONICAL_GENERAL_ARABIC_LOCATION = {
  id: 'global-ar',
  cityCode: 'global-ar',
  cityNameAr: 'عربي',
  countryCode: 'ARAB',
  countryNameAr: 'العالم العربي',
  locationType: 'regional',
  sortOrder: 230,
  isActive: true,
};

export const ALL_CANONICAL_LOCATIONS = [
  CANONICAL_NATIONAL_LOCATION,
  ...CANONICAL_GOVERNORATES,
  CANONICAL_GENERAL_ARABIC_LOCATION,
];

export const CANONICAL_LOCATION_IDS = new Set(
  ALL_CANONICAL_LOCATIONS.map((loc) => loc.id),
);

export const CANONICAL_GOVERNORATE_IDS = new Set(
  CANONICAL_GOVERNORATES.map((loc) => loc.id),
);
