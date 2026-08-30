import { readFile } from 'node:fs/promises';

const seed = JSON.parse(
  await readFile(new URL('./development_seed.json', import.meta.url), 'utf8'),
);

const targets = [
  ...seed.stations.map((entry) => ({
    kind: 'station-stream',
    id: entry.id,
    url: entry.data.streamUrl,
  })),
  ...seed.programs.flatMap((entry) =>
    ['coverUrl', 'thumbnailUrl']
      .filter((key) => entry.data[key])
      .map((key) => ({
        kind: `program-${key}`,
        id: entry.id,
        url: entry.data[key],
      })),
  ),
  ...seed.episodes.map((entry) => ({
    kind: 'episode-audio',
    id: entry.id,
    url: entry.data.audioUrl,
  })),
  ...seed.episodes
    .filter((entry) => entry.data.coverUrl)
    .map((entry) => ({
      kind: 'episode-cover',
      id: entry.id,
      url: entry.data.coverUrl,
    })),
  ...seed.banners.map((entry) => ({
    kind: 'banner-image',
    id: entry.id,
    url: entry.data.imageUrl,
  })),
];

const results = await Promise.all(targets.map(checkTarget));
const failures = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(
    `${result.ok ? 'OK' : 'FAIL'} ${result.kind}:${result.id} ` +
      `${result.status ?? result.reason}`,
  );
}
console.log(
  `Verified ${results.length - failures.length}/${results.length} demo URLs.`,
);
if (failures.length > 0) process.exitCode = 1;

async function checkTarget(target) {
  const uri = new URL(target.url);
  if (uri.protocol !== 'https:') {
    return { ...target, ok: false, reason: 'non-https' };
  }
  try {
    const response = await fetch(uri, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    return {
      ...target,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
    };
  } catch (error) {
    const causeCode = error?.cause?.code;
    return {
      ...target,
      ok: false,
      reason: causeCode ?? (error instanceof Error ? error.name : 'request-error'),
    };
  }
}
