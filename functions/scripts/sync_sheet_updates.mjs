import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const expectedProjectId = 'sanadev-fm';
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

async function run() {
  for (const root of targetRoots) {
    console.log(`\n--- Processing Root: ${root} ---`);
    const stationsCol = db.collection(root).doc('stations').collection('stations');
    const locationsCol = db.collection(root).doc('locations').collection('locations');

    // Check location ye-socotra
    const locDoc = await locationsCol.doc(socotraLocation.id).get();
    if (!locDoc.exists) {
      console.log(`[+] Location to create: ${root}/locations/locations/${socotraLocation.id} (${socotraLocation.data.cityNameAr})`);
      if (shouldApply) {
        await locationsCol.doc(socotraLocation.id).set(socotraLocation.data);
      }
    } else {
      console.log(`[=] Location already exists: ${root}/locations/locations/${socotraLocation.id}`);
    }

    // Check and create new stations
    for (const st of newStations) {
      const doc = await stationsCol.doc(st.id).get();
      if (!doc.exists) {
        console.log(`[+] New Station to create: ${st.id} - ${st.data.name} (Frequency: ${st.data.frequency}, Live: ${st.data.isLive})`);
        if (shouldApply) {
          await stationsCol.doc(st.id).set(st.data);
        }
      } else {
        console.log(`[=] Station already exists: ${st.id} - ${st.data.name}`);
      }
    }

    // Check and upgrade live streams on existing stations
    for (const up of streamUpgrades) {
      const doc = await stationsCol.doc(up.id).get();
      if (doc.exists) {
        const currentUrl = doc.get('streamUrl');
        if (currentUrl !== up.updates.streamUrl) {
          console.log(`[^] Stream upgrade for ${up.id} (${up.name}):\n    From: ${currentUrl}\n    To:   ${up.updates.streamUrl}`);
          if (shouldApply) {
            await stationsCol.doc(up.id).update(up.updates);
          }
        } else {
          console.log(`[=] Stream already updated for ${up.id} (${up.name})`);
        }
      } else {
        console.log(`[!] Warning: Existing station ${up.id} not found in ${root}`);
      }
    }
  }

  console.log('\n====================================================');
  if (shouldApply) {
    console.log('✅ ALL UPDATES APPLIED TO FIRESTORE SUCCESSFULLY!');
  } else {
    console.log('🔍 DRY RUN COMPLETE — No changes were written to Firestore.');
    console.log('To apply these changes, run:');
    console.log('  node scripts/sync_sheet_updates.mjs --apply');
  }
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});
