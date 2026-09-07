export type AdminSessionState<User> =
  | { status: 'signed-out'; user: null }
  | { status: 'admin'; user: User }
  | { status: 'denied'; user: null; reason: 'claims' | 'verification' };

/** Ignore permission results superseded by another token event or disposal. */
export function createAdminSessionGuard<User>({
  isAdmin,
  signOut,
  emit,
}: {
  isAdmin: (user: User) => Promise<boolean>;
  signOut: () => Promise<void>;
  emit: (state: AdminSessionState<User>) => void;
}) {
  let version = 0;
  let disposed = false;
  return {
    dispose() {
      disposed = true;
      version++;
    },
    async changed(user: User | null) {
      if (disposed) return;
      const current = ++version;
      if (!user) {
        emit({ status: 'signed-out', user: null });
        return;
      }
      try {
        const allowed = await isAdmin(user);
        if (disposed || current !== version) return;
        if (allowed) {
          emit({ status: 'admin', user });
          return;
        }
        emit({ status: 'denied', user: null, reason: 'claims' });
        await signOut();
      } catch {
        if (!disposed && current === version)
          emit({ status: 'denied', user: null, reason: 'verification' });
      }
    },
  };
}
