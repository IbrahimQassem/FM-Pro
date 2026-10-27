export type ExportPart = { filename: string; count: number };
export type ExportState<T> = {
  identity: string; startedAt: string; evaluationTime: number; cursor?: string;
  examined: number; matched: number; pending: T[]; parts: ExportPart[]; complete: boolean;
};
export function startExport<T>(identity: string, startedAt = new Date().toISOString()): ExportState<T> {
  return { identity, startedAt, evaluationTime: Date.parse(startedAt), examined: 0, matched: 0,
    pending: [], parts: [], complete: false };
}
export async function advanceExport<T>(state: ExportState<T>, identity: string,
  batch: { records: T[]; rawCount: number; cursor?: string; exhausted: boolean },
  writePart: (rows: T[], index: number) => Promise<string>): Promise<ExportState<T>> {
  if (identity !== state.identity || state.complete || !Number.isSafeInteger(batch.rawCount) ||
      batch.rawCount < 0 || batch.rawCount > 200 || batch.records.length > batch.rawCount ||
      state.pending.length >= 800 || (!batch.exhausted && (!batch.cursor || batch.cursor === state.cursor)) ||
      (batch.exhausted && batch.rawCount === 200)) throw new Error('Invalid export continuation.');
  const pending = [...state.pending, ...batch.records];
  if (pending.length > 1000) throw new Error('Export part exceeds its memory budget.');
  let parts = state.parts;
  // Flush at800 so the next200-document request can never grow a part beyond1000.
  // At most one writer runs per checkpoint; only successful output advances it.
  const flush = pending.length >= 800 || batch.exhausted;
  if (flush && pending.length) {
    const filename = await writePart(pending, parts.length + 1);
    parts = [...parts, { filename, count: pending.length }];
  }
  return { ...state, examined: state.examined + batch.rawCount, matched: state.matched + batch.records.length,
    cursor: batch.cursor ?? state.cursor, pending: flush ? [] : pending, parts, complete: batch.exhausted };
}
export async function exportManifest<T>(state: ExportState<T>) {
  return { version: 1, scope: 'all-matching', queryFingerprint: await opaqueQueryFingerprint(state.identity),
    serverOrder: 'id_asc', startedAt: state.startedAt, examined: state.examined,
    matchedSoFar: state.matched, written: state.parts.reduce((sum, part) => sum + part.count, 0),
    pending: state.pending.length, complete: state.complete, parts: state.parts,
    consistency: 'Cursor scan; concurrent writes may require refresh. Not a transactionally fixed snapshot.',
    resume: 'In-memory checkpoint; keep this page open to resume. Downloaded parts may be repeated after an interrupted file write.' };
}
export async function downloadExportManifest<T>(state: ExportState<T>, filename: string) {
  downloadJsonManifest(await exportManifest(state), filename);
}
export function downloadJsonManifest(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  } finally { URL.revokeObjectURL(url); }
}

// Only opaque digests leave memory; raw query identity remains private to the running job.
export async function pageExportManifest(details: {
  identity: string; scope: 'current-page' | 'visible-scan-page';
  root: 'HudHudDev' | 'HudHudOfficial'; count: number; filename: string; asOf: string;
}) {
  return { version: 1, scope: details.scope, root: details.root,
    queryFingerprint: await opaqueQueryFingerprint(details.identity), count: details.count, complete: true,
    filename: details.filename, asOf: details.asOf,
    consistency: 'Exactly the currently displayed page; not a dataset total.' };
}

async function opaqueQueryFingerprint(identity: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  return 'sha256:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
