import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  documentId,
  getDocFromServer,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Radio, Eye, Save, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioPreview } from './audio-preview';
import { episodeBroadcastTime } from '@/lib/episode-time';
import { LocationImpact } from './location-impact';
import { BannerStatusBadge } from './banner-status-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { firestoreRoot } from '@/lib/firestore-root';
import {
  scheduleClock,
  scheduleMinutes,
  editableSchedule,
  contentFields,
  contentFlags,
  contentPayload,
  editableValue,
  isNetworkUrl,
  validateContent,
  type ContentKind,
} from '@/lib/content-form';

function fieldText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

type Option = { id: string; data: Record<string, unknown> };
const weekdays = [
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
  'الأحد',
];
const control =
  'w-full rounded-xl border bg-background px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60';

export function RelationPicker({
  firestore,
  kind,
  selected,
  onSelect,
  error,
  borderless,
}: {
  firestore: Firestore;
  kind: 'stations' | 'programs' | 'locations';
  selected: string;
  onSelect: (value: Option) => void;
  error?: string;
  borderless?: boolean;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>();
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [lookup, setLookup] = useState('');
  const [currentLabel, setCurrentLabel] = useState<{
    value: string;
    label: string;
  }>();
  useEffect(() => {
    if (!selected || selected.includes('/')) return;
    let active = true;
    const base = collection(firestore, `${firestoreRoot}/${kind}/${kind}`);
    const lookupCurrent = async () => {
      const data =
        kind === 'locations'
          ? await getDocsFromServer(
            query(
              base,
              where('countryCode', '==', 'YE'),
              where('cityCode', '==', selected),
              limit(2),
            ),
          ).then((result) =>
            result.size === 1 ? result.docs[0].data() : undefined,
          )
          : await getDocFromServer(doc(base, selected)).then((result) =>
            result.data(),
          );
      if (active && data)
        setCurrentLabel({
          value: selected,
          label: fieldText(
            data.name ?? data.title ?? data.cityNameAr ?? selected,
          ),
        });
    };
    void lookupCurrent().catch(() => {
      if (active)
        setMessage('تعذر تحميل اسم الارتباط الحالي. تحقّق منه قبل الحفظ.');
    });
    return () => {
      active = false;
    };
  }, [firestore, kind, selected]);
  useEffect(() => {
    let cancelled = false;
    getDocsFromServer(
      query(
        collection(firestore, `${firestoreRoot}/${kind}/${kind}`),
        orderBy(documentId()),
        limit(50),
      ),
    )
      .then((s) => {
        if (!cancelled) {
          setOptions(s.docs.map((d) => ({ id: d.id, data: d.data() })));
          setCursor(s.docs.at(-1));
          setMore(s.size === 50);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage('تعذر تحميل الخيارات. أعد المحاولة.');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [firestore, kind]);
  async function loadMore() {
    setBusy(true);
    setMessage('');
    try {
      const base = collection(firestore, `${firestoreRoot}/${kind}/${kind}`);
      const s = await getDocsFromServer(
        query(
          base,
          orderBy(documentId()),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(50),
        ),
      );
      setOptions((old) => [
        ...old,
        ...s.docs.map((d) => ({ id: d.id, data: d.data() })),
      ]);
      setCursor(s.docs.at(-1));
      setMore(s.size === 50);
    } catch {
      setMessage('تعذر تحميل الخيارات. أعد المحاولة.');
    } finally {
      setBusy(false);
    }
  }
  async function find() {
    if (!lookup.trim() || lookup.includes('/')) return;
    setBusy(true);
    setMessage('');
    try {
      const s = await getDocFromServer(
        doc(firestore, `${firestoreRoot}/${kind}/${kind}`, lookup.trim()),
      );
      if (!s.exists()) {
        setMessage('لا يوجد سجل بهذا المعرّف.');
        return;
      }
      const option = { id: s.id, data: s.data() };
      setOptions((old) => [...old.filter((o) => o.id !== s.id), option]);
      onSelect(option);
    } catch {
      setMessage('تعذر البحث. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }
  const optionValue = (o: Option) =>
    kind === 'locations' ? fieldText(o.data.cityCode) : o.id;
  const label =
    kind === 'stations'
      ? 'المحطة'
      : kind === 'programs'
        ? 'البرنامج'
        : 'المدينة المرجعية';
  return (
    <fieldset
      className={`space-y-3 ${borderless ? 'border-none p-0' : 'rounded-2xl border p-4'}`}
    >
      {!borderless && <legend className="px-2 font-semibold">{label}</legend>}
      <select
        className={control}
        aria-label={label}
        value={selected}
        onChange={(e) => {
          const v = options.find((o) => optionValue(o) === e.target.value);
          if (v) onSelect(v);
        }}
      >
        <option value="">اختر {label}</option>
        {selected && !options.some((o) => optionValue(o) === selected) && (
          <option value={selected}>
            {currentLabel?.value === selected ? currentLabel.label : selected} —
            الارتباط الحالي
          </option>
        )}
        {options.map((o) => (
          <option key={o.id} value={optionValue(o)}>
            {fieldText(
              o.data.name ?? o.data.title ?? o.data.cityNameAr ?? o.id,
            )}
            {o.data.isActive === false ? ' (غير نشط)' : ''}
          </option>
        ))}
      </select>
      {more && (
        <Button
          type="button"
          variant="outline"
          onClick={loadMore}
          disabled={busy}
        >
          {busy ? 'جارٍ التحميل…' : 'تحميل خيارات أخرى'}
        </Button>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer py-2">
          البحث المباشر بمعرّف السجل
        </summary>
        <div className="mt-2 flex gap-2">
          <input
            className={control}
            aria-label="معرّف السجل"
            dir="ltr"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={find}
          >
            بحث
          </Button>
        </div>
      </details>
      {(error || message) && (
        <p role="alert" className="text-sm text-destructive">
          {error || message}
        </p>
      )}
    </fieldset>
  );
}

export function ContentEditor({
  firestore,
  kind,
  label,
  initial,
  isNew,
  recordId,
  onSave,
  onDelete,
  onClose,
}: {
  firestore: Firestore;
  kind: ContentKind;
  label: string;
  initial: Record<string, unknown>;
  isNew: boolean;
  recordId?: string;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => {
    const val = editableValue(initial) as Record<string, unknown>;
    if (kind === 'stations') {
      if (!val.cityCode) val.cityCode = 'sanaa';
      if (!val.cityNameAr) val.cityNameAr = 'صنعاء';
      if (!val.countryCode) val.countryCode = 'YE';
      if (!val.countryNameAr) val.countryNameAr = 'اليمن';
    }
    return val;
  });
  const [validationRequested, setValidationRequested] = useState(false);
  const errors = validationRequested ? validateContent(kind, form) : {};
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmId, setConfirmId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const summary = useRef<HTMLDivElement>(null);
  const update = (key: string, value: unknown) => {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  };
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    const navigate = (event: Event) => {
      if (
        saving ||
        (dirty && !window.confirm('لديك تغييرات غير محفوظة. هل تريد تجاهلها؟'))
      )
        event.preventDefault();
    };
    window.addEventListener('beforeunload', prevent);
    window.addEventListener('admin-before-navigate', navigate);
    return () => {
      window.removeEventListener('beforeunload', prevent);
      window.removeEventListener('admin-before-navigate', navigate);
    };
  }, [dirty, saving]);
  function close() {
    if (
      !saving &&
      (!dirty || window.confirm('لديك تغييرات غير محفوظة. هل تريد تجاهلها؟'))
    )
      onClose();
  }
  async function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const validation = validateContent(kind, form);
    setValidationRequested(true);
    setFailure('');
    if (Object.keys(validation).length) {
      setTab('edit');
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    setSaving(true);
    try {
      await onSave(contentPayload(kind, form));
    } catch (error) {
      setFailure(
        error instanceof Error && error.name === 'ContentError'
          ? error.message
          : 'تعذر الحفظ. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.',
      );
    } finally {
      setSaving(false);
    }
  }
  const canConfirmDelete = Boolean(
    recordId && confirmId.trim() === recordId && !deleting,
  );

  async function handleDeleteConfirm() {
    if (!canConfirmDelete || !onDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete();
      setDeleteDialogOpen(false);
      onClose();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'تعذر الحذف. تحقق من الصلاحيات والعلاقات المرتبطة ثم أعد المحاولة.',
      );
    } finally {
      setDeleting(false);
    }
  }
  const schedule = editableSchedule(form.schedule);
  const broadcast = episodeBroadcastTime(
    form.broadcastAt,
    form.utcOffsetMinutes,
  );
  const audioUrl = fieldText(
    kind === 'stations' ? form.streamUrl : form.audioUrl,
  );
  const picture = fieldText(
    form.imageUrl || form.logoUrl || form.coverUrl || '',
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'إضافة' : 'تعديل'} {label}
          </DialogTitle>
          <DialogDescription>
            أكمل البيانات ثم راجع معاينة المحتوى قبل الحفظ.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 border-b pb-4">
          <Button
            variant={tab === 'edit' ? 'default' : 'outline'}
            onClick={() => setTab('edit')}
          >
            بيانات المحتوى
          </Button>
          <Button
            variant={tab === 'preview' ? 'default' : 'outline'}
            onClick={() => setTab('preview')}
          >
            <Eye /> معاينة
          </Button>
        </div>
        <form noValidate onSubmit={save} className="space-y-5">
          {kind === 'episodes' && (
            <section
              className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm"
              aria-label="موعد البث وحالة النشر"
            >
              <p>
                {form.isPublished === true
                  ? 'منشورة للمستمعين'
                  : 'مسودة — لا تظهر للمستمعين'}
              </p>
              {broadcast ? (
                <>
                  <p>
                    موعد البث بتوقيت الحلقة:{' '}
                    <bdi dir="ltr">
                      {broadcast.local} · {broadcast.offset}
                    </bdi>
                  </p>
                  <p>
                    الموعد المحفوظ: <bdi dir="ltr">{broadcast.utc} UTC</bdi>
                  </p>
                </>
              ) : (
                <p>أدخل موعد بث وفرق توقيت صالحين لعرض الوقت المحلي.</p>
              )}
              <p className="text-muted-foreground">
                تحديد موعد مستقبلي لا ينشر الحلقة تلقائيًا. الظهور يعتمد على حالة
                النشر.
              </p>
            </section>
          )}
          {kind === 'locations' && !isNew && (
            <LocationImpact
              firestore={firestore}
              countryCode={fieldText(initial.countryCode)}
              cityCode={fieldText(initial.cityCode)}
              disabled={saving}
            />
          )}
          <fieldset disabled={saving} className="min-w-0 space-y-5">
            {!!Object.keys(errors).length && (
              <div
                ref={summary}
                tabIndex={-1}
                role="alert"
                className="rounded-xl border border-destructive p-4 text-destructive"
              >
                راجع الحقول المحددة: {Object.values(errors).join(' ')}
              </div>
            )}
            {failure && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 p-4 text-destructive"
              >
                {failure}
              </p>
            )}
            {tab === 'preview' ? (
              <section className="mx-auto max-w-md space-y-4 rounded-3xl border bg-background p-6">
                <p className="text-xs text-muted-foreground">
                  معاينة المحتوى — لا تمثل تشغيل التطبيق أو نشره
                </p>
                {isNetworkUrl(picture, kind === 'stations') ? (
                  <img
                    src={picture}
                    alt=""
                    className="aspect-video w-full rounded-2xl object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-2xl bg-primary/10">
                    <Radio className="size-14 text-primary" />
                  </div>
                )}
                <h3 className="text-2xl font-bold">
                  {fieldText(
                    form.name ||
                    form.title ||
                    form.cityNameAr ||
                    'عنوان المحتوى',
                  )}
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {fieldText(form.description || form.tagline || '')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {contentFlags[kind].map(([key, label]) => (
                    <span
                      key={key}
                      className="rounded-full bg-muted px-3 py-1 text-xs"
                    >
                      {label}: {form[key] ? 'نعم' : 'لا'}
                    </span>
                  ))}
                </div>
                {kind === 'programs' && (
                  <div className="space-y-2 text-sm">
                    {schedule ? (
                      <>
                        <p>
                          {schedule.weekdays
                            .map((day) => weekdays[day - 1])
                            .join('، ')}
                        </p>
                        <p>
                          وقت البث:{' '}
                          <bdi dir="ltr">
                            {scheduleClock(schedule.startMinute)} —{' '}
                            {scheduleClock(schedule.endMinute)}
                          </bdi>
                        </p>
                        <p>
                          فرق التوقيت عن UTC: {schedule.utcOffsetMinutes} دقيقة
                        </p>
                      </>
                    ) : (
                      <p>بدون جدول بث أسبوعي</p>
                    )}
                  </div>
                )}
                {kind === 'banners' && <BannerStatusBadge data={form} />}
                {kind === 'banners' && (
                  <p className="text-sm">
                    الظهور يعتمد أيضًا على وقت البداية والنهاية. تنقل الإعلان غير
                    مفعّل في التطبيق بعد.
                  </p>
                )}
                {(kind === 'stations' || kind === 'episodes') &&
                  isNetworkUrl(audioUrl, true) && (
                    <AudioPreview key={audioUrl} url={audioUrl} />
                  )}
              </section>
            ) : (
              <>
                {kind === 'programs' && (
                  <RelationPicker
                    firestore={firestore}
                    kind="stations"
                    selected={fieldText(form.stationId || '')}
                    error={errors.stationId}
                    onSelect={(o) => update('stationId', o.id)}
                  />
                )}
                {kind === 'episodes' && (
                  <RelationPicker
                    firestore={firestore}
                    kind="programs"
                    selected={fieldText(form.programId || '')}
                    error={errors.programId}
                    onSelect={(o) => {
                      setDirty(true);
                      setForm((f) => ({
                        ...f,
                        programId: o.id,
                        stationId: o.data.stationId,
                      }));
                    }}
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {contentFields[kind].map((field) => {
                    const id = `field-${field.key}`;
                    const value = form[field.key];
                    const common = {
                      id,
                      className: control,
                      required: field.required,
                      'aria-invalid': !!errors[field.key],
                      'aria-describedby': errors[field.key]
                        ? `${id}-error`
                        : undefined,
                    };
                    return (
                      <div
                        key={id}
                        className={`space-y-2 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
                      >
                        <label htmlFor={id} className="text-sm font-medium">
                          {field.label}
                          {field.required && ' *'}
                        </label>
                        {field.type === 'textarea' || field.type === 'list' ? (
                          <textarea
                            {...common}
                            rows={3}
                            value={
                              Array.isArray(value)
                                ? value.join('\n')
                                : fieldText(value || '')
                            }
                            onChange={(e) =>
                              update(
                                field.key,
                                field.type === 'list'
                                  ? e.target.value.split('\n')
                                  : e.target.value,
                              )
                            }
                          />
                        ) : (
                          <input
                            {...common}
                            dir={
                              field.type === 'url' || field.type === 'date'
                                ? 'ltr'
                                : undefined
                            }
                            type={
                              field.type === 'number'
                                ? 'number'
                                : field.type === 'date'
                                  ? 'datetime-local'
                                  : field.type === 'url'
                                    ? 'url'
                                    : 'text'
                            }
                            value={
                              field.type === 'date'
                                ? fieldText(value || '').slice(0, 16)
                                : fieldText(value ?? '')
                            }
                            onChange={(e) =>
                              update(
                                field.key,
                                field.type === 'number'
                                  ? e.target.value === ''
                                    ? ''
                                    : Number(e.target.value)
                                  : field.type === 'date'
                                    ? e.target.value
                                      ? `${e.target.value}:00.000Z`
                                      : null
                                    : e.target.value,
                              )
                            }
                          />
                        )}
                        {errors[field.key] && (
                          <p
                            id={`${id}-error`}
                            className="text-sm text-destructive"
                          >
                            {errors[field.key]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {kind !== 'locations' && (
                  <label className="block space-y-2 text-sm">
                    أولوية العرض (الأعلى أولًا)
                    <input
                      className={control}
                      type="number"
                      value={fieldText(form.priority ?? 0)}
                      onChange={(e) =>
                        update(
                          'priority',
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                )}
                <fieldset className="flex flex-wrap gap-4 rounded-2xl bg-muted p-4">
                  <legend className="sr-only">حالة الظهور</legend>
                  {contentFlags[kind].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex min-h-12 items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form[key] === true}
                        onChange={(e) => update(key, e.target.checked)}
                        className="size-5 accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                {kind === 'programs' && (
                  <section className="space-y-4 rounded-2xl border p-4">
                    <label className="flex min-h-12 items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={!!schedule}
                        onChange={(e) =>
                          update(
                            'schedule',
                            e.target.checked
                              ? {
                                weekdays: [1],
                                startMinute: 480,
                                endMinute: 540,
                                utcOffsetMinutes: 180,
                              }
                              : null,
                          )
                        }
                      />
                      له جدول بث أسبوعي
                    </label>
                    <p className="text-sm text-muted-foreground">
                      البرنامج بلا جدول يظهر في قائمة البرامج فقط. لا تدعم الفترة
                      العابرة لمنتصف الليل.
                    </p>
                    {schedule && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {weekdays.map((label, i) => (
                            <label
                              key={label}
                              className="flex min-h-12 items-center gap-2 rounded-lg border px-3 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={schedule.weekdays.includes(i + 1)}
                                onChange={(e) =>
                                  update('schedule', {
                                    ...schedule,
                                    weekdays: e.target.checked
                                      ? [...schedule.weekdays, i + 1]
                                      : schedule.weekdays.filter(
                                        (d) => d !== i + 1,
                                      ),
                                  })
                                }
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {(
                            [
                              'startMinute',
                              'endMinute',
                              'utcOffsetMinutes',
                            ] as const
                          ).map((key, i) => (
                            <label key={key} className="space-y-2 text-sm">
                              {
                                [
                                  'وقت البداية',
                                  'وقت النهاية (٠٠:٠٠ يعني نهاية اليوم)',
                                  'فرق التوقيت عن UTC بالدقائق',
                                ][i]
                              }
                              <input
                                className={control}
                                type={
                                  key === 'utcOffsetMinutes' ? 'number' : 'time'
                                }
                                dir="ltr"
                                value={
                                  key === 'utcOffsetMinutes'
                                    ? schedule[key]
                                    : scheduleClock(schedule[key])
                                }
                                onChange={(e) =>
                                  update('schedule', {
                                    ...schedule,
                                    [key]:
                                      key === 'utcOffsetMinutes'
                                        ? e.target.value === ''
                                          ? ''
                                          : Number(e.target.value)
                                        : scheduleMinutes(
                                          e.target.value,
                                          key === 'endMinute',
                                        ),
                                  })
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                )}
                {kind === 'banners' && <BannerStatusBadge data={form} />}
                {kind === 'banners' && (
                  <p className="rounded-xl bg-muted p-4 text-sm">
                    تُحفظ بيانات الوجهة الحالية؛ النقر والتنقل عبر الإعلان غير
                    مدعومين بعد في التطبيق.
                  </p>
                )}
                {!isNew && onDelete && recordId && (
                  <section
                    className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                    aria-label="منطقة الخطر"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-semibold text-destructive">
                          منطقة الخطر: حذف {label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          حذف المستند نهائيًا من قاعدة البيانات. سيتطلب كتابة
                          معرّف {label} للتأكيد.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          setConfirmId('');
                          setDeleteError('');
                          setDeleteDialogOpen(true);
                        }}
                        disabled={saving || deleting}
                      >
                        <Trash2 /> حذف {label}…
                      </Button>
                    </div>
                  </section>
                )}
              </>
            )}
            <footer className="sticky bottom-0 flex justify-between gap-3 border-t bg-background py-4">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={saving || deleting}
              >
                <ChevronRight /> إلغاء
              </Button>
              <Button type="submit" disabled={saving || deleting}>
                <Save />
                {saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
              </Button>
            </footer>
          </fieldset>
        </form>
      </DialogContent>
      {deleteDialogOpen && recordId && (
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (!deleting) {
              setDeleteDialogOpen(open);
              if (!open) {
                setConfirmId('');
                setDeleteError('');
              }
            }
          }}
        >
          <DialogContent
            className="z-[60] max-w-lg"
            dir="rtl"
            showCloseButton={!deleting}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" />
                حذف {label} نهائيًا؟
              </DialogTitle>
              <DialogDescription>
                هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف مستند {label}{' '}
                نهائيًا من قاعدة البيانات.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                <p className="font-semibold">تحذير:</p>
                <p className="mt-1 text-xs leading-5">
                  سيتم حذف مستند {label} بالكامل. لتأكيد الحذف النهائي، اكتب
                  معرّف {label} أدناه:
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="delete-confirm-id-display"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  معرّف {label} المطلوب:
                </label>
                <div
                  id="delete-confirm-id-display"
                  dir="ltr"
                  className="select-all rounded-lg border bg-muted/70 px-3 py-2 text-center font-mono text-xs font-bold text-foreground"
                >
                  {recordId}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="delete-confirm-id-input"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  اكتب المعرّف هنا للتأكيد:
                </label>
                <input
                  id="delete-confirm-id-input"
                  type="text"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck="false"
                  className={control}
                  placeholder={recordId}
                  value={confirmId}
                  onChange={(e) => setConfirmId(e.target.value)}
                  disabled={deleting}
                />
              </div>

              {deleteError && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
                >
                  {deleteError}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setConfirmId('');
                  setDeleteError('');
                }}
                disabled={deleting}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!canConfirmDelete}
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="size-4" />
                {deleting ? 'جارٍ الحذف…' : `تأكيد حذف ${label}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
