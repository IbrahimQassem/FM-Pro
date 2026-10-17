import { useState, useRef } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { FirestoreRoot } from '@/lib/firestore-environment';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Download,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  parseBatchImportWorkbook,
  previewBatchImport,
  commitBatchImport,
  downloadBatchImportTemplate,
  type BatchImportPreview,
  type BatchImportCommitResult,
  type ParsedBatchSheets,
} from '@/lib/batch-import';

interface BatchImportModalProps {
  open: boolean;
  onClose: () => void;
  firestore: Firestore;
  firestoreRoot: FirestoreRoot;
  onSuccess?: () => void;
}

function str(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return fallback;
}

export function BatchImportModal({
  open,
  onClose,
  firestore,
  firestoreRoot,
  onSuccess,
}: BatchImportModalProps) {
  const [parsedSheets, setParsedSheets] = useState<ParsedBatchSheets | null>(
    null,
  );
  const [preview, setPreview] = useState<BatchImportPreview | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitProgress, setCommitProgress] = useState<{
    current: number;
    total: number;
    currentId: string;
  } | null>(null);
  const [allowUpdates, setAllowUpdates] = useState(false);
  const [commitResult, setCommitResult] =
    useState<BatchImportCommitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'programs' | 'episodes'>(
    'programs',
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setParsedSheets(null);
    setPreview(null);
    setAnalyzing(false);
    setCommitting(false);
    setCommitProgress(null);
    setAllowUpdates(false);
    setCommitResult(null);
    setErrorMessage(null);
  };

  const handleFileChange = async (file: File) => {
    resetState();
    setAnalyzing(true);
    try {
      const buffer = await file.arrayBuffer();
      const sheets = parseBatchImportWorkbook(buffer);
      setParsedSheets(sheets);

      // Generate preview against Firestore
      const p = await previewBatchImport(firestore, firestoreRoot, sheets);
      setPreview(p);
      if (p.programs.length === 0 && p.episodes.length > 0) {
        setActiveTab('episodes');
      } else {
        setActiveTab('programs');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`تعذر تحليل الملف: ${msg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !preview.canCommit) return;
    setCommitting(true);
    setCommitResult(null);
    setErrorMessage(null);

    try {
      const result = await commitBatchImport(firestore, firestoreRoot, preview, {
        allowUpdates,
        onProgress: (p) => setCommitProgress(p),
      });
      setCommitResult(result);
      if (result.success && result.committedCount > 0) {
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`فشل تنفيذ الاستيراد: ${msg}`);
    } finally {
      setCommitting(false);
      setCommitProgress(null);
    }
  };

  const handleRetryFailed = async () => {
    if (!parsedSheets) return;
    // Re-run preview so already succeeded rows become 'unchanged'
    setAnalyzing(true);
    setCommitResult(null);
    try {
      const p = await previewBatchImport(
        firestore,
        firestoreRoot,
        parsedSheets,
      );
      setPreview(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetState();
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden rounded-2xl"
        dir="rtl"
      >
        <DialogHeader className="pb-3 border-b space-y-1 text-right">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
              استيراد دفعة محتوى (XLSX / CSV)
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadBatchImportTemplate()}
                className="text-xs flex items-center gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <Download className="size-3.5" />
                تحميل نموذج Excel
              </Button>
              <Badge variant="outline" className="text-xs">
                البيئة: {firestoreRoot}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            استيراد البرامج والجداول والحلقات من ملف Excel أو Google Sheets
            المرحلي، مع التحقق من العلاقات والجدول الزمني قبل الحفظ.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* File Upload Zone */}
          {!preview && !analyzing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className="w-full border-2 border-dashed border-emerald-600/30 hover:border-emerald-600/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileChange(file);
                }}
              />
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-700 dark:text-emerald-300">
                <Upload className="size-8" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-base">
                  اضغط لاختيار ملف Excel أو CSV أو اسحبه هنا
                </p>
                <p className="text-xs text-muted-foreground">
                  يدعم ملف XLSX بورقتين (البرامج والحلقات) أو ملف CSV مفرد
                </p>
              </div>
            </button>
          )}

          {!preview && !analyzing && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-600/20 rounded-xl">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="size-5 text-emerald-600 shrink-0" />
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">
                    هل تحتاج إلى نموذج جاهز لتعبئة البيانات؟
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    حمّل نموذج Excel المعتمد مسبقاً والمطابق لقواعد الربط
                    والعلاقات لجدول البرامج والحلقات.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadBatchImportTemplate()}
                className="text-xs shrink-0 bg-white dark:bg-zinc-900 gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50"
              >
                <Download className="size-3.5" />
                تحميل النموذج (XLSX)
              </Button>
            </div>
          )}

          {analyzing && (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <RefreshCw className="size-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-foreground">
                جاري قراءة الملف والتحقق من صحة الجداول والعلاقات في Firestore…
              </p>
            </div>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Commit Results summary if finished */}
          {commitResult && (
            <Alert
              variant={commitResult.success ? 'default' : 'destructive'}
              className={
                commitResult.success
                  ? 'border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100'
                  : ''
              }
            >
              <FileText className="size-5" />
              <AlertTitle className="font-bold text-sm">
                {commitResult.success
                  ? 'اكتمل الاستيراد بنجاح'
                  : 'اكتمل الاستيراد مع وجود بعض الإخفاقات الجزئية'}
              </AlertTitle>
              <AlertDescription className="text-xs space-y-2 mt-1">
                <p>
                  تم حفظ وتحديث {commitResult.committedCount} سجلاً، وتخطي{' '}
                  {commitResult.skippedCount} سجلاً بدون تغيير، وفشل{' '}
                  {commitResult.failedCount} سجلاً.
                </p>
                {commitResult.failedCount > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    <p className="font-semibold">السجلات التي تعذر حفظها:</p>
                    <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                      {commitResult.results
                        .filter((r) => r.status === 'failed')
                        .map((r, i) => (
                          <li key={i}>
                            <span className="font-mono text-[11px]">
                              {r.id} ({r.kind}):
                            </span>{' '}
                            {r.error}
                          </li>
                        ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRetryFailed()}
                      className="mt-2 text-xs"
                    >
                      <RefreshCw className="size-3 ml-1" />
                      إعادة معاينة ومحاولة السجلات غير المكتملة
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview View */}
          {preview && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl border bg-muted/30">
                  <span className="text-muted-foreground block">
                    إجمالي الصفوف
                  </span>
                  <span className="text-lg font-bold">
                    {preview.summary.totalRows}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-emerald-600/20 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                  <span className="block">سجلات جديدة</span>
                  <span className="text-lg font-bold">
                    {preview.summary.newCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-blue-600/20 bg-blue-50/40 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300">
                  <span className="block">تحديثات</span>
                  <span className="text-lg font-bold">
                    {preview.summary.updateCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border bg-muted/30">
                  <span className="text-muted-foreground block">
                    مطابقة (بدون تغيير)
                  </span>
                  <span className="text-lg font-bold">
                    {preview.summary.unchangedCount}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    preview.summary.invalidRows > 0
                      ? 'border-destructive/40 bg-destructive/10 text-destructive font-bold'
                      : 'border-muted bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <span className="block">صفوف غير صالحة</span>
                  <span className="text-lg font-bold">
                    {preview.summary.invalidRows}
                  </span>
                </div>
              </div>

              {/* Error Policy Alert */}
              {preview.hasErrors && (
                <Alert variant="destructive" className="py-2.5">
                  <AlertTriangle className="size-4" />
                  <AlertTitle className="text-xs font-bold">
                    تنبيه أمان البيانات (العقد الصارم)
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    يوجد {preview.summary.invalidRows} صفاً يحتوي أخطاء تحقق أو
                    علاقات مفقودة. وفقاً لعقد الأتمتة، يُمنع الحفظ طالما وُجد أي
                    خطأ. يرجى مراجعة الجدول وتصحيح الخانات وإعادة المعاينة.
                  </AlertDescription>
                </Alert>
              )}

              {/* Option to allow updates */}
              {preview.summary.updateCount > 0 && !preview.hasErrors && (
                <div className="flex items-center gap-2 p-3 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 text-xs text-blue-950 dark:text-blue-100">
                  <Checkbox
                    id="allow-updates"
                    checked={allowUpdates}
                    onCheckedChange={(checked) =>
                      setAllowUpdates(Boolean(checked))
                    }
                  />
                  <label
                    htmlFor="allow-updates"
                    className="cursor-pointer font-medium leading-none"
                  >
                    السماح بتحديث {preview.summary.updateCount} سجلًا موجودًا
                    سابقاً في قاعدة البيانات بالقيم الجديدة.
                  </label>
                </div>
              )}

              {/* Sheet Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(val) =>
                  setActiveTab(val as 'programs' | 'episodes')
                }
              >
                <TabsList className="grid grid-cols-2 w-full max-w-xs">
                  <TabsTrigger value="programs" className="text-xs">
                    البرامج ({preview.programs.length})
                    {preview.programs.some((p) => p.status === 'invalid') && (
                      <span className="size-2 rounded-full bg-destructive mr-1.5" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="episodes" className="text-xs">
                    الحلقات ({preview.episodes.length})
                    {preview.episodes.some((e) => e.status === 'invalid') && (
                      <span className="size-2 rounded-full bg-destructive mr-1.5" />
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Programs Tab Content */}
                <TabsContent value="programs" className="mt-3">
                  <ScrollArea className="h-64 rounded-xl border p-2">
                    {preview.programs.length === 0 ? (
                      <p className="text-center py-8 text-xs text-muted-foreground">
                        لا توجد برامج في هذا الملف.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {preview.programs.map((p) => {
                          const sched = p.normalized.schedule as
                            | Record<string, unknown>
                            | undefined;
                          const startM =
                            typeof sched?.startMinute === 'number'
                              ? sched.startMinute
                              : 0;
                          const endM =
                            typeof sched?.endMinute === 'number'
                              ? sched.endMinute
                              : 0;
                          return (
                            <div
                              key={p.rowNumber}
                              className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                                p.status === 'invalid'
                                  ? 'border-destructive/40 bg-destructive/5'
                                  : p.status === 'update'
                                    ? 'border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10'
                                    : p.status === 'unchanged'
                                      ? 'bg-muted/20 border-muted opacity-80'
                                      : 'border-emerald-600/20 bg-emerald-50/20 dark:bg-emerald-950/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    الصف {p.rowNumber}
                                  </span>
                                  <span className="font-bold text-sm">
                                    {str(p.normalized.title, 'بدون عنوان')}
                                  </span>
                                  <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                                    ID: {p.id}
                                  </span>
                                </div>
                                <div>
                                  {p.status === 'create' && (
                                    <Badge className="bg-emerald-600 text-white text-[10px]">
                                      جديد
                                    </Badge>
                                  )}
                                  {p.status === 'update' && (
                                    <Badge className="bg-blue-600 text-white text-[10px]">
                                      تحديث
                                    </Badge>
                                  )}
                                  {p.status === 'unchanged' && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px]"
                                    >
                                      بدون تغيير
                                    </Badge>
                                  )}
                                  {p.status === 'invalid' && (
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px]"
                                    >
                                      خطأ
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground pt-1 border-t text-[11px]">
                                <div>المحطة: {str(p.normalized.stationId)}</div>
                                <div>
                                  الأيام:{' '}
                                  {Array.isArray(sched?.weekdays)
                                    ? sched.weekdays.join(', ')
                                    : '-'}
                                </div>
                                <div>
                                  الوقت: {startM} - {endM} دقيقة
                                </div>
                                <div>
                                  الحالة:{' '}
                                  {p.normalized.isActive ? 'مفعل' : 'معطل'} |{' '}
                                  {p.normalized.isFeatured ? 'مميز' : 'عادي'}
                                </div>
                              </div>

                              {/* Errors if any */}
                              {Object.keys(p.errors).length > 0 && (
                                <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-[11px] space-y-0.5">
                                  {Object.entries(p.errors).map(
                                    ([field, msg]) => (
                                      <p key={field}>
                                        <span className="font-semibold">
                                          {field}:
                                        </span>{' '}
                                        {msg}
                                      </p>
                                    ),
                                  )}
                                </div>
                              )}

                              {/* Diff if update */}
                              {p.diff && p.diff.length > 0 && (
                                <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-[11px] space-y-0.5">
                                  <span className="font-semibold">
                                    الحقول التي سيتم تحديثها:
                                  </span>
                                  {p.diff.map((d) => (
                                    <p key={d.field}>
                                      • {d.field}:{' '}
                                      <span className="line-through text-muted-foreground">
                                        {JSON.stringify(d.oldValue)}
                                      </span>{' '}
                                      ←{' '}
                                      <span className="font-semibold">
                                        {JSON.stringify(d.newValue)}
                                      </span>
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Episodes Tab Content */}
                <TabsContent value="episodes" className="mt-3">
                  <ScrollArea className="h-64 rounded-xl border p-2">
                    {preview.episodes.length === 0 ? (
                      <p className="text-center py-8 text-xs text-muted-foreground">
                        لا توجد حلقات في هذا الملف.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {preview.episodes.map((e) => (
                          <div
                            key={e.rowNumber}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                              e.status === 'invalid'
                                ? 'border-destructive/40 bg-destructive/5'
                                : e.status === 'update'
                                  ? 'border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10'
                                  : e.status === 'unchanged'
                                    ? 'bg-muted/20 border-muted opacity-80'
                                    : 'border-emerald-600/20 bg-emerald-50/20 dark:bg-emerald-950/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  الصف {e.rowNumber}
                                </span>
                                <span className="font-bold text-sm">
                                  {str(e.normalized.title, 'بدون عنوان')}
                                </span>
                                <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                                  ID: {e.id}
                                </span>
                              </div>
                              <div>
                                {e.status === 'create' && (
                                  <Badge className="bg-emerald-600 text-white text-[10px]">
                                    جديد
                                  </Badge>
                                )}
                                {e.status === 'update' && (
                                  <Badge className="bg-blue-600 text-white text-[10px]">
                                    تحديث
                                  </Badge>
                                )}
                                {e.status === 'unchanged' && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    بدون تغيير
                                  </Badge>
                                )}
                                {e.status === 'invalid' && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px]"
                                  >
                                    خطأ
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground pt-1 border-t text-[11px]">
                              <div>البرنامج: {str(e.normalized.programId)}</div>
                              <div>
                                المحطة:{' '}
                                {str(e.normalized.stationId, 'غير محدد')}
                              </div>
                              <div>
                                المدة: {str(e.normalized.durationSeconds)} ثانية
                              </div>
                              <div>
                                النشر:{' '}
                                {e.normalized.isPublished ? 'منشور' : 'مسودة'}
                              </div>
                            </div>

                            {/* Errors if any */}
                            {Object.keys(e.errors).length > 0 && (
                              <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-[11px] space-y-0.5">
                                {Object.entries(e.errors).map(([field, msg]) => (
                                  <p key={field}>
                                    <span className="font-semibold">
                                      {field}:
                                    </span>{' '}
                                    {msg}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Diff if update */}
                            {e.diff && e.diff.length > 0 && (
                              <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-[11px] space-y-0.5">
                                <span className="font-semibold">
                                  الحقول التي سيتم تحديثها:
                                </span>
                                {e.diff.map((d) => (
                                  <p key={d.field}>
                                    • {d.field}:{' '}
                                    <span className="line-through text-muted-foreground">
                                      {JSON.stringify(d.oldValue)}
                                    </span>{' '}
                                    ←{' '}
                                    <span className="font-semibold">
                                      {JSON.stringify(d.newValue)}
                                    </span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between w-full">
          <div>
            {preview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetState();
                  fileInputRef.current?.click();
                }}
                disabled={committing}
                className="text-xs text-muted-foreground"
              >
                اختيار ملف آخر
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetState();
                onClose();
              }}
              disabled={committing}
            >
              {commitResult?.success ? 'إغلاق' : 'إلغاء'}
            </Button>
            {preview && (
              <Button
                onClick={() => void handleCommit()}
                disabled={!preview.canCommit || committing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {committing ? (
                  <>
                    <RefreshCw className="size-4 ml-1.5 animate-spin" />
                    جاري الحفظ ({commitProgress?.current ?? 0}/
                    {commitProgress?.total ?? 0})…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 ml-1.5" />
                    تنفيذ الاستيراد (Commit)
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
