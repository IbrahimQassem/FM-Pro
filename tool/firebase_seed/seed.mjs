import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { buildSeedPlan, validateSeed } from './seed_contract.mjs';
import { readCommentCountFence, CommentCountMaintenanceError } from '../../functions/lib/comment-count-maintenance.js';
import { prepareNewEpisodeCountBaseline, resolveEpisodeCountBaseline } from '../../functions/lib/comment-counts.js';

async function main() {
const expectedProjectId = 'sanadev-fm';
const seedFile = fileURLToPath(
  new URL('./development_seed.json', import.meta.url),
);
const args = process.argv.slice(2);
const projectIndex = args.indexOf('--project');
const projectId = projectIndex >= 0 ? args[projectIndex + 1] : '';
const shouldApply = args.includes('--apply');
const contentOnly = args.includes('--content-only');
const engagementOnly = args.includes('--engagement-only');

if (contentOnly && engagementOnly) {
  throw new Error('Choose either --content-only or --engagement-only.');
}

if (projectId !== expectedProjectId) {
  throw new Error(
    `Refusing to seed project "${projectId || '(missing)'}". ` +
      `Expected "${expectedProjectId}".`,
  );
}

const seed = JSON.parse(await readFile(seedFile, 'utf8'));
const counts = validateSeed(seed, expectedProjectId);
const { entries, stationCountUpdates } = buildSeedPlan(seed, {
  contentOnly,
  engagementOnly,
});

console.log(
  `Seed plan: mode=${engagementOnly ? 'engagement-only' : contentOnly ? 'content-only' : 'full'}, ` +
    `project=${projectId}, root=${seed.root}, ` +
    `locations=${counts.locations}, stations=${counts.stations}, ` +
    `users=${counts.users}, programs=${counts.programs}, ` +
    `episodes=${counts.episodes}, comments=${counts.comments}, ` +
    `favorites=${counts.favorites}, subscriptions=${counts.subscriptions}, ` +
    `banners=${counts.banners}.`,
);

if (!shouldApply) {
  console.log('Dry run only. Re-run with --apply after reviewing the plan.');
  process.exit(0);
}

const { Firestore } = await import('@google-cloud/firestore');
const firestore = new Firestore({ projectId });
await applyDevelopmentSeedPlan({ firestore, entries, stationCountUpdates });
console.log(
  `Created ${entries.length} documents and updated ` +
    `${stationCountUpdates.length} station counters atomically.`,
);
}

export async function applyDevelopmentSeedPlan({ firestore, entries, stationCountUpdates }) {
  // Retain one create-only commit. Never split an oversized relational seed.
  const invalid = () => { throw Object.assign(new Error('Invalid or oversized atomic development seed.'), { code: 'invalid-argument' }); };
  if (!Array.isArray(entries) || !Array.isArray(stationCountUpdates) ||
      entries.some(entry => !entry.path?.startsWith('HudHudDev/')) ||
      stationCountUpdates.some(entry => !entry.path?.startsWith('HudHudDev/')) ||
      new Set(entries.map(entry => entry.path)).size !== entries.length) invalid();
  const episodes = entries.filter(entry => /^HudHudDev\/episodes\/episodes\/[^/]+$/.test(entry.path));
  const comments = entries.filter(entry => /^HudHudDev\/episodes\/episodes\/[^/]+\/comments\/[^/]+$/.test(entry.path));
  if (entries.length + stationCountUpdates.length > 500) invalid();
  await firestore.runTransaction(async tx => {
    const guarded = episodes.length || comments.length;
    const state = guarded ? await readCommentCountFence(tx, firestore, 'HudHudDev') : { mode: 'legacy' };
    if (entries.length + stationCountUpdates.length + (state.mode === 'active' ? episodes.length : 0) > 500) invalid();
    const originals = await Promise.all(entries.map(entry => tx.get(firestore.doc(entry.path))));
    if (originals.some(snapshot => snapshot.exists)) throw Object.assign(new Error('Refusing duplicate create.'), { code: 6 });
    const births = [];
    for (const entry of episodes) {
      const result = await prepareNewEpisodeCountBaseline(tx, firestore, { root: 'HudHudDev', episodeId: entry.path.split('/')[3] });
      births.push(...result.writes);
    }
    if (state.mode === 'active') {
      for (const path of new Set(comments.map(entry => entry.path.split('/').slice(0, 4).join('/')))) {
        if (episodes.some(entry => entry.path === path)) continue;
        const id = path.split('/')[3];
        const [episode, baseline] = await Promise.all([tx.get(firestore.doc(path)), tx.get(firestore.doc(`HudHudDev/commentCountContributions/episodes/${id}`))]);
        if (!episode.exists || episode.get('adminDeletionToken')) throw new CommentCountMaintenanceError();
        resolveEpisodeCountBaseline(baseline, episode, state.fence);
      }
    }
    // Every validation/read above precedes every canonical/private write below.
    for (const entry of entries) {
      const data = state.mode === 'active' && episodes.includes(entry) ? { ...entry.data, stats: { ...entry.data.stats, commentsCount: 0 } } : entry.data;
      tx.create(firestore.doc(entry.path), data);
    }
    for (const update of stationCountUpdates) tx.update(firestore.doc(update.path), { 'stats.programsCount': update.count });
    for (const write of births) write();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
