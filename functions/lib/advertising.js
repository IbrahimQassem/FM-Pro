import { randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { assertSuperAdminCaller } from './user-management.js';

const roots = ['HudHudDev', 'HudHudOfficial'];
export const placements = ['home.sponsor'];
const platforms = ['app', 'web'];
const fail = (message = 'Invalid advertising request.') => { throw new HttpsError('invalid-argument', message); };
const path = (root, kind, id) => `${root}/${kind}/${kind === 'adCampaigns' ? 'campaigns' : kind === 'adDeliveries' ? 'deliveries' : 'advertisers'}/${id}`;
const idValid = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
function string(value, max, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail();
  return value.trim();
}
export function advertisingRequest(data) {
  if (!data || data.version !== 1 || !roots.includes(data.root)) fail();
  return data;
}
export function safeAdUrl(value, optional = false) {
  if (optional && !value) return '';
  const text = string(value, 2048);
  let url;
  try { url = new URL(text); } catch { fail('Use a public HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) ||
      /(^|\.)(localhost|local|internal|test|invalid|example)$/i.test(url.hostname)) fail('Use a public HTTPS URL.');
  return url.href;
}
export function validateCampaign(value) {
  if (!value || !idValid(value.advertiserId) || !['draft', 'active', 'paused'].includes(value.status)) fail();
  for (const [key, allowed] of [['platforms', platforms], ['placements', placements]]) {
    if (!Array.isArray(value[key]) || !value[key].length || value[key].length > allowed.length ||
        new Set(value[key]).size !== value[key].length || value[key].some(item => !allowed.includes(item))) fail();
  }
  if (!Number.isSafeInteger(value.startAt) || !Number.isSafeInteger(value.endAt) || value.startAt < 0 ||
      value.endAt <= value.startAt || value.endAt > 8640000000000000 ||
      !Number.isInteger(value.priority) || value.priority < 0 || value.priority > 1000) fail();
  const creative = value.creative;
  if (!creative || !['image', 'sponsorship'].includes(creative.kind)) fail();
  return {
    schemaVersion: 1, name: string(value.name, 120), advertiserId: value.advertiserId,
    status: value.status, startAt: value.startAt, endAt: value.endAt,
    platforms: value.platforms, placements: value.placements, priority: value.priority,
    creative: { kind: creative.kind, title: string(creative.title, 100),
      body: string(creative.body, 240, true), imageUrl: creative.kind === 'image' ? safeAdUrl(creative.imageUrl) : '',
      targetUrl: safeAdUrl(creative.targetUrl, true) },
    agreementReference: string(value.agreementReference, 120, true),
    agreementNotes: string(value.agreementNotes, 1000, true),
  };
}
export function eligible(campaign, advertiser, platform, placement, now) {
  return advertiser?.isActive === true && campaign?.schemaVersion === 1 && campaign.status === 'active' &&
    campaign.startAt <= now && now < campaign.endAt &&
    campaign.platforms?.includes(platform) && campaign.placements?.includes(placement);
}

export async function advertisingAdmin({ firestore, request, now = Date.now() }) {
  assertSuperAdminCaller(request);
  const data = advertisingRequest(request.data);
  const { root, action } = data;
  if (action === 'list') {
    if (!['advertisers', 'adCampaigns'].includes(data.kind)) fail();
    let query = firestore.collection(path(root, data.kind, '_').slice(0, -2)).orderBy('__name__').limit(50);
    if (data.after !== undefined) { if (!idValid(data.after)) fail(); query = query.startAfter(data.after); }
    const snapshot = await query.get();
    return { version: 1, items: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })),
      next: snapshot.size === 50 ? snapshot.docs.at(-1).id : null };
  }
  if (action === 'report') {
    if (!idValid(data.campaignId) || !/^\d{4}-\d{2}-\d{2}$/.test(data.from) || !/^\d{4}-\d{2}-\d{2}$/.test(data.to)) fail();
    const start = Date.parse(data.from), end = Date.parse(data.to);
    if (!Number.isFinite(start + end) || end < start || end - start > 92 * 86400000 ||
        new Date(start).toISOString().slice(0, 10) !== data.from || new Date(end).toISOString().slice(0, 10) !== data.to) fail();
    const snapshot = await firestore.collection(`${path(root, 'adCampaigns', data.campaignId)}/daily`)
      .where('date', '>=', data.from).where('date', '<=', data.to).limit(200).get();
    return { version: 1, rows: snapshot.docs.map(doc => doc.data()), measurement: 'client-reported, not audited' };
  }
  if (!['saveAdvertiser', 'saveCampaign'].includes(action)) fail();
  if (data.id !== undefined && !idValid(data.id)) fail();
  const id = data.id ?? randomUUID();
  const kind = action === 'saveAdvertiser' ? 'advertisers' : 'adCampaigns';
  let value;
  if (kind === 'advertisers') {
    if (typeof data.value?.isActive !== 'boolean') fail();
    value = { schemaVersion: 1, name: string(data.value.name, 120), isActive: data.value.isActive };
  } else value = validateCampaign(data.value);
  const reference = firestore.doc(path(root, kind, id));
  await firestore.runTransaction(async tx => {
    const current = await tx.get(reference);
    if (current.exists ? data.revision !== current.get('revision') : data.revision != null) {
      throw new HttpsError('aborted', 'The record changed. Reload before saving.');
    }
    const control = firestore.doc(`${root}/advertising`);
    await tx.get(control);
    if (kind === 'adCampaigns') {
      const advertiser = await tx.get(firestore.doc(path(root, 'advertisers', value.advertiserId)));
      if (!advertiser.exists || (value.status === 'active' && advertiser.get('isActive') !== true)) {
        throw new HttpsError('failed-precondition', 'Choose an active advertiser.');
      }
      if (value.status === 'active' && current.get('status') !== 'active') {
        const active = await tx.get(firestore.collection(path(root, kind, '_').slice(0, -2)).where('status', '==', 'active').limit(100));
        if (active.size >= 100) throw new HttpsError('resource-exhausted', 'Pause an active campaign before adding another.');
      }
    }
    tx.set(reference, { ...value, revision: (current.get('revision') ?? 0) + 1,
      createdAt: current.get('createdAt') ?? now, updatedAt: now });
    tx.set(control, { revision: FieldValue.increment(1) }, { merge: true });
  });
  return { version: 1, id };
}

