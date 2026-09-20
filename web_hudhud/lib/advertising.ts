import { getFunctions, httpsCallable } from 'firebase/functions';
import { getPublicApp } from './firebase-client';
import { firestoreRoot } from './firestore-environment';

export type SponsoredAd = { deliveryId: string; title: string; body: string; sponsor: string;
  kind: 'image' | 'sponsorship'; imageUrl: string; targetUrl: string; validForMs: number; expiresAt: number };
export function safeAdUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) && !/(^|\.)(localhost|local|internal|test|invalid|example)$/i.test(url.hostname);
  } catch { return false; }
}
export function parseAd(response: unknown, now = Date.now()): SponsoredAd | null {
  if (!response || typeof response !== 'object' || !('version' in response) || response.version !== 1 || !('ad' in response)) return null;
  const ad = response.ad as SponsoredAd | null;
  if (!ad || !['image', 'sponsorship'].includes(ad.kind) ||
      ['deliveryId', 'title', 'body', 'sponsor', 'imageUrl', 'targetUrl'].some(key => typeof ad[key as keyof SponsoredAd] !== 'string') ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(ad.deliveryId) || !ad.title || ad.title.length > 100 || ad.body.length > 240 ||
      (ad.kind === 'image' && !safeAdUrl(ad.imageUrl)) || (ad.targetUrl && !safeAdUrl(ad.targetUrl)) ||
      !Number.isFinite(ad.validForMs) || ad.validForMs <= 0 || ad.validForMs > 60000) return null;
  return { ...ad, expiresAt: now + ad.validForMs };
}
export async function loadAd(): Promise<SponsoredAd | null> {
  const requestedAt = Date.now();
  try {
    const response = await httpsCallable(getFunctions(getPublicApp()), 'serveAds', { timeout: 8000 })({ version: 1, root: firestoreRoot, platform: 'web', placement: 'home.sponsor' });
    const ad = parseAd(response.data, requestedAt);
    return ad && ad.expiresAt > Date.now() ? ad : null;
  } catch { return null; }
}
export async function recordAd(ad: SponsoredAd, event: 'impression' | 'click'): Promise<void> {
  try {
    await httpsCallable(getFunctions(getPublicApp()), 'recordAdEvent', { timeout: 5000 })({ version: 1, root: firestoreRoot, deliveryId: ad.deliveryId, event });
  } catch { /* Ads never block navigation or playback. */ }
}
