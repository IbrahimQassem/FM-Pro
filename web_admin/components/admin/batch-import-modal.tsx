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
  Sparkles,
  Radio,
  Clock,
  Calendar,
  Headphones,
  Volume2,
  Layers,
  ExternalLink,
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

function formatMinutesToTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h < 12 ? 'ص' : 'م';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return '0 د';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} س و ${m} د`;
  if (h > 0) return `${h} س`;
  return `${m} دقيقة`;
}

function formatDurationSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}س و ${remM}د`;
  }
  return `${m}:${String(s).padStart(2, '0')} د`;
}

const ISO_DAY_NAMES: Record<number, string> = {
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
  7: 'الأحد',
};

const ISO_DAY_SHORT: Record<number, string> = {
  1: 'ن',
  2: 'ث',
  3: 'ر',
  4: 'خ',
  5: 'ج',
  6: 'س',
  7: 'ح',
};

const WEEK_ORDER = [6, 7, 1, 2, 3, 4, 5];

function renderWeekdaysBadges(weekdays: unknown) {
  if (!Array.isArray(weekdays)) return <span className="text-muted-foreground">-</span>;
  const daySet = new Set(weekdays);
  return (
    <div className="flex items-center gap-1 flex-wrap" dir="rtl">
      {WEEK_ORDER.map((d) => {
        const active = daySet.has(d);
        return (
          <span
            key={d}
            title={ISO_DAY_NAMES[d]}
            className={`size-5 rounded flex items-center justify-center font-bold text-[10px] transition-colors ${
              active
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground/40'
            }`}
          >
            {ISO_DAY_SHORT[d]}
          </span>
        );
      })}
    </div>
  );
}

function formatBroadcastDate(isoStr: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h < 12 ? 'ص' : 'م';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const timeStr = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    return `${day} ${month} ${year} • ${timeStr}`;
  } catch {
    return isoStr;
  }
}

