import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCommentCountFence, CommentCountMaintenanceError } from '../functions/lib/comment-count-maintenance.js';
import { prepareNewEpisodeCountBaseline } from '../functions/lib/comment-counts.js';

async function main() {
const projectId = 'demo-hudhud-admin-preview';
assert.equal(process.env.GCLOUD_PROJECT, projectId);
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8180');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
const require = createRequire(new URL('../functions/package.json', import.meta.url));
require('firebase-admin/app').initializeApp({projectId});
const auth = require('firebase-admin/auth').getAuth();
const firestore = require('firebase-admin/firestore').getFirestore();
const uid = 'preview-admin';
try { await auth.getUser(uid); } catch (error) {
  if (error.code !== 'auth/user-not-found') throw error;
  await auth.createUser({uid,email:'preview-admin@example.test',password:'HudHud-preview-only-2026',emailVerified:true});
}
await auth.setCustomUserClaims(uid,{admin:true});
if (process.argv.includes('--timing-only')) {
  const now = Date.now();
  const startAt = new Date(now + 30000);
  const expiresAt = new Date(now + 60000);
  await firestore.doc('HudHudDev/banners/banners/preview-timing').set({
    title: 'إعلان اختبار الانتقال الزمني', imageUrl: 'https://example.test/banner.jpg',
    priority: 0, isActive: true, startAt, expiresAt,
  });
  console.log(JSON.stringify({ startAt, expiresAt }));
} else if (process.argv.includes('--overview-only')) {
  const preview = firestore.batch();
  for (let i = 0; i < 3; i++) preview.set(firestore.doc(`HudHudDev/users/users/overview-reporter/commentReportEpisodes/overview-episode/moderationReports/overview-${i}`), { targetType: 'comment', episodeId: 'overview-episode', commentId: i === 0 ? 'invalid/comment-path' : `overview-${i}`, reportedAuthorId: 'overview-author', reason: 'spam', details: 'بلاغ تجريبي لاختبار العدادات', status: i === 0 ? 'open' : 'dismissed', ...(i === 1 ? { resolution: 'noAction', reviewedAt: new Date(), reviewedBy: 'preview-admin' } : {}), createdAt: new Date() });
  preview.set(firestore.doc('HudHudDev/users/users/overview-reporter/userReportTargets/overview-author/moderationReports/preview-user-report'), {
    targetType: 'user', episodeId: 'episode-1', commentId: 'preview-user-report',
    reportedAuthorId: 'overview-author', reason: 'spam', details: 'بلاغ مستخدم تجريبي للتحقق من سياق الحلقة والبرنامج',
    status: 'dismissed', resolution: 'noAction', reviewedAt: new Date(), reviewedBy: uid, createdAt: new Date(),
  });
  await preview.commit();
  console.log('Added one open comment report, two closed comment reports and one closed user report.');
} else if (process.argv.includes('--large-only')) {
  // Add records after the base 55 without overwriting earlier review edits.
  for (let first = 56; first <= 305; first += 100) {
    const page = firestore.batch();
    for (let i = first; i < Math.min(first + 100, 306); i++) {
      const id = String(i).padStart(3, '0');
      const location = { countryCode: 'YE', countryNameAr: 'اليمن', cityCode: `city-${id}`, cityNameAr: `مدينة تجريبية ${i}` };
      page.set(firestore.doc(`HudHudDev/locations/locations/city-${id}`), { ...location, sortOrder: i, isActive: true });
      page.set(firestore.doc(`HudHudDev/stations/stations/station-${id}`), { ...location, name: `إذاعة تجريبية ${i}`, streamUrl: 'https://example.test/live', description: 'بيانات اختبار الصفحات فقط.', priority: 0, isActive: true, isFeatured: false, isLive: true, isVerified: false, stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 } });
    }
    await page.commit();
  }
  console.log('Added demo stations and cities 56–305.');
} else {
const entries = [];
const batch = { set: (ref, data) => entries.push({ path: ref.path, data }) };
const root = 'HudHudDev';
if (!process.argv.includes('--banners-only')) {
for (let i=1;i<=55;i++) {
  const id=String(i).padStart(3,'0');
  batch.set(firestore.doc(`${root}/locations/locations/city-${id}`),{countryCode:'YE',countryNameAr:'اليمن',cityCode:`city-${id}`,cityNameAr:i===1?'صنعاء':`مدينة تجريبية ${i}`,sortOrder:i,isActive:true});
  batch.set(firestore.doc(`${root}/stations/stations/station-${id}`),{name:i===1?'إذاعة هدهد — صوت اليمن':`إذاعة تجريبية ${i}`,nameEn:`Preview Radio ${i}`,tagline:'صوت قريب منك',description:'بيانات تجريبية لمراجعة لوحة الإدارة محليًا.',streamUrl:'https://example.test/live',countryCode:'YE',countryNameAr:'اليمن',cityCode:`city-${id}`,cityNameAr:i===1?'صنعاء':`مدينة تجريبية ${i}`,frequency:'100.1',priority:56-i,isActive:true,isFeatured:i<4,isLive:true,isVerified:true,stats:{programsCount:i===1?2:0,subscribersCount:0,totalPlays:0}});
}
for(let i=1;i<=2;i++) batch.set(firestore.doc(`${root}/programs/programs/program-${i}`),{stationId:'station-001',title:i===1?'صباح اليمن':'حكايات المساء',description:'برنامج تجريبي للمراجعة.',titleEn:'',coverUrl:'',thumbnailUrl:'',categories:['ثقافة'],presenters:['فريق هدهد'],priority:i,isActive:true,isFeatured:true,schedule:null,stats:{episodesCount:i===1?3:0,subscribersCount:0,totalPlays:0}});
for(let i=1;i<=3;i++) batch.set(firestore.doc(`${root}/episodes/episodes/episode-${i}`),{programId:'program-1',stationId:'station-001',title:`حكاية من اليمن — الحلقة ${i}`,description:'حلقة تجريبية',audioUrl:'https://example.test/audio.mp3',durationSeconds:1800,coverUrl:'',presenter:'فريق هدهد',guest:'',priority:i,isPublished:i!==3,isFeatured:i===1,broadcastAt:new Date(),utcOffsetMinutes:180,publishedAt:null,stats:{playsCount:0,likesCount:0,commentsCount:0}});
}
for (const [id, title, isActive, startAt, expiresAt] of [
  ['visible', 'إعلان ظاهر', true, null, null],
  ['upcoming', 'إعلان قادم', true, new Date('2099-01-01'), null],
  ['expired', 'إعلان منتهٍ', true, null, new Date('2000-01-01')],
  ['inactive', 'إعلان غير مفعّل', false, null, null],
]) batch.set(firestore.doc(`${root}/banners/banners/preview-${id}`), { title, imageUrl: 'https://example.test/banner.jpg', priority: 0, isActive, startAt, expiresAt });
await applyAdminPreviewPlan({ firestore, entries });
console.log('Demo admin and synthetic content fixtures are ready.');

}
}

