import { validatePublicStationWrite } from '../../tool/firebase_seed/seed_contract.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const expectedProjectId = 'sanadev-fm';
// 1. Location definition for Socotra
const socotraLocation = {
  id: 'ye-socotra',
  data: {
    countryCode: 'YE',
    countryNameAr: 'اليمن',
    cityCode: 'socotra',
    cityNameAr: 'سقطرى',
    sortOrder: 85,
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
  },
};

// 2. The 7 new stations from the Google Sheet
const newStations = [
  {
    id: 'so1_82',
    data: {
      name: 'إذاعة سقطرى إف إم',
      nameEn: 'Socotra FM',
      tagline: 'صوت أرخبيل سقطرى والمجتمع السقطري',
      description: 'إذاعة محلية مجتمعية تبث من أرخبيل سقطرى وتهتم بالقضايا التنموية والتراثية والخدمية للمواطنين مع خادم بث رقمي متصل.',
      frequency: 'FM / Online',
      cityCode: 'socotra',
      cityNameAr: 'سقطرى',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      streamUrl: 'https://radio.socotra.fm:8308/1',
      backupStreamUrl: '',
      logoUrl: '',
      thumbnailUrl: '',
      isActive: true,
      isLive: true,
      isVerified: true,
      isFeatured: false,
      priority: 5,
      tags: ['مجتمعي', 'محلي', 'سقطرى'],
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      healthStatus: 'online',
      consecutiveFailures: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'b1_83',
    data: {
      name: 'إذاعة بلقيس',
      nameEn: 'Belqees Radio',
      tagline: 'صوت اليمن من كل مكان',
      description: 'البث الإذاعي لقناة بلقيس الإخبارية على موجة 94.3 FM ويغطي العاصمة المؤقتة عدن ومحافظتي تعز ولحج.',
      frequency: '94.3 MHz',
      cityCode: 'aden',
      cityNameAr: 'عدن',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      streamUrl: 'https://placeholder.invalid/stream',
      backupStreamUrl: '',
      logoUrl: '',
      thumbnailUrl: '',
      isActive: true,
      isLive: false,
      isVerified: true,
      isFeatured: false,
      priority: 0,
      tags: ['إخباري', 'سياسي', 'عدن', 'تعز', 'لحج'],
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      healthStatus: 'offline',
      consecutiveFailures: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'm2_81',
    data: {
      name: 'إذاعة الأولى إف إم',
      nameEn: 'Al-Oula FM Marib',
      tagline: 'صوت المجتمع في مأرب',
      description: 'إذاعة مجتمعية محلية في محافظة مأرب تركز على القضايا المجتمعية والشبابية والخدمية والتنموية.',
      frequency: '88.7 MHz',
      cityCode: 'marib',
      cityNameAr: 'مأرب',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      streamUrl: 'https://placeholder.invalid/stream',
      backupStreamUrl: '',
      logoUrl: '',
      thumbnailUrl: '',
      isActive: true,
      isLive: false,
      isVerified: true,
      isFeatured: false,
      priority: 0,
      tags: ['مجتمعي', 'مأرب'],
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      healthStatus: 'offline',
      consecutiveFailures: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'm1_78',
    data: {
      name: 'إذاعة الاتحادية FM',
      nameEn: 'Al-Ittihadiah FM',
      tagline: 'صوت اليمن الاتحادي',
      description: 'إذاعة محلية تبث من محافظة مأرب على تردد 88.1 MHz وإدارة محمد الجماعي.',
      frequency: '88.1 MHz',
      cityCode: 'marib',
      cityNameAr: 'مأرب',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      streamUrl: 'https://placeholder.invalid/stream',
      backupStreamUrl: '',
      logoUrl: '',
      thumbnailUrl: '',
      isActive: true,
      isLive: false,
      isVerified: true,
      isFeatured: false,
      priority: 0,
      tags: ['وطني', 'إخباري', 'مأرب'],
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      healthStatus: 'offline',
      consecutiveFailures: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'a13_79',
    data: {
      name: 'إذاعة ابن القيم السلفية',
      nameEn: 'Ibn Al-Qayyim Radio',
      tagline: 'إذاعة دعوية علمية',
      description: 'إذاعة دعوية سلفية تبث في عدن والمحافظات المجاورة موثقة في خارطة اليونسكو.',
      frequency: 'FM',
      cityCode: 'aden',
      cityNameAr: 'عدن',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      streamUrl: 'https://placeholder.invalid/stream',
      backupStreamUrl: '',
      logoUrl: '',
      thumbnailUrl: '',
      isActive: true,
      isLive: false,
      isVerified: true,
      isFeatured: false,
      priority: 0,
      tags: ['دعوي', 'ديني', 'عدن'],
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      healthStatus: 'offline',
      consecutiveFailures: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'j1_80',
    data: {
      name: 'إذاعة الجوف المحلية',
      nameEn: 'Al-Jawf Local Radio',
      tagline: 'صوت الجوف الأصيل',
      description: 'إذاعة محلية رسمية تابعة للسلطة المحلية في محافظة الجوف تبث على تردد 89.1 MHz.',
      frequency: '89.1 MHz',
      cityCode: 'marib',
      cityNameAr: 'الجوف',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      streamUrl: 'https://placeholder.invalid/stream',
      backupStreamUrl: '',
      logoUrl: '',
      thumbnailUrl: '',
      isActive: true,
      isLive: false,
      isVerified: true,
      isFeatured: false,
      priority: 0,
      tags: ['محلي', 'الجوف'],
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      healthStatus: 'offline',
      consecutiveFailures: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'l9_82',
    data: {
      name: 'إذاعة إب',
      nameEn: 'Ibb Radio',
      tagline: 'صوت اللواء الأخضر',
      description: 'إذاعة محلية رسمية تبث من محافظة إب على تردد 96.3 MHz.',
      frequency: '96.3 MHz',
      cityCode: 'taiz',
      cityNameAr: 'إب',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      streamUrl: 'https://placeholder.invalid/stream',
      backupStreamUrl: '',
      logoUrl: '',
      thumbnailUrl: '',
      isActive: true,
      isLive: false,
      isVerified: true,
      isFeatured: false,
      priority: 0,
      tags: ['محلي', 'إب'],
      stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      healthStatus: 'offline',
      consecutiveFailures: 3,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
];

// 3. Upgraded live streams on existing stations
const streamUpgrades = [
  {
    id: 'o12_68',
    name: 'إذاعة 21 سبتمبر (بث رقمي)',
    updates: {
      streamUrl: 'https://sept21.radioca.st/index',
      isLive: true,
      healthStatus: 'online',
      consecutiveFailures: 0,
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'o4_60',
    name: 'راديو دار الحديث السلفية بمأرب',
    updates: {
      streamUrl: 'https://radio4.daralhdeth.com/radio.mp3',
      isLive: true,
      healthStatus: 'online',
      consecutiveFailures: 0,
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
  {
    id: 'rXanPhhzepkgFfDPiOwU',
    name: 'إذاعة دار الحديث السلفية بصبر',
    updates: {
      streamUrl: 'https://radio3.daralhdeth.com/radio.mp3',
      isLive: true,
      healthStatus: 'online',
      consecutiveFailures: 0,
      updatedAt: FieldValue.serverTimestamp(),
    },
  },
];

export async function runSheetSync({
  db, targetRoots = ['HudHudOfficial'], shouldApply = false,
  stations = newStations, upgrades = streamUpgrades, log = console.log,
}) {
  // Validate the entire plan before any reads or writes, including dry runs.
  if (!Array.isArray(targetRoots) || !targetRoots.length ||
      targetRoots.some(root => !['HudHudDev', 'HudHudOfficial'].includes(root))) {
    throw new Error('Invalid sheet sync root.');
  }
  const isTimestamp = value => value instanceof Timestamp ||
    (value instanceof FieldValue && value.isEqual(FieldValue.serverTimestamp()));
  for (const station of stations) validatePublicStationWrite(station.data, { isTimestamp });
  for (const upgrade of upgrades) {
    validatePublicStationWrite(upgrade.updates, { streamUpdate: true, isTimestamp });
  }
  for (const root of targetRoots) {
    log(`\n--- Processing Root: ${root} ---`);
    const stationsCol = db.collection(root).doc('stations').collection('stations');
    const locationsCol = db.collection(root).doc('locations').collection('locations');

    // Check location ye-socotra
    const locDoc = await locationsCol.doc(socotraLocation.id).get();
    if (!locDoc.exists) {
      log('[+] Location to create.');
      if (shouldApply) {
        await locationsCol.doc(socotraLocation.id).set(socotraLocation.data);
      }
    } else {
      log('[=] Location already exists.');
    }

    // Check and create new stations
    for (const st of stations) {
      const doc = await stationsCol.doc(st.id).get();
      if (!doc.exists) {
        log('[+] Station to create.');
        if (shouldApply) {
          await stationsCol.doc(st.id).set(st.data);
        }
      } else {
        log('[=] Station already exists.');
      }
    }

    // Check and upgrade live streams on existing stations
    for (const up of upgrades) {
      const doc = await stationsCol.doc(up.id).get();
      if (doc.exists) {
        const currentUrl = doc.get('streamUrl');
        if (currentUrl !== up.updates.streamUrl) {
          log('[^] Stream update required.');
          if (shouldApply) {
            await stationsCol.doc(up.id).update(up.updates);
          }
        } else {
          log('[=] Stream already updated.');
        }
      } else {
        log('[!] Existing station not found.');
      }
    }
  }

  log('\n====================================================');
  if (shouldApply) {
    log('✅ ALL UPDATES APPLIED TO FIRESTORE SUCCESSFULLY!');
  } else {
    log('🔍 DRY RUN COMPLETE — No changes were written to Firestore.');
    log('To apply these changes, run:');
    log('  node scripts/sync_sheet_updates.mjs --apply');
  }
  log('====================================================');
}

async function main() {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  const targetRoots = args.includes('--both-roots')
    ? ['HudHudOfficial', 'HudHudDev']
    : ['HudHudOfficial'];

  console.log('====================================================');
  console.log('HudHud FM — Google Sheet Sync to Firestore');
  console.log(`Target Project: ${expectedProjectId}`);
  console.log(`Roots: ${targetRoots.join(', ')}`);
  console.log(`Mode: ${shouldApply ? 'APPLY (Live Writes)' : 'DRY-RUN (Simulation)'}`);
  console.log('====================================================\n');

  initializeApp({ projectId: expectedProjectId });
  const db = getFirestore();

  await runSheetSync({ db, targetRoots, shouldApply });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Sheet sync failed; no payload details logged.');
    process.exitCode = 1;
  });
}
