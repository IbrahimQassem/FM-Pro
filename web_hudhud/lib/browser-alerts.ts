import { DeviceRegistration } from './device-registration';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import workerUrl from '../notification-worker.ts?worker&url';
import { getPublicApp } from './firebase-client';
import { alertHref } from './discovery';
import { firestoreRoot } from './firestore-environment';
const key = 'hudhud.browserAlerts';
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
export type AlertItem = { href: string; title: string };
export class BrowserAlerts {
  private readonly registration: DeviceRegistration;
  private enabled = false;
  private stopMessage: (() => void) | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(call: (name: string, data: Record<string, unknown>) => Promise<unknown>) {
    this.registration = new DeviceRegistration(call, async () => { if (await isSupported()) await deleteToken(getMessaging(getPublicApp())); });
  }
  optedIn() { try { return localStorage.getItem(key) === 'true'; } catch { return this.enabled; } }
  private save(value: boolean) { this.enabled = value; try { localStorage.setItem(key, String(value)); } catch { /* Storage is optional. */ } }
  async supported() { return !!vapidKey && typeof Notification !== 'undefined' && window.isSecureContext && await isSupported(); }
  private serial<T>(action: () => Promise<T>): Promise<T> { const next = this.queue.then(action, action); this.queue = next.catch(() => undefined); return next; }
  // Call from the user gesture: request permission before loading/awaiting SDK work.
  enable(): Promise<void> {
    const permission = typeof Notification !== 'undefined' && vapidKey ? Notification.requestPermission() : Promise.resolve('denied' as NotificationPermission);
    return this.serial(async () => { if (await permission !== 'granted' || !await this.supported()) throw new Error('Browser alerts unavailable'); await this.register(); this.save(true); });
  }
  private async register() {
    const registration = await navigator.serviceWorker.register(workerUrl, { type: 'module' });
    if (!registration.active) await new Promise<void>((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) { reject(new Error('Worker unavailable')); return; }
      const timer = setTimeout(() => { worker.removeEventListener('statechange', check); reject(new Error('Worker unavailable')); }, 15000);
      const check = () => { if (worker.state === 'activated' || worker.state === 'redundant') { clearTimeout(timer); worker.removeEventListener('statechange', check); if (worker.state === 'activated') resolve(); else reject(new Error('Worker unavailable'));  } };
      worker.addEventListener('statechange', check); check();
    });
    const token = await getToken(getMessaging(getPublicApp()), { vapidKey, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Browser alerts unavailable');
    await this.registration.replace(token);
  }
  reconcile() { return this.serial(async () => { if (!this.optedIn()) return; if (typeof Notification === 'undefined' || Notification.permission !== 'granted') { await this.cleanup(); return; } if (await this.supported()) await this.register(); }); }
  disable() { return this.serial(() => this.cleanup()); }
  private async cleanup() {
    await this.registration.clear(this.optedIn());
    this.save(false);
  }
  listen(received: (item: AlertItem) => void) { this.stopMessage?.(); this.stopMessage = onMessage(getMessaging(getPublicApp()), payload => { const href = alertHref(payload.data, firestoreRoot); if (href) received({ href, title: payload.notification?.body?.slice(0, 200) || 'حلقة جديدة' }); }); }
  dispose() { this.stopMessage?.(); this.stopMessage = null; }
}