export async function applyAdminPreviewPlan({ firestore, entries }) {
  const episodes = entries.filter(entry => /^(HudHudDev|HudHudOfficial)\/episodes\/episodes\/[^/]+$/.test(entry.path));
  if (entries.length > 500) throw Object.assign(new Error('Oversized atomic preview plan.'), { code: 'invalid-argument' });
  await firestore.runTransaction(async tx => {
    for (const root of new Set(episodes.map(entry => entry.path.split('/')[0]))) await readCommentCountFence(tx, firestore, root);
    const writes = [];
    for (const entry of entries) {
      const ref = firestore.doc(entry.path); let data = entry.data;
      if (episodes.includes(entry)) {
        const current = await tx.get(ref);
        if (current.exists) {
          if (current.get('adminDeletionToken')) throw new CommentCountMaintenanceError();
          const { commentsCount: ignored, ...stats } = data.stats ?? {}; void ignored;
          if (Object.hasOwn(current.data().stats ?? {}, 'commentsCount')) stats.commentsCount = current.get('stats.commentsCount');
          data = { ...data, stats };
        } else {
          const birth = await prepareNewEpisodeCountBaseline(tx, firestore, { root: entry.path.split('/')[0], episodeId: entry.path.split('/')[3] });
          if (birth.mode === 'active') data = { ...data, stats: { ...data.stats, commentsCount: 0 } };
          writes.push(...birth.writes);
        }
      }
      writes.push(() => tx.set(ref, data));
    }
    if (writes.length > 500) throw Object.assign(new Error('Oversized atomic preview plan.'), { code: 'invalid-argument' });
    for (const write of writes) write();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