function extractDomainOrFilename(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/').filter(Boolean);
    const filename = parts[parts.length - 1];
    return filename || u.hostname;
  } catch {
    return urlStr.slice(0, 24);
  }
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

  const handleLoadPreparedBatch = async () => {
    resetState();
    setAnalyzing(true);
    try {
      let resp = await fetch(
        '/data/hudhud-official-programs-and-episodes-2026-10-19.xlsx',
      );
      if (!resp.ok) {
        resp = await fetch('/data/hudhud_programs_and_episodes.xlsx');
      }
      if (!resp.ok) {
        throw new Error('لم يتم العثور على ملف الحزمة في الخادم.');
      }
      const buffer = await resp.arrayBuffer();
      const sheets = parseBatchImportWorkbook(buffer);
      setParsedSheets(sheets);
      const p = await previewBatchImport(firestore, firestoreRoot, sheets);
      setPreview(p);
      setActiveTab('programs');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`تعذر تحميل الحزمة: ${msg}`);
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
        className="w-[95vw] sm:max-w-4xl md:max-w-5xl max-h-[92vh] flex flex-col p-6 overflow-hidden rounded-2xl"
        dir="rtl"
      >
        <DialogHeader className="pb-3 border-b space-y-1.5 text-right">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground">
              <div className="p-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <FileSpreadsheet className="size-5" />
              </div>
              <span className="whitespace-nowrap">استيراد دفعة محتوى (XLSX / CSV)</span>
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadBatchImportTemplate({ root: firestoreRoot })}
                className="text-xs flex items-center gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <Download className="size-3.5" />
                تحميل نموذج Excel
              </Button>
              <Badge variant="outline" className="text-xs px-2.5 py-1 font-mono">
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
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 rounded-xl gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      حزمة البرامج والحلقات المعتمدة (49 برنامج • 72 حلقة)
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                      >
                        جاهزة للاستيراد
                      </Badge>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      تم تجهيز وفحص ملف الإكسل الموحد لجميع محطات البث (s1_1 حتى s1_24) بدون أي أخطاء.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href =
                        '/data/hudhud-official-programs-and-episodes-2026-10-19.xlsx';
                      link.download =
                        'hudhud-official-programs-and-episodes-2026-10-19.xlsx';
                      link.click();
                    }}
                    className="text-xs gap-1.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
                  >
                    <Download className="size-3.5" />
                    تحميل الملف
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleLoadPreparedBatch}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  >
                    <Sparkles className="size-3.5" />
                    معاينة الحزمة مباشرة
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="size-5 text-muted-foreground shrink-0" />
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">
                      هل تحتاج إلى نموذج فارغ لتعبئة بيانات جديدة؟
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      حمّل نموذج Excel المعتمد مسبقاً والمطابق لقواعد الربط والعلاقات.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadBatchImportTemplate({ root: firestoreRoot })}
                  className="text-xs shrink-0 bg-white dark:bg-zinc-900 gap-1.5 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Download className="size-3.5" />
                  تحميل النموذج الفارغ (XLSX)
                </Button>
              </div>
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
                  <ScrollArea className="h-[380px] sm:h-[440px] rounded-xl border p-3">
                    {preview.programs.length === 0 ? (
                      <p className="text-center py-12 text-xs text-muted-foreground">
                        لا توجد برامج في هذا الملف.
                      </p>
                    ) : (
                      <div className="space-y-3">
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
                              className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                                p.status === 'invalid'
                                  ? 'border-destructive/40 bg-destructive/5'
                                  : p.status === 'update'
                                    ? 'border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10'
                                    : p.status === 'unchanged'
                                      ? 'bg-muted/20 border-muted opacity-80'
                                      : 'border-emerald-600/30 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-600/50'
                              }`}
                            >
                              {/* Header row */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                                    <Radio className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-foreground">
                                        {str(p.normalized.title, 'بدون عنوان')}
                                      </span>
                                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                                        ID: {p.id}
                                      </span>
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        الصف #{p.rowNumber}
                                      </span>
                                    </div>
                                    {typeof p.normalized.description === 'string' &&
                                      p.normalized.description && (
                                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                          {p.normalized.description}
                                        </p>
                                      )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {Boolean(p.normalized.isFeatured) && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] gap-1 text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10"
                                    >
                                      <Sparkles className="size-2.5" />
                                      مميز
                                    </Badge>
                                  )}
                                  {p.status === 'create' && (
                                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                                      <CheckCircle2 className="size-2.5" />
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
                                      className="text-[10px] gap-1"
                                    >
                                      <AlertTriangle className="size-2.5" />
                                      خطأ
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Program Details Chips */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t text-[11px]">
                                {/* Station */}
                                <div className="flex items-center gap-1.5 text-foreground bg-background/60 dark:bg-zinc-900/60 p-2 rounded-lg border">
                                  <Radio className="size-3.5 text-emerald-600 shrink-0" />
                                  <span className="text-muted-foreground">المحطة:</span>
                                  <span className="font-mono font-semibold">
                                    {str(p.normalized.stationId)}
                                  </span>
                                </div>

                                {/* Schedule Time */}
                                <div className="flex items-center gap-1.5 text-foreground bg-background/60 dark:bg-zinc-900/60 p-2 rounded-lg border">
                                  <Clock className="size-3.5 text-blue-600 shrink-0" />
                                  <span className="text-muted-foreground">التوقيت:</span>
                                  <span className="font-medium" dir="ltr">
                                    {formatMinutesToTime(startM)} - {formatMinutesToTime(endM)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({formatDurationMinutes(endM - startM)})
                                  </span>
                                </div>

                                {/* Weekdays */}
                                <div className="flex items-center gap-1.5 text-foreground bg-background/60 dark:bg-zinc-900/60 p-2 rounded-lg border">
                                  <Calendar className="size-3.5 text-purple-600 shrink-0" />
                                  <span className="text-muted-foreground shrink-0">الأيام:</span>
                                  {renderWeekdaysBadges(sched?.weekdays)}
                                </div>
                              </div>

                              {/* Errors if any */}
                              {Object.keys(p.errors).length > 0 && (
                                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-[11px] space-y-1">
                                  {Object.entries(p.errors).map(([field, msg]) => (
                                    <p key={field} className="flex items-center gap-1.5">
                                      <AlertTriangle className="size-3 shrink-0" />
                                      <span className="font-semibold">{field}:</span> {msg}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {/* Diff if update */}
                              {p.diff && p.diff.length > 0 && (
                                <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-[11px] space-y-1">
                                  <span className="font-semibold block">الحقول التي سيتم تحديثها:</span>
                                  {p.diff.map((d) => (
                                    <p key={d.field} className="font-mono text-[10px]">
                                      • {d.field}:{' '}
                                      <span className="line-through text-muted-foreground">
                                        {JSON.stringify(d.oldValue)}
                                      </span>{' '}
                                      ←{' '}
                                      <span className="font-semibold text-blue-700 dark:text-blue-300">
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
                  <ScrollArea className="h-[380px] sm:h-[440px] rounded-xl border p-3">
                    {preview.episodes.length === 0 ? (
                      <p className="text-center py-12 text-xs text-muted-foreground">
                        لا توجد حلقات في هذا الملف.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {preview.episodes.map((e) => (
                          <div
                            key={e.rowNumber}
                            className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                              e.status === 'invalid'
                                ? 'border-destructive/40 bg-destructive/5'
                                : e.status === 'update'
                                  ? 'border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10'
                                  : e.status === 'unchanged'
                                    ? 'bg-muted/20 border-muted opacity-80'
                                    : 'border-emerald-600/30 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-600/50'
                            }`}
                          >
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-teal-600/10 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0">
                                  <Headphones className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-foreground">
                                      {str(e.normalized.title, 'بدون عنوان')}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                                      ID: {e.id}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      الصف #{e.rowNumber}
                                    </span>
                                  </div>
                                  {typeof e.normalized.description === 'string' &&
                                    e.normalized.description && (
                                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                        {e.normalized.description}
                                      </p>
                                    )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {Boolean(e.normalized.isFeatured) && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] gap-1 text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10"
                                  >
                                    <Sparkles className="size-2.5" />
                                    مميزة
                                  </Badge>
                                )}
                                <Badge
                                  variant={e.normalized.isPublished ? 'outline' : 'secondary'}
                                  className={`text-[10px] ${
                                    e.normalized.isPublished
                                      ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                      : ''
                                  }`}
                                >
                                  {e.normalized.isPublished ? 'منشور' : 'مسودة'}
                                </Badge>
                                {e.status === 'create' && (
                                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                                    <CheckCircle2 className="size-2.5" />
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
                                    className="text-[10px] gap-1"
                                  >
                                    <AlertTriangle className="size-2.5" />
                                    خطأ
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Episode Details Chips */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t text-[11px]">
                              {/* Program & Station */}
                              <div className="flex items-center gap-1.5 text-foreground bg-background/60 dark:bg-zinc-900/60 p-2 rounded-lg border">
                                <Layers className="size-3.5 text-teal-600 shrink-0" />
                                <span className="text-muted-foreground">البرنامج:</span>
                                <span className="font-mono font-semibold truncate">
                                  {str(e.normalized.programId)}
                                </span>
                                {typeof e.normalized.stationId === 'string' &&
                                  e.normalized.stationId && (
                                    <span className="text-[10px] bg-muted px-1 py-0.2 rounded font-mono text-muted-foreground shrink-0">
                                      ({e.normalized.stationId})
                                    </span>
                                  )}
                              </div>

                              {/* Duration */}
                              <div className="flex items-center gap-1.5 text-foreground bg-background/60 dark:bg-zinc-900/60 p-2 rounded-lg border">
                                <Clock className="size-3.5 text-blue-600 shrink-0" />
                                <span className="text-muted-foreground">المدة:</span>
                                <span className="font-medium">
                                  {formatDurationSeconds(Number(e.normalized.durationSeconds) || 0)}
                                </span>
                                <span className="text-[10px] text-muted-foreground" dir="ltr">
                                  ({str(e.normalized.durationSeconds)}ث)
                                </span>
                              </div>

                              {/* Broadcast Date */}
                              <div className="flex items-center gap-1.5 text-foreground bg-background/60 dark:bg-zinc-900/60 p-2 rounded-lg border sm:col-span-1">
                                <Calendar className="size-3.5 text-purple-600 shrink-0" />
                                <span className="text-muted-foreground">البث:</span>
                                <span className="font-medium truncate">
                                  {formatBroadcastDate(str(e.normalized.broadcastAt))}
                                </span>
                              </div>

                              {/* Audio Source */}
                              <div className="flex items-center gap-1.5 text-foreground bg-background/60 dark:bg-zinc-900/60 p-2 rounded-lg border">
                                <Volume2 className="size-3.5 text-emerald-600 shrink-0" />
                                <span className="text-muted-foreground">الصوت:</span>
                                {typeof e.normalized.audioUrl === 'string' &&
                                e.normalized.audioUrl ? (
                                  <a
                                    href={e.normalized.audioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 truncate"
                                    title={e.normalized.audioUrl}
                                  >
                                    <span className="truncate">
                                      {extractDomainOrFilename(e.normalized.audioUrl)}
                                    </span>
                                    <ExternalLink className="size-2.5 shrink-0" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">غير محدد</span>
                                )}
                              </div>
                            </div>

                            {/* Errors if any */}
                            {Object.keys(e.errors).length > 0 && (
                              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-[11px] space-y-1">
                                {Object.entries(e.errors).map(([field, msg]) => (
                                  <p key={field} className="flex items-center gap-1.5">
                                    <AlertTriangle className="size-3 shrink-0" />
                                    <span className="font-semibold">{field}:</span> {msg}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Diff if update */}
                            {e.diff && e.diff.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-[11px] space-y-1">
                                <span className="font-semibold block">الحقول التي سيتم تحديثها:</span>
                                {e.diff.map((d) => (
                                  <p key={d.field} className="font-mono text-[10px]">
                                    • {d.field}:{' '}
                                    <span className="line-through text-muted-foreground">
                                      {JSON.stringify(d.oldValue)}
                                    </span>{' '}
                                    ←{' '}
                                    <span className="font-semibold text-blue-700 dark:text-blue-300">
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
