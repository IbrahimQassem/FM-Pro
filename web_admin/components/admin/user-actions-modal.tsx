import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/lib/firebase-client';
import { firestoreRoot } from '@/lib/firestore-root';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
  Radio,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export type UserRecord = {
  id: string;
  data: {
    displayName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    disabledReason?: string;
    allStations?: boolean;
    assignedStationIds?: string[];
  };
};

type StationItem = {
  id: string;
  name: string;
  cityNameAr?: string;
};

export function UserActionsModal({
  user,
  open,
  onClose,
  onSuccess,
}: {
  user: UserRecord | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <UserActionsModalContent
        key={user.id}
        user={user}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function UserActionsModalContent({
  user,
  onClose,
  onSuccess,
}: {
  user: UserRecord;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'password' | 'status' | 'permissions'>('password');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState('');

  // Status state
  const [disableReason, setDisableReason] = useState(user.data.disabledReason || '');

  // Permissions state
  const [role, setRole] = useState<string>(user.data.role || 'listener');
  const [allStations, setAllStations] = useState<boolean>(Boolean(user.data.allStations));
  const [selectedStations, setSelectedStations] = useState<string[]>(user.data.assignedStationIds || []);
  const [stationsList, setStationsList] = useState<StationItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadStations() {
      try {
        const services = await getFirebaseServices();
        const q = query(
          collection(services.firestore, `${firestoreRoot}/stations/stations`),
          orderBy('priority', 'desc'),
        );
        const snapshot = await getDocs(q);
        if (!cancelled) {
          const list: StationItem[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            name: (doc.data().name as string) || doc.id,
            cityNameAr: doc.data().cityNameAr as string,
          }));
          setStationsList(list);
        }
      } catch {
        // station list load failure is non-blocking
      }
    }
    void loadStations();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentIsActive = user.data.isActive !== false;

  async function handleSetPassword() {
    if (!newPassword || newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'يجب ألا تقل كلمة المرور عن 8 أحرف.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const services = await getFirebaseServices();
      const fn = httpsCallable(getFunctions(services.app), 'adminSetUserPassword');
      await fn({
        root: firestoreRoot,
        targetUid: user.id,
        newPassword,
      });
      setFeedback({
        type: 'success',
        message: 'تم تعيين كلمة المرور الجديدة وتوثيق بريد الحساب بنجاح.',
      });
      setNewPassword('');
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تعيين كلمة المرور.';
      setFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    setLoading(true);
    setFeedback(null);
    try {
      const services = await getFirebaseServices();
      const fn = httpsCallable(getFunctions(services.app), 'adminToggleUserDisabled');
      const targetDisabled = currentIsActive; // If currently active, we want to disable
      await fn({
        root: firestoreRoot,
        targetUid: user.id,
        disabled: targetDisabled,
        reason: targetDisabled ? disableReason || 'تم الإيقاف بواسطة الإدارة' : '',
      });
      setFeedback({
        type: 'success',
        message: targetDisabled
          ? 'تم إيقاف الحساب وإلغاء جلسته النشطة بنجاح.'
          : 'تم إعادة تفعيل الحساب بنجاح.',
      });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحديث حالة الحساب.';
      setFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePermissions() {
    setLoading(true);
    setFeedback(null);
    try {
      const services = await getFirebaseServices();
      const fn = httpsCallable(getFunctions(services.app), 'adminAssignStationAccess');
      await fn({
        root: firestoreRoot,
        targetUid: user.id,
        role,
        allStations,
        stationIds: selectedStations,
      });
      setFeedback({
        type: 'success',
        message: 'تم تحديث صلاحيات المستخدم وتعيين المحطات بنجاح.',
      });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحديث الصلاحيات.';
      setFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleStation(id: string) {
    setSelectedStations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  return (
    <DialogContent className="max-w-lg p-6 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center justify-between gap-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            إدارة حساب المستخدم
          </DialogTitle>
          <Badge variant={currentIsActive ? 'default' : 'destructive'}>
            {currentIsActive ? 'نشط' : 'معطل'}
          </Badge>
        </div>
        <DialogDescription className="text-sm text-muted-foreground pt-1">
          <span className="font-semibold text-foreground">
            {user.data.displayName || user.data.email || user.id}
          </span>
          <span className="block font-mono text-xs text-muted-foreground/80 mt-0.5" dir="ltr">
            UID: {user.id}
          </span>
        </DialogDescription>
      </DialogHeader>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <p className="flex-1 text-xs sm:text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      {/* Tab Buttons */}
      <div className="flex border-b border-border pb-1 gap-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => { setActiveTab('password'); setFeedback(null); }}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'password'
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <KeyRound className="size-4" />
          تعيين كلمة مرور
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('permissions'); setFeedback(null); }}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'permissions'
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="size-4" />
          الصلاحيات والمحطات
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('status'); setFeedback(null); }}
          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'status'
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {currentIsActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
          {currentIsActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
        </button>
      </div>

      {/* Tab 1: Password */}
      {activeTab === 'password' && (
        <div className="space-y-4 pt-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            يمكن للمدير تعيين كلمة مرور جديدة مباشرة للمستخدم لحل مشاكل تسجيل الدخول للحسابات القديمة. سيتم أيضاً توثيق البريد الإلكتروني تلقائياً.
          </p>
          <div className="space-y-2">
            <label htmlFor="user-new-password" className="text-xs font-semibold text-foreground">
              كلمة المرور الجديدة (8 أحرف على الأقل):
            </label>
            <Input
              id="user-new-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="أدخل كلمة المرور الجديدة..."
              className="h-10 text-sm"
            />
          </div>
          <Button
            disabled={loading || newPassword.length < 8}
            onClick={handleSetPassword}
            className="w-full h-10 mt-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            حفظ وتعيين كلمة المرور
          </Button>
        </div>
      )}

      {/* Tab 2: Permissions */}
      {activeTab === 'permissions' && (
        <div className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <label htmlFor="user-role-select" className="text-xs font-semibold text-foreground">الدور الإداري:</label>
            <select
              id="user-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
            >
              <option value="listener">مستمع (Listener) - بدون صلاحيات إدارية</option>
              <option value="moderator">مشرف محتوى (Moderator) - إدارة التعليقات والبلاغات</option>
              <option value="station_admin">مدير محطة / محرر (Station Admin) - إدارة الإذاعات والبرامج</option>
              <option value="super_admin">مدير عام (Super Admin) - صلاحيات كاملة على كل شيء</option>
            </select>
          </div>

          {role === 'station_admin' && (
            <div className="space-y-3 p-3 bg-muted/40 rounded-xl border border-border/50">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allStations}
                  onChange={(e) => setAllStations(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold">صلاحية شاملة على جميع الإذاعات والبرامج</span>
              </label>

              {!allStations && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground">
                    حدد الإذاعات المخصصة لهذا المحرر ({selectedStations.length} مختارة):
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {stationsList.map((st) => (
                      <label
                        key={st.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/60 text-xs cursor-pointer"
                      >
                        <span className="font-medium">{st.name}</span>
                        <input
                          type="checkbox"
                          checked={selectedStations.includes(st.id)}
                          onChange={() => toggleStation(st.id)}
                          className="size-4 rounded border-gray-300 text-primary"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            disabled={loading}
            onClick={handleSavePermissions}
            className="w-full h-10 mt-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
            حفظ الصلاحيات وتعيين الإذاعات
          </Button>
        </div>
      )}

      {/* Tab 3: Status */}
      {activeTab === 'status' && (
        <div className="space-y-4 pt-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {currentIsActive
              ? 'سيؤدي إيقاف الحساب إلى منعه من تسجيل الدخول وإلغاء جلسته النشطة فوراً ومنعه من التعليق أو التفاعل.'
              : 'الحساب معطل حالياً. يمكنك إعادة تفعيله لتمكينه من استخدام التطبيق من جديد.'}
          </p>

          {currentIsActive && (
            <div className="space-y-2">
              <label htmlFor="user-disable-reason" className="text-xs font-semibold text-foreground">سبب الإيقاف (اختياري):</label>
              <Input
                id="user-disable-reason"
                type="text"
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="مثال: مخالفة شروط الاستخدام..."
                className="h-10 text-sm"
              />
            </div>
          )}

          <Button
            variant={currentIsActive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={handleToggleStatus}
            className="w-full h-10 mt-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : currentIsActive ? (
              <UserX className="size-4" />
            ) : (
              <UserCheck className="size-4" />
            )}
            {currentIsActive ? 'تأكيد إيقاف الحساب' : 'تأكيد إعادة تفعيل الحساب'}
          </Button>
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
          إغلاق
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
