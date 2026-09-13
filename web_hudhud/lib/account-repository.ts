import { browserSessionPersistence, createUserWithEmailAndPassword, EmailAuthProvider, GoogleAuthProvider, getAuth, onIdTokenChanged, reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User } from 'firebase/auth';
import { collection, doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getPublicApp, getPublicFirestore } from './firebase-client';
import { firestoreRoot } from './firestore-environment';
import { resolveFollows, type Follow } from './discovery';
import { deletionMethod, profilePayload, sanitizeAvatar, type ProfileUpdate } from './account-profile';

export type AccountView = { id: string; verified: boolean; email: string; displayName: string; avatarUrl: string; providers: string[]; active: boolean; profileStatus: 'loading' | 'ready' | 'error' };
function authView(user: User): AccountView {
  return { id: user.uid, verified: user.emailVerified, email: user.email || '', displayName: user.displayName || '', avatarUrl: sanitizeAvatar(user.photoURL), providers: [...new Set(user.providerData.map(provider => provider.providerId))], active: false, profileStatus: user.emailVerified ? 'loading' : 'ready' };
}
function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}
export class AccountRepository {
  private generation = 0;
  private stopSubscriptions: (() => void) | null = null;
  private stopAuth: (() => void) | null = null;
  private changed: ((account: AccountView | null, follows: Follow[], error: boolean) => void) | null = null;
  private auth = getAuth(getPublicApp());
  async start(changed: (account: AccountView | null, follows: Follow[], error: boolean) => void) {
    this.changed = changed;
    await setPersistence(this.auth, browserSessionPersistence);
    if (!this.changed) return;
    this.stopAuth = onIdTokenChanged(this.auth, user => { void this.bind(user); }, () => this.changed?.(null, [], true));
  }
  private async bind(user: User | null) {
    const epoch = ++this.generation;
    this.stopSubscriptions?.(); this.stopSubscriptions = null;
    const initial = user ? authView(user) : null;
    this.changed?.(initial, [], false);
    // An OAuth provider is not proof of verified email. Preserve the OTP gate.
    if (!user?.emailVerified || !initial) return;
    try {
      await this.call('ensureAccountProfile');
      if (epoch !== this.generation) return;
      const db = await getPublicFirestore();
      if (epoch !== this.generation) return;
      const profile = await getDocFromServer(doc(db, `${firestoreRoot}/users/users/${user.uid}`));
      if (epoch !== this.generation) return;
      const view: AccountView = { ...initial, displayName: typeof profile.get('displayName') === 'string' ? profile.get('displayName') : initial.displayName, avatarUrl: sanitizeAvatar(profile.get('avatarUrl')), active: profile.get('isActive') === true, profileStatus: 'ready' };
      this.changed?.(view, [], false);
      if (!view.active) return;
      this.stopSubscriptions = onSnapshot(collection(db, `${firestoreRoot}/users/users/${user.uid}/subscriptions`), snapshot => { if (epoch === this.generation) this.changed?.(view, resolveFollows(snapshot.docs), false); }, () => { if (epoch === this.generation) this.changed?.({ ...view, active: false, profileStatus: 'error' }, [], true); });
    } catch { if (epoch === this.generation) this.changed?.({ ...initial, profileStatus: 'error' }, [], true); }
  }
  async call(name: string, data: Record<string, unknown> = {}) { return httpsCallable(getFunctions(getPublicApp()), name)({ ...data, root: firestoreRoot }); }
  async login(email: string, password: string) { await signInWithEmailAndPassword(this.auth, email.trim(), password); }
  async loginWithGoogle() {
    // Invoke directly from the click so popup creation keeps the user gesture.
    await signInWithPopup(this.auth, googleProvider());
  }
  async register(email: string, password: string, displayName: string) {
    const name = profilePayload({ displayName }).displayName as string;
    const result = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    await updateProfile(result.user, { displayName: name });
    await this.bind(result.user);
    await this.requestVerificationCode();
  }
  async resetPassword(email: string) { await sendPasswordResetEmail(this.auth, email.trim()); }
  async requestVerificationCode(email?: string) { await this.call('requestEmailVerificationCode', email?.trim() ? { email: email.trim() } : {}); }
  async verify(code: string) { await this.call('verifyEmailCode', { code }); await this.refresh(); }
  async refresh() {
    const user = this.auth.currentUser;
    if (!user) return;
    await user.reload();
    if (this.auth.currentUser?.uid !== user.uid) return;
    await user.getIdToken(true);
    if (this.auth.currentUser?.uid === user.uid) await this.bind(user);
  }
  async updateAccountProfile(update: ProfileUpdate) {
    if (!this.auth.currentUser?.emailVerified) throw new Error('verification-required');
    const result = await this.call('updateAccountProfile', profilePayload(update));
    if ((result.data as { updated?: boolean } | null)?.updated !== true) throw new Error('profile-unavailable');
    await this.refresh();
  }
  async follow(stationId: string, isActive: boolean, notificationsEnabled: boolean) { await this.call('setStationSubscription', { stationId, isActive, notificationsEnabled }); }
  async logout() { await signOut(this.auth); }
  async deleteAccount(password: string, beforeDelete: () => Promise<void>) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('sign-in-required');
    const method = deletionMethod(user.providerData.map(provider => provider.providerId));
    if (method === 'password' && user.email) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    else if (method === 'google') await reauthenticateWithPopup(user, googleProvider());
    else throw new Error('unsupported-reauthentication');
    if (this.auth.currentUser?.uid !== user.uid) throw new Error('account-changed');
    await beforeDelete();
    if (this.auth.currentUser?.uid !== user.uid) throw new Error('account-changed');
    await this.call('deleteAccountData');
    // Never sign out a different account that replaced the deleted identity.
    if (this.auth.currentUser?.uid === user.uid) await signOut(this.auth);
  }
  dispose() { this.generation++; this.changed = null; this.stopSubscriptions?.(); this.stopAuth?.(); }
}