export async function serveAds({ firestore, data, now = Date.now() }) {
  const { root, platform, placement } = advertisingRequest(data);
  if (!platforms.includes(platform) || !placements.includes(placement)) fail();
  const snapshot = await firestore.collection(path(root, 'adCampaigns', '_').slice(0, -2)).where('status', '==', 'active').limit(100).get();
  const candidates = snapshot.docs.filter(doc => eligible(doc.data(), { isActive: true }, platform, placement, now))
    .sort((a, b) => b.get('priority') - a.get('priority') || a.id.localeCompare(b.id));
  for (const candidate of candidates) {
    const deliveryId = randomUUID();
    const result = await firestore.runTransaction(async tx => {
      const current = await tx.get(candidate.ref);
      if (!current.exists) return null;
      let campaign;
      try { campaign = validateCampaign(current.data()); } catch { return null; }
      const advertiser = await tx.get(firestore.doc(path(root, 'advertisers', campaign.advertiserId)));
      if (!eligible(campaign, advertiser.data(), platform, placement, now)) return null;
      const expiresAt = Math.min(now + 60000, campaign.endAt);
      tx.create(firestore.doc(path(root, 'adDeliveries', deliveryId)), {
        campaignId: current.id, advertiserId: campaign.advertiserId, platform, placement,
        campaignRevision: current.get('revision'), expiresAt, impression: false, click: false,
        deleteAfter: Timestamp.fromMillis(now + 86400000),
      });
      return { version: 1, ad: { ...campaign.creative, campaignId: current.id, deliveryId, expiresAt, validForMs: expiresAt - now,
        sponsor: advertiser.get('name'), placement } };
    });
    if (result) return result;
  }
  return { version: 1, ad: null };
}

export async function recordAdEvent({ firestore, data, now = Date.now() }) {
  const { root, deliveryId, event } = advertisingRequest(data);
  if (!idValid(deliveryId) || !['impression', 'click'].includes(event)) fail();
  const reference = firestore.doc(path(root, 'adDeliveries', deliveryId));
  return firestore.runTransaction(async tx => {
    const receipt = await tx.get(reference);
    if (!receipt.exists || receipt.get('expiresAt') <= now) return { accepted: false };
    if (receipt.get(event) === true) return { accepted: true, duplicate: true };
    const campaignRef = firestore.doc(path(root, 'adCampaigns', receipt.get('campaignId')));
    const campaign = await tx.get(campaignRef);
    const advertiser = await tx.get(firestore.doc(path(root, 'advertisers', receipt.get('advertiserId'))));
    if (!eligible(campaign.data(), advertiser.data(), receipt.get('platform'), receipt.get('placement'), now) ||
        campaign.get('revision') !== receipt.get('campaignRevision')) return { accepted: false };
    if (event === 'click' && !campaign.get('creative.targetUrl')) return { accepted: false };
    const date = new Date(now).toISOString().slice(0, 10);
    const platform = receipt.get('platform'), placement = receipt.get('placement');
    tx.update(reference, { [event]: true });
    tx.set(campaignRef.collection('daily').doc(`${date}_${platform}_${placement}`), {
      date, platform, placement, [event === 'click' ? 'clicks' : 'impressions']: FieldValue.increment(1),
    }, { merge: true });
    return { accepted: true, duplicate: false };
  });
}

export async function collectAdDeliveries(firestore, now = Date.now()) {
  for (const root of roots) {
    const expired = await firestore.collection(path(root, 'adDeliveries', '_').slice(0, -2))
      .where('deleteAfter', '<=', Timestamp.fromMillis(now)).limit(400).get();
    if (!expired.empty) {
      const batch = firestore.batch();
      expired.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }
}
