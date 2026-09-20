import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as ads from './advertising.js';

const options = { timeoutSeconds: 15, maxInstances: 10 };
export const advertisingAdmin = onCall(options, request => ads.advertisingAdmin({ firestore: getFirestore(), request }));
export const serveAds = onCall(options, request => ads.serveAds({ firestore: getFirestore(), data: request.data }));
export const recordAdEvent = onCall(options, request => ads.recordAdEvent({ firestore: getFirestore(), data: request.data }));
export const cleanupAdDeliveries = onSchedule('every 15 minutes', () => ads.collectAdDeliveries(getFirestore()));
