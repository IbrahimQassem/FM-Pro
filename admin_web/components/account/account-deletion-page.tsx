import {
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  reauthenticateWithPopup,
  revokeAccessToken,
  type User,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAccountDeletionServices } from '@/lib/firebase-client';
import { completeAccountDeletion } from '@/lib/account-deletion';

type SubmissionState = 'idle' | 'submitting' | 'succeeded' | 'failed';

export function AccountDeletionPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');

  const [confirmedUser, setConfirmedUser] = useState<User | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [failureMessage, setFailureMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void getAccountDeletionServices()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) {
          setFailureMessage(
            'تعذر تجهيز تسجيل الدخول. أعد تحميل الصفحة وحاول مرة أخرى.',
          );
          setSubmissionState('failed');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function authenticate(provider?: 'google' | 'facebook' | 'apple') {
    if (!ready || submissionState === 'submitting') return;
    setSubmissionState('submitting');
    setAcknowledged(false);
    setConfirmation('');
    try {
      const { auth } = await getAccountDeletionServices();
      const credential = provider
        ? await signInWithPopup(
            auth,
            provider === 'google'
              ? new GoogleAuthProvider()
              : provider === 'facebook'
                ? new FacebookAuthProvider()
                : new OAuthProvider('apple.com'),
          )
        : await signInWithEmailAndPassword(auth, email.trim(), password);
      setConfirmedUser(credential.user);
      setSubmissionState('idle');
    } catch {
      setFailureMessage(
        'تعذر تسجيل الدخول. تحقق من طريقة الدخول وبياناتك ثم أعد المحاولة. إذا أغلقت نافذة المزود أو منعها المتصفح، اسمح بها وحاول مجددًا.',
      );
      setSubmissionState('failed');
    } finally {
      setPassword('');
    }
  }

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    await authenticate();
  }

  async function cancel() {
    const { auth } = await getAccountDeletionServices();
    await signOut(auth).catch(() => undefined);
    setConfirmedUser(null);
    setAcknowledged(false);
    setConfirmation('');
    setSubmissionState('idle');
  }

  async function deleteAccount() {
    if (
      !confirmedUser ||
      !acknowledged ||
      confirmation !== 'حذف' ||
      submissionState === 'submitting'
    )
      return;
    setSubmissionState('submitting');
    let cleanupStarted = false;
    try {
      const { app, auth } = await getAccountDeletionServices();
      if (auth.currentUser?.uid !== confirmedUser.uid)
        throw new Error('Session changed');
      await completeAccountDeletion({
        revokeProvider: async () => {
          if (
            confirmedUser.providerData.some(
              (provider) => provider.providerId === 'apple.com',
            )
          ) {
            const credential = await reauthenticateWithPopup(
              confirmedUser,
              new OAuthProvider('apple.com'),
            );
            const token =
              OAuthProvider.credentialFromResult(credential)?.accessToken;
            if (!token) throw new Error('Apple authorization unavailable');
            await revokeAccessToken(auth, token);
          }
        },
        deleteData: async () => {
          cleanupStarted = true;
          await httpsCallable(getFunctions(app), 'deleteAccountData')();
        },
        signOut: () => signOut(auth),
      });
      setConfirmedUser(null);
      setSubmissionState('succeeded');
    } catch {
      setFailureMessage(
        cleanupStarted
          ? 'لم نتلقَ تأكيد اكتمال الحذف. قد يكون بعض البيانات حُذف بالفعل. أعد تسجيل الدخول وحاول إكمال الطلب؛ لا يمكن استعادة البيانات المحذوفة.'
          : 'تعذر تأكيد الهوية أو إلغاء تفويض Apple. لم يبدأ حذف بيانات الحساب. أعد تسجيل الدخول وحاول مجددًا.',
      );
      setSubmissionState('failed');
    }
  }

  if (submissionState === 'succeeded') {
    return (
      <PublicPageShell>
        <Card className="w-full max-w-xl">
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="size-12 text-emerald-600" />
            <CardTitle>تم حذف حساب هدهد FM</CardTitle>
            <CardDescription>
              حُذف الحساب وبياناته المرتبطة ولا يلزم اتخاذ خطوة أخرى.
            </CardDescription>
          </CardHeader>
        </Card>
      </PublicPageShell>
    );
  }

  const disabled = submissionState === 'submitting' || !ready;

  return (
    <PublicPageShell>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Trash2 className="size-6" />
          </div>
          <CardTitle>حذف حساب هدهد FM وبياناته</CardTitle>
          <CardDescription>
            صفحة عامة لطلب حذف الحساب إذا لم يعد التطبيق مثبتًا على جهازك.
            Account deletion is also available from inside the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle />
            <AlertTitle>الحذف نهائي</AlertTitle>
            <AlertDescription>
              سيُحذف ملف الحساب والتعليقات والمفضلة والاشتراكات والموافقات
              والبلاغات وقائمة الحظر المرتبطة بالحساب في التطبيق وبيئة الاختبار
              المرتبطة به، ولا يمكن التراجع عن ذلك. يمكنك مراجعة{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => window.location.assign('/community-guidelines')}
              >
                شروط المشاركة
              </button>
              .
            </AlertDescription>
          </Alert>
          {submissionState === 'failed' && (
            <Alert variant="destructive" className="mb-6" role="alert">
              <AlertTitle>تعذر إكمال الطلب</AlertTitle>
              <AlertDescription>{failureMessage}</AlertDescription>
            </Alert>
          )}
          {!confirmedUser ? (
            <>
              <p className="mb-4 text-sm">
                سجّل الدخول بالطريقة المرتبطة بحسابك، ثم راجع الحساب قبل تأكيد
                الحذف.
              </p>
              <div className="mb-5 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => void authenticate('google')}
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => void authenticate('facebook')}
                >
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => void authenticate('apple')}
                >
                  Apple
                </Button>
              </div>
              <form className="space-y-5" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="deletion-email">البريد الإلكتروني</Label>
                  <Input
                    id="deletion-email"
                    dir="ltr"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deletion-password">كلمة المرور الحالية</Label>
                  <Input
                    id="deletion-password"
                    dir="ltr"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={disabled || !email.trim() || !password}
                >
                  {submissionState === 'submitting' && (
                    <Loader2 className="animate-spin" />
                  )}
                  تسجيل الدخول لمراجعة طلب الحذف
                </Button>
              </form>
            </>
          ) : (
            <fieldset className="space-y-5">
              <legend className="font-semibold">تأكيد حذف الحساب</legend>
              <p>
                الحساب المحدد:{' '}
                <b dir="auto">
                  {confirmedUser.email ||
                    confirmedUser.displayName ||
                    'الحساب الذي سجلت الدخول إليه'}
                </b>
              </p>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => void cancel()}
              >
                إلغاء أو استخدام حساب آخر
              </Button>
              <Label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 leading-6">
                <Checkbox
                  checked={acknowledged}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    setAcknowledged(checked === true)
                  }
                />
                <span>
                  أفهم أن حسابي وبياناتي المرتبطة سيُحذفان نهائيًا ولا يمكن
                  استعادتهما.
                </span>
              </Label>
              <Label htmlFor="deletion-confirmation">
                اكتب «حذف» لتأكيد الحذف النهائي
              </Label>
              <Input
                id="deletion-confirmation"
                value={confirmation}
                disabled={disabled}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
              <Button
                className="w-full"
                variant="destructive"
                disabled={disabled || !acknowledged || confirmation !== 'حذف'}
                onClick={() => void deleteAccount()}
              >
                {submissionState === 'submitting' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
                حذف الحساب نهائيًا
              </Button>
            </fieldset>
          )}
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}

function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <main
      dir="rtl"
      className="grid min-h-screen place-items-center bg-muted/40 p-4 sm:p-8"
    >
      {children}
    </main>
  );
}
