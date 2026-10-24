// Development-only fixture. No Firebase, Storage or notification request is made.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageField } from '../components/admin/image-field';
import { Button } from '../components/ui/button';
import type { ImageUpload } from '../lib/admin-images';
import '../app/globals.css';
const result = (id: string): ImageUpload => ({
  url: `${location.origin}/test/fixtures/admin-image.png?upload=${id}`,
  uploadId: id,
  bytes: 96,
  inputBytes: 96,
  width: 8,
  height: 8,
});
const pending: (() => void)[] = [];
function Preview() {
  const [largeText, setLargeText] = useState(false);
  const [mode, setMode] = useState('success');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(0);
  const [saved, setSaved] = useState(0);
  const [requests, setRequests] = useState(0);
  return (
    <main dir="rtl" className="mx-auto max-w-2xl space-y-5 p-5">
      <style>{largeText ? ':root { font-size: 200%; }' : ''}</style>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={largeText}
          onChange={(event) => setLargeText(event.target.checked)}
        />
        تكبير النص 200٪
      </label>
      <h1 className="text-2xl font-bold">صورة المحتوى</h1>
      <p>فحص محلي بملفات تجريبية. لا رفع إلى خدمة حقيقية ولا إرسال إشعارات.</p>
      <label className="grid gap-2">
        محاكاة النتيجة
        <select
          aria-label="محاكاة النتيجة"
          className="rounded-lg border p-2"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="success">نجاح</option>
          <option value="error">فشل الاتصال</option>
          <option value="pending">انتظار</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setDraft((n) => n + 1);
            setValue('');
          }}
        >
          مسودة جديدة
        </Button>
        <Button
          onClick={() => pending.splice(0).forEach((resolve) => resolve())}
        >
          إكمال الطلب المؤجل
        </Button>
      </div>
      <form
        noValidate
        className="space-y-4 rounded-2xl border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && value) setSaved((n) => n + 1);
        }}
      >
        <ImageField
          key={draft}
          id="fixture-image"
          label="صورة المحتوى"
          value={value}
          onChange={setValue}
          onBusyChange={setBusy}
          allowHttp
          scope={{ root: 'HudHudDev', kind: 'banners', field: 'imageUrl' }}
          upload={async (_file, _scope, id) => {
            setRequests((n) => n + 1);
            if (mode === 'error') throw { code: 'functions/unavailable' };
            if (mode === 'pending')
              await new Promise<void>((resolve) => pending.push(resolve));
            return result(id);
          }}
        />
        <Button type="submit" disabled={busy || !value}>
          حفظ النموذج
        </Button>
      </form>
      <output className="block break-all text-xs" aria-label="قيمة الصورة">
        {value || 'فارغ'}
      </output>
      <output>
        طلبات الرفع: {requests}، مرات الحفظ: {saved}
      </output>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
