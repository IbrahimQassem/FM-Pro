export type FirestoreRoot = 'HudHudDev' | 'HudHudOfficial';

export function resolveFirestoreRoot(
  value: string | undefined,
  development: boolean,
): FirestoreRoot {
  const root = value?.trim() || (development ? 'HudHudDev' : '');
  if (root !== 'HudHudDev' && root !== 'HudHudOfficial') {
    throw new Error(
      'Set VITE_FIRESTORE_ROOT explicitly to HudHudDev or HudHudOfficial.',
    );
  }
  return root;
}

export function belongsToRoot(path: string, root: FirestoreRoot): boolean {
  return path.startsWith(`${root}/`);
}
