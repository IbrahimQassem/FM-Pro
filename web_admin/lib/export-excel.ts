import * as XLSX from 'xlsx';

export type StationExportRow = {
  id: string;
  data: Record<string, unknown>;
};

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseUrlDetails(urlStr: unknown): { protocol: string; host: string; port: string } {
  if (typeof urlStr !== 'string' || !urlStr.trim()) {
    return { protocol: '', host: '', port: '' };
  }
  try {
    const parsed = new URL(urlStr.trim());
    const protocol = parsed.protocol.replace(':', '').toUpperCase();
    const port = parsed.port || (protocol === 'HTTPS' ? '443' : protocol === 'HTTP' ? '80' : '');
    return {
      protocol,
      host: parsed.hostname,
      port,
    };
  } catch {
    return { protocol: '', host: '', port: '' };
  }
}

export function buildStationExcelData(records: StationExportRow[]): Record<string, unknown>[] {
  return records.map((record) => {
    const d = record.data || {};
    const stats = (typeof d.stats === 'object' && d.stats !== null ? d.stats : {}) as Record<string, unknown>;
    const streamDetails = parseUrlDetails(d.streamUrl);
    const backupStreamDetails = parseUrlDetails(d.backupStreamUrl);

    return {
      'المعرّف': record.id,
      'اسم المحطة': text(d.name),
      'الاسم بالإنجليزية': text(d.nameEn),
      'العبارة التعريفية': text(d.tagline),
      'نبذة عن المحطة': text(d.description),
      'التردد': text(d.frequency),
      'المدينة': text(d.cityNameAr),
      'رمز المدينة': text(d.cityCode),
      'البلد': text(d.countryNameAr) || 'اليمن',
      // بيانات البث والشبكة (Technical Streaming Specs)
      'رابط البث الأساسي': text(d.streamUrl),
      'بروتوكول البث الأساسي': streamDetails.protocol,
      'خادم / نطاق البث الأساسي': streamDetails.host,
      'منفذ البث الأساسي': streamDetails.port,
      'رابط البث الاحتياطي': text(d.backupStreamUrl),
      'بروتوكول البث الاحتياطي': backupStreamDetails.protocol,
      'نوع خادم البث': text(d.streamType),
      'ترميز الصوت': text(d.audioCodec),
      'معدل البت (kbps)': text(d.bitrateKbps),
      'معدل العينة (Hz)': text(d.sampleRateHz),
      // بيانات البث الإذاعي وأجهزة الإرسال (FM Transmission Specs)
      'قدرة جهاز الإرسال': text(d.transmitterPower),
      'موقع برج الإرسال': text(d.transmitterLocation),
      'نطاق التغطية الجغرافية': text(d.coverageArea),
      'نظام بيانات الراديو (RDS)': text(d.rds),
      // بيانات الإدارة وجهات الاتصال المرجعية
      'الجهة المالكة / المالك': text(d.owner),
      'المقر / العنوان': text(d.address),
      'مسؤول التواصل': text(d.contactPerson),
      'هاتف التواصل': text(d.contactPhone),
      'البريد الإلكتروني': text(d.contactEmail),
      // الروابط العامة للمستمعين
      'الموقع الإلكتروني': text(d.websiteUrl),
      'رابط فيسبوك': text(d.facebookUrl),
      'رابط إنستغرام': text(d.instagramUrl),
      'رابط يوتيوب': text(d.youtubeUrl),
      'رابط إكس / تويتر': text(d.twitterUrl),
      'واتساب': text(d.whatsapp),
      // الوسائط والهوية
      'رابط الشعار': text(d.logoUrl),
      'رابط الصورة المصغرة': text(d.thumbnailUrl),
      // حالات المحطة
      'بث مباشر': d.isLive === true ? 'نعم' : 'لا',
      'مفعّلة في التطبيق': d.isActive === true ? 'نعم' : 'لا',
      'موثقة': d.isVerified === true ? 'نعم' : 'لا',
      'مميزة': d.isFeatured === true ? 'نعم' : 'لا',
      'أولوية العرض': num(d.priority, 0),
      // إحصائيات
      'عدد البرامج': num(stats.programsCount, 0),
      'عدد المشتركين': num(stats.subscribersCount, 0),
      'إجمالي مرات الاستماع': num(stats.totalPlays, 0),
    };
  });
}

export function createStationWorkbook(records: StationExportRow[]): XLSX.WorkBook {
  const rows = buildStationExcelData(records);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set RTL property on the worksheet
  worksheet['!views'] = [{ rightToLeft: true }];

  // Column width suggestions based on content headers
  worksheet['!cols'] = [
    { wch: 18 }, // المعرّف
    { wch: 24 }, // اسم المحطة
    { wch: 20 }, // الاسم بالإنجليزية
    { wch: 28 }, // العبارة التعريفية
    { wch: 35 }, // نبذة عن المحطة
    { wch: 12 }, // التردد
    { wch: 14 }, // المدينة
    { wch: 12 }, // رمز المدينة
    { wch: 10 }, // البلد
    { wch: 32 }, // رابط البث الأساسي
    { wch: 20 }, // بروتوكول البث الأساسي
    { wch: 26 }, // خادم / نطاق البث الأساسي
    { wch: 16 }, // منفذ البث الأساسي
    { wch: 32 }, // رابط البث الاحتياطي
    { wch: 20 }, // بروتوكول البث الاحتياطي
    { wch: 20 }, // نوع خادم البث
    { wch: 16 }, // ترميز الصوت
    { wch: 16 }, // معدل البت (kbps)
    { wch: 16 }, // معدل العينة (Hz)
    { wch: 18 }, // قدرة جهاز الإرسال
    { wch: 26 }, // موقع برج الإرسال
    { wch: 24 }, // نطاق التغطية الجغرافية
    { wch: 22 }, // نظام بيانات الراديو (RDS)
    { wch: 22 }, // الجهة المالكة / المالك
    { wch: 28 }, // المقر / العنوان
    { wch: 20 }, // مسؤول التواصل
    { wch: 18 }, // هاتف التواصل
    { wch: 25 }, // البريد الإلكتروني
    { wch: 28 }, // الموقع الإلكتروني
    { wch: 28 }, // رابط فيسبوك
    { wch: 28 }, // رابط إنستغرام
    { wch: 28 }, // رابط يوتيوب
    { wch: 28 }, // رابط إكس / تويتر
    { wch: 18 }, // واتساب
    { wch: 32 }, // رابط الشعار
    { wch: 32 }, // رابط الصورة المصغرة
    { wch: 12 }, // بث مباشر
    { wch: 16 }, // مفعّلة في التطبيق
    { wch: 10 }, // موثقة
    { wch: 10 }, // مميزة
    { wch: 12 }, // أولوية العرض
    { wch: 12 }, // عدد البرامج
    { wch: 14 }, // عدد المشتركين
    { wch: 18 }, // إجمالي مرات الاستماع
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المحطات');
  return workbook;
}

export function exportStationsToExcel(
  records: StationExportRow[],
  root = 'HudHudDev',
  filename?: string,
): { success: boolean; count: number; filename: string } {
  const dateStr = new Date().toISOString().slice(0, 10);
  const finalFilename = filename || `hudhud-stations-${root}-${dateStr}.xlsx`;
  const workbook = createStationWorkbook(records);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    XLSX.writeFile(workbook, finalFilename, { compression: true });
  }

  return {
    success: true,
    count: records.length,
    filename: finalFilename,
  };
}
