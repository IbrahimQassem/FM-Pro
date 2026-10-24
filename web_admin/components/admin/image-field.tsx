import { useEffect, useRef, useState } from 'react';
import { Upload, Link as LinkIcon, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isNetworkUrl } from '@/lib/content-form';
import {
  imageUploadError,
  uploadImage,
  validateImageFile,
  type ImageScope,
  type ImageUpload,
} from '@/lib/admin-images';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  scope: ImageScope;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  allowHttp?: boolean;
  upload?: typeof uploadImage;
};
export function ImageField(props: Props) {
  return <ImageFieldInput key={JSON.stringify(props.scope)} {...props} />;
}
function ImageFieldInput({
  id,
  label,
  value,
  onChange,
  scope,
  onBusyChange,
  disabled,
  required,
  error,
  allowHttp = false,
  upload = uploadImage,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'link' | 'file'>('link');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [preview, setPreview] = useState('');
  const [broken, setBroken] = useState('');
  const [result, setResult] = useState<ImageUpload | null>(null);
  const [selection, setSelection] = useState<{
    file: File;
    operationId: string;
  } | null>(null);
  const lifecycle = useRef({
    generation: 0,
    busy: false,
    onBusyChange,
    onChange,
    value,
  });
  useEffect(() => {
    const life = lifecycle.current;
    life.onBusyChange = onBusyChange;
    life.onChange = onChange;
    life.value = value;
  }, [onBusyChange, onChange, value]);
  useEffect(() => {
    const life = lifecycle.current;
    return () => {
      life.generation++;
      if (life.busy) life.onBusyChange?.(false);
      life.busy = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function clearPreview() {
    setPreview('');
  }
  function stopWaiting() {
    const life = lifecycle.current;
    life.generation++;
    life.busy = false;
    setBusy(false);
    life.onBusyChange?.(false);
  }
  const missingParent =
    ['programs', 'episodes'].includes(scope.kind) &&
    (!scope.stationId || (scope.kind === 'episodes' && !scope.programId));
  async function send(file: File, operationId: string) {
    const life = lifecycle.current;
    const current = ++life.generation;
    const startValue = value;
    life.busy = true;
    setBusy(true);
    life.onBusyChange?.(true);
    setFailure('');
    setResult(null);
    try {
      const uploaded = await upload(file, scope, operationId);
      if (current !== life.generation || life.value !== startValue) return;
      setResult(uploaded);
      life.onChange(uploaded.url);
      clearPreview();
    } catch (err) {
      if (current !== life.generation || life.value !== startValue) return;
      setFailure(imageUploadError(err));
      if ((err as { code?: string }).code === 'functions/failed-precondition')
        setSelection((current) =>
          current ? { ...current, operationId: crypto.randomUUID() } : null,
        );
    } finally {
      if (current === life.generation) {
        life.busy = false;
        setBusy(false);
        life.onBusyChange?.(false);
      }
    }
  }
  async function selected(file?: File) {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setFailure(problem);
      return;
    }
    stopWaiting();
    clearPreview();
    const chosen = { file, operationId: crypto.randomUUID() };
    setSelection(chosen);
    setPreview(URL.createObjectURL(file));
    setBroken('');
    await send(file, chosen.operationId);
  }
  const image = preview || (isNetworkUrl(value, allowHttp) ? value : '');
  return (
    <div className="min-w-0 space-y-2" aria-busy={busy}>
      <label
        htmlFor={mode === 'file' ? `${id}-file` : id}
        className="text-sm font-medium"
      >
        {label}
        {required ? ' *' : ''}
      </label>
      <fieldset
        className="flex flex-wrap gap-2"
        aria-label={`طريقة اختيار ${label}`}
      >
        <Button
          type="button"
          variant={mode === 'link' ? 'secondary' : 'outline'}
          size="sm"
          disabled={disabled || busy}
          aria-pressed={mode === 'link'}
          onClick={() => setMode('link')}
        >
          <LinkIcon className="size-4" />
          لصق رابط
        </Button>
        <Button
          type="button"
          variant={mode === 'file' ? 'secondary' : 'outline'}
          size="sm"
          disabled={disabled || busy}
          aria-pressed={mode === 'file'}
          onClick={() => setMode('file')}
        >
          <Upload className="size-4" />
          رفع صورة
        </Button>
      </fieldset>
      {mode === 'link' ? (
        <Input
          id={id}
          type="url"
          dir="ltr"
          value={value}
          disabled={disabled || busy}
          required={required}
          placeholder="https://example.com/image.webp"
          aria-invalid={!!error}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
          onChange={(event) => {
            stopWaiting();
            clearPreview();
            setSelection(null);
            setResult(null);
            setFailure('');
            onChange(event.target.value);
          }}
        />
      ) : (
        <div className="space-y-2">
          <Input
            ref={fileInput}
            className="hidden"
            id={`${id}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || busy || missingParent}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              void selected(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy || missingParent}
            aria-label={`اختيار ملف ${label}`}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-4" /> اختيار صورة
          </Button>
          {selection && (
            <p className="break-all text-xs text-muted-foreground">
              الملف المختار: <bdi>{selection.file.name}</bdi>
            </p>
          )}
        </div>
      )}
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        للرفع: JPEG أو PNG أو WebP حتى 2 م.ب. و16 ميغابكسل.{' '}
        {scope.kind === 'notifications'
          ? 'تُضغط الملفات، وتُستخدم خلفية بيضاء للصور الشفافة لتوافق الإشعارات.'
          : 'تُصغّر الملفات وتُضغط تلقائيًا قبل التخزين مع الحفاظ على الشفافية.'}
      </p>
      {missingParent && mode === 'file' && (
        <p className="text-xs text-muted-foreground">
          {scope.kind === 'episodes'
            ? 'اختر البرنامج المرتبط أولًا لرفع الصورة.'
            : 'اختر المحطة أولًا لرفع الصورة.'}
        </p>
      )}
      {busy && (
        <div className="flex flex-wrap items-center gap-2">
          <output className="inline-flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            جارٍ ضغط الصورة ورفعها…
          </output>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              stopWaiting();
              setFailure(
                'أُلغي انتظار النتيجة. قد يكتمل الرفع على الخادم؛ لن يتغير حقل الصورة.',
              );
            }}
          >
            إلغاء الانتظار
          </Button>
        </div>
      )}
      {failure && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{failure}</p>
          {selection && !busy && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || missingParent}
              onClick={() => {
                if (selection) void send(selection.file, selection.operationId);
              }}
            >
              إعادة المحاولة
            </Button>
          )}
        </div>
      )}
      {result && result.url === value && (
        <output className="block text-xs text-muted-foreground">
          تم رفع الصورة: {Math.ceil(result.bytes / 1024)} ك.ب.{' '}
          {result.inputBytes > result.bytes
            ? `— توفير ${Math.round((1 - result.bytes / result.inputBytes) * 100)}٪`
            : ''}{' '}
          (
          <bdi dir="ltr">
            {result.width} × {result.height}
          </bdi>
          ). احفظ النموذج لتطبيقها.
        </output>
      )}
      {image && broken !== image && (
        <img
          src={image}
          alt={`معاينة ${label}`}
          className="h-28 max-w-full rounded-lg border bg-muted object-contain"
          onError={() => setBroken(image)}
        />
      )}
      {image && broken === image && (
        <p className="text-xs text-muted-foreground">
          تعذّر عرض المعاينة. تحقّق من رابط الصورة.
        </p>
      )}
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || busy}
          onClick={() => {
            stopWaiting();
            clearPreview();
            setSelection(null);
            setResult(null);
            setFailure('');
            onChange('');
          }}
        >
          إزالة الصورة من النموذج
        </Button>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && result.url === value && (
        <p className="text-xs text-muted-foreground">
          يمكن إعادة استخدام الرابط. إزالة الصورة من النموذج لا تحذف الملف
          المرفوع.
        </p>
      )}
    </div>
  );
}
