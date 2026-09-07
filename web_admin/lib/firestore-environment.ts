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

export function resolveAdminEmulators(
  requested: boolean,
  command: string,
  mode: string,
  projectId: string,
  root: FirestoreRoot,
): boolean {
  if (
    requested &&
    (command !== 'serve' ||
      mode !== 'development' ||
      !projectId.startsWith('demo-') ||
      root !== 'HudHudDev')
  )
    throw new Error(
      'Emulators require development serving, a demo project and HudHudDev.',
    );
  return requested;
}
