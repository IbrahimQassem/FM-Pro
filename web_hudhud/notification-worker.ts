import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { alertHref } from './lib/discovery';
import { firestoreRoot } from './lib/firestore-environment';
declare const __FIREBASE_CONFIG__: Record<string, string>;
// Narrow worker interface keeps the application's DOM compiler configuration intact.
const worker = self as unknown as {
  location: Location;
  addEventListener(type: string, listener: (event: { notification: { data: { FCM_MSG?: { data?: Record<string, unknown> } }; close(): void }; stopImmediatePropagation(): void; waitUntil(promise: Promise<unknown>): void }) => void): void;
  clients: { openWindow(url: string): Promise<unknown> };
};
worker.addEventListener('notificationclick', event => {
  event.stopImmediatePropagation(); event.notification.close();
  const href = alertHref(event.notification.data?.FCM_MSG?.data, firestoreRoot);
  if (href) event.waitUntil(worker.clients.openWindow(new URL(`/${href}`, worker.location.origin).href));
});
// Register our click handler before creating the Firebase messaging instance.
onBackgroundMessage(getMessaging(initializeApp(__FIREBASE_CONFIG__)), () => {
  // Server notification payload is displayed by FCM; never display it twice.
});
