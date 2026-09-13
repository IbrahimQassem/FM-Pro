import { browserSessionPersistence, createUserWithEmailAndPassword, EmailAuthProvider, getAuth, onIdTokenChanged, reauthenticateWithCredential, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut, updateProfile, type User } from 'firebase/auth';
import { collection, doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getPublicApp, getPublicFirestore } from './firebase-client';
import { firestoreRoot } from './firestore-environment';
import { resolveFollows, type Follow } from './discovery';
export type AccountView = { verified: boolean; email: string; displayName: string; active: boolean };
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
    this.changed?.(user ? { verified: user.emailVerified, email: user.email || '', displayName: user.displayName || '', active: false } : null, [], false);
    if (!user?.emailVerified) return;
    try {
      await this.call('ensureAccountProfile');
      const db = await getPublicFirestore();
      const profile = await getDocFromServer(doc(db, `${firestoreRoot}/users/users/${user.uid}`));
      if (epoch !== this.generation) return;
      const view = { verified: true, email: user.email || '', displayName: typeof profile.get('displayName') === 'string' ? profile.get('displayName') : user.displayName || '', active: profile.get('isActive') === true };
      this.changed?.(view, [], false);
      if (!view.active) return;
      this.stopSubscriptions = onSnapshot(collection(db, `${firestoreRoot}/users/users/${user.uid}/subscriptions`), snapshot => { if (epoch === this.generation) this.changed?.(view, resolveFollows(snapshot.docs), false); }, () => { if (epoch === this.generation) this.changed?.({ ...view, active: false }, [], true); });
    } catch { if (epoch === this.generation) this.changed?.({ verified: true, email: user.email || '', displayName: user.displayName || '', active: false }, [], true); }
  }
  async call(name: string, data: Record<string, unknown> = {}) { return httpsCallable(getFunctions(getPublicApp()), name)({ ...data, root: firestoreRoot }); }
  async login(email: string, password: string) { await signInWithEmailAndPassword(this.auth, email.trim(), password); }
  async register(email: string, password: string, displayName: string) {
    const result = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    await updateProfile(result.user, { displayName: displayName.trim() });
    await this.call('requestEmailVerificationCode');
  }
  async resetPassword(email: string) { await sendPasswordResetEmail(this.auth, email.trim()); }
  async verify(code: string) { await this.call('verifyEmailCode', { code }); await this.refresh(); }
  async refresh() { const user = this.auth.currentUser; if (!user) return; await user.reload(); await user.getIdToken(true); await this.bind(user); }
  async updateName(displayName: string) { await this.call('updateAccountProfile', { displayName: displayName.trim() }); await this.refresh(); }
  async follow(stationId: string, isActive: boolean, notificationsEnabled: boolean) { await this.call('setStationSubscription', { stationId, isActive, notificationsEnabled }); }
  async logout() { await signOut(this.auth); }
  async deleteAccount(password: string) {
    const user = this.auth.currentUser;
    if (!user?.email) throw new Error('Sign in again');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    await this.call('deleteAccountData');
    await signOut(this.auth);
  }
  dispose() { this.generation++; this.changed = null; this.stopSubscriptions?.(); this.stopAuth?.(); }
}
