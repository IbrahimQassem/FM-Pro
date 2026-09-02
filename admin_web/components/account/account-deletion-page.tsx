import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';
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
import { getFirebaseServices } from '@/lib/firebase-client';

type SubmissionState = 'idle' | 'submitting' | 'succeeded' | 'failed';

export function AccountDeletionPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>('idle');

  async function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    if (!email.trim() || !password || !acknowledged) return;
    setSubmissionState('submitting');
    let signedInAuth: Auth | null = null;
    try {
      const { app, auth } = await getFirebaseServices();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      signedInAuth = auth;
      await httpsCallable(getFunctions(app), 'deleteAccountData')();
      await signOut(auth);
      setPassword('');
      setSubmissionState('succeeded');
    } catch {
      if (signedInAuth) await signOut(signedInAuth).catch(() => undefined);
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

  const disabled =
    submissionState === 'submitting' ||
    !email.trim() ||
    !password ||
    !acknowledged;

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
              والبلاغات وقائمة الحظر المرتبطة بالحساب، ولا يمكن التراجع عن ذلك.
              يمكنك مراجعة{' '}
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
              <AlertDescription>
                تحقق من البريد وكلمة المرور ثم أعد المحاولة. لم يُحذف الحساب.
              </AlertDescription>
            </Alert>
          )}
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
            <Label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 leading-6">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <span>
                أفهم أن حسابي وبياناتي المرتبطة سيُحذفان نهائيًا ولا يمكن
                استعادتهما.
              </span>
            </Label>
            <Button
              className="w-full"
              variant="destructive"
              type="submit"
              disabled={disabled}
            >
              {submissionState === 'submitting' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              حذف الحساب نهائيًا
            </Button>
          </form>
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
