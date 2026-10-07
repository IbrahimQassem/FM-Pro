import { catalogReader } from './catalog.ts';
import { publicResponse } from './render.ts';
declare const __FIREBASE_CONFIG__: Record<string, string>;
declare const __FIRESTORE_ROOT__: string;
export const firestoreRoot = __FIRESTORE_ROOT__;
const readCatalog = catalogReader(__FIREBASE_CONFIG__.projectId, __FIRESTORE_ROOT__);
export const render = (path: string, template: string) => publicResponse(path, template, readCatalog, __FIRESTORE_ROOT__ !== 'HudHudOfficial');
