import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildStationExcelData,
  createStationWorkbook,
  exportStationsToExcel,
  type StationExportRow,
} from '../lib/export-excel.ts';

void test('buildStationExcelData formats all station fields and Arabic column headers correctly', () => {
  const sampleRecords: StationExportRow[] = [
    {
      id: 'sanaa-fm',
      data: {
        name: 'إذاعة صنعاء',
        nameEn: 'Sanaa FM',
        tagline: 'صوت اليمن',
        description: 'إذاعة يمنية رائدة تبث من العاصمة',
        frequency: '92.5 MHz',
        cityNameAr: 'صنعاء',
        cityCode: 'sanaa',
        countryNameAr: 'اليمن',
        owner: 'المؤسسة العامة للإذاعة والتلفزيون',
        address: 'شارع الزبيري، صنعاء',
        contactPerson: 'أحمد علي',
        contactPhone: '+967-1-200000',
        contactEmail: 'contact@sanaafm.ye',
        websiteUrl: 'https://sanaafm.ye',
        facebookUrl: 'https://facebook.com/sanaafm',
        instagramUrl: 'https://instagram.com/sanaafm',
        youtubeUrl: 'https://youtube.com/@sanaafm',
        twitterUrl: 'https://x.com/sanaafm',
        whatsapp: '+967770000000',
        streamUrl: 'https://stream.sanaafm.ye:8000/live',
        backupStreamUrl: 'http://backup.sanaafm.ye/live',
        streamType: 'Icecast',
        audioCodec: 'AAC+',
        bitrateKbps: '128',
        sampleRateHz: '44100',
        transmitterPower: '5 kW',
        transmitterLocation: 'جبل عيبان',
        coverageArea: 'صنعاء وضواحيها',
        rds: 'SANAA FM',
        logoUrl: 'https://sanaafm.ye/logo.png',
        thumbnailUrl: 'https://sanaafm.ye/thumb.png',
        isLive: true,
        isActive: true,
        isVerified: true,
        isFeatured: false,
        priority: 100,
        stats: {
          programsCount: 15,
          subscribersCount: 1200,
          totalPlays: 45000,
        },
      },
    },
  ];

  const rows = buildStationExcelData(sampleRecords);
  assert.equal(rows.length, 1);
  const row = rows[0];

  assert.equal(row['المعرّف'], 'sanaa-fm');
  assert.equal(row['اسم المحطة'], 'إذاعة صنعاء');
  assert.equal(row['الاسم بالإنجليزية'], 'Sanaa FM');
  assert.equal(row['التردد'], '92.5 MHz');
  assert.equal(row['رابط البث الأساسي'], 'https://stream.sanaafm.ye:8000/live');
  assert.equal(row['بروتوكول البث الأساسي'], 'HTTPS');
  assert.equal(row['خادم / نطاق البث الأساسي'], 'stream.sanaafm.ye');
  assert.equal(row['منفذ البث الأساسي'], '8000');
  assert.equal(row['رابط البث الاحتياطي'], 'http://backup.sanaafm.ye/live');
  assert.equal(row['بروتوكول البث الاحتياطي'], 'HTTP');
  assert.equal(row['نوع خادم البث'], 'Icecast');
  assert.equal(row['ترميز الصوت'], 'AAC+');
  assert.equal(row['معدل البت (kbps)'], '128');
  assert.equal(row['معدل العينة (Hz)'], '44100');
  assert.equal(row['قدرة جهاز الإرسال'], '5 kW');
  assert.equal(row['موقع برج الإرسال'], 'جبل عيبان');
  assert.equal(row['نطاق التغطية الجغرافية'], 'صنعاء وضواحيها');
  assert.equal(row['نظام بيانات الراديو (RDS)'], 'SANAA FM');
  assert.equal(row['الجهة المالكة / المالك'], 'المؤسسة العامة للإذاعة والتلفزيون');
  assert.equal(row['المقر / العنوان'], 'شارع الزبيري، صنعاء');
  assert.equal(row['مسؤول التواصل'], 'أحمد علي');
  assert.equal(row['هاتف التواصل'], '+967-1-200000');
  assert.equal(row['البريد الإلكتروني'], 'contact@sanaafm.ye');
  assert.equal(row['الموقع الإلكتروني'], 'https://sanaafm.ye');
  assert.equal(row['رابط فيسبوك'], 'https://facebook.com/sanaafm');
  assert.equal(row['رابط إنستغرام'], 'https://instagram.com/sanaafm');
  assert.equal(row['رابط يوتيوب'], 'https://youtube.com/@sanaafm');
  assert.equal(row['رابط إكس / تويتر'], 'https://x.com/sanaafm');
  assert.equal(row['واتساب'], '+967770000000');
  assert.equal(row['بث مباشر'], 'نعم');
  assert.equal(row['مفعّلة في التطبيق'], 'نعم');
  assert.equal(row['موثقة'], 'نعم');
  assert.equal(row['مميزة'], 'لا');
  assert.equal(row['أولوية العرض'], 100);
  assert.equal(row['عدد البرامج'], 15);
  assert.equal(row['عدد المشتركين'], 1200);
  assert.equal(row['إجمالي مرات الاستماع'], 45000);
});

void test('createStationWorkbook sets sheet name, RTL view and columns', () => {
  const sampleRecords: StationExportRow[] = [
    {
      id: 'aden-fm',
      data: {
        name: 'إذاعة عدن',
        frequency: '98.0 MHz',
        cityNameAr: 'عدن',
      },
    },
  ];

  const workbook = createStationWorkbook(sampleRecords);
  assert.ok(workbook.Sheets['المحطات'], 'Sheet "المحطات" must exist');
  assert.deepEqual(workbook.SheetNames, ['المحطات']);
  const sheet = workbook.Sheets['المحطات'];
  assert.ok(Array.isArray(sheet['!cols']), 'Column definitions must exist');
  assert.ok(sheet['!views']?.[0]?.rightToLeft === true, 'RTL view must be set');
});

void test('exportStationsToExcel generates filename with root and date', () => {
  const result = exportStationsToExcel([], 'HudHudOfficial');
  assert.equal(result.success, true);
  assert.equal(result.count, 0);
  assert.match(result.filename, /^hudhud-stations-HudHudOfficial-\d{4}-\d{2}-\d{2}\.xlsx$/);
});
