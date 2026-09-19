import { useState, useEffect, useMemo, useId } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Firestore,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { firestoreRoot } from '@/lib/firestore-root';
import { formatNotificationDateTime } from '@/lib/user-date';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Bell,
  Send,
  Smartphone,
  Sparkles,
  Radio,
  PlayCircle,
  Globe,
  Layers,
  History,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Lock,
  Wifi,
  Battery,
  ImageIcon,
} from 'lucide-react';

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetType: 'general' | 'station' | 'episode' | 'url';
  targetId?: string;
  targetLabel?: string;
  topic: string;
  sentAt?: unknown;
  sentBy?: string;
  status: string;
  messageId?: string;
};

type StationItem = {
  id: string;
  name: string;
  logoUrl?: string;
  thumbnailUrl?: string;
  cityNameAr?: string;
};

type EpisodeItem = {
  id: string;
  title: string;
  stationId?: string;
};

const TEMPLATES = [
  {
    name: 'بث مباشر الآن 🎙️',
    title: 'بث مباشر الآن 🎙️',
    body: 'استمع الآن إلى التغطية الإذاعية الحية والمباشرة عبر هدهد FM',
    targetType: 'station' as const,
  },
  {
    name: 'حلقة جديدة 📻',
    title: 'حلقة جديدة متوفرة الآن 📻',
    body: 'تمت إضافة حلقة جديدة ومميزة، استمع إليها الآن أينما كنت!',
    targetType: 'episode' as const,
  },
  {
    name: 'تحديث التطبيق 🚀',
    title: 'تحديث جديد لتطبيق هدهد FM 🚀',
    body: 'قم بتحديث التطبيق الآن للاستمتاع بأحدث الميزات وتحسينات الأداء واستقرار البث.',
    targetType: 'general' as const,
  },
  {
    name: 'برنامج مميز ⭐',
    title: 'موعد برنامجك المفضل ⭐',
    body: 'يبدأ بعد قليل البرنامج الإذاعي المفضل لديك، انضم إلينا واستمتع بالبث.',
    targetType: 'general' as const,
  },
];

export function NotificationsManager({
  firestore,
  user: _user,
}: {
  firestore: Firestore;
  user: User;
}) {
  // Form fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'general' | 'station' | 'episode' | 'url'>('general');
  const [targetId, setTargetId] = useState('');
  const [targetLabel, setTargetLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Dropdown data
  const [stations, setStations] = useState<StationItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);

  // Mobile preview mode
  const [previewMode, setPreviewMode] = useState<'lockscreen' | 'banner'>('lockscreen');
  const [simulating, setSimulating] = useState(false);

  // Broadcast state
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    messageId?: string;
  } | null>(null);

  // History state
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic live clock for phone preview
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stations and episodes for selectors
  useEffect(() => {
    const stationsQuery = query(
      collection(firestore, `${firestoreRoot}/stations/stations`),
      orderBy('name', 'asc'),
      limit(100),
    );
    const unsubStations = onSnapshot(stationsQuery, (snap) => {
      const list: StationItem[] = snap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) || d.id,
        logoUrl: (d.data().logoUrl as string) || '',
        thumbnailUrl: (d.data().thumbnailUrl as string) || '',
        cityNameAr: (d.data().cityNameAr as string) || '',
      }));
      setStations(list);
    });

    const episodesQuery = query(
      collection(firestore, `${firestoreRoot}/episodes/episodes`),
      orderBy('title', 'asc'),
      limit(100),
    );
    const unsubEpisodes = onSnapshot(episodesQuery, (snap) => {
      const list: EpisodeItem[] = snap.docs.map((d) => ({
        id: d.id,
        title: (d.data().title as string) || d.id,
        stationId: (d.data().stationId as string) || '',
      }));
      setEpisodes(list);
    });

    return () => {
      unsubStations();
      unsubEpisodes();
    };
  }, [firestore]);

  // Fetch broadcast history
  useEffect(() => {
    const notifQuery = query(
      collection(firestore, `${firestoreRoot}/notifications/notifications`),
      orderBy('sentAt', 'desc'),
      limit(50),
    );
    const unsubHistory = onSnapshot(
      notifQuery,
      (snap) => {
        const list: NotificationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: (data.title as string) || '',
            body: (data.body as string) || '',
            imageUrl: (data.imageUrl as string | undefined) || undefined,
            targetType: (data.targetType as NotificationRecord['targetType']) || 'general',
            targetId: data.targetId as string | undefined,
            targetLabel: data.targetLabel as string | undefined,
            topic: (data.topic as string) || 'hudhud_fm_announcements',
            sentAt: data.sentAt,
            sentBy: data.sentBy as string | undefined,
            status: (data.status as string) || 'sent',
            messageId: data.messageId as string | undefined,
          };
        });
        setHistory(list);
        setHistoryLoading(false);
      },
      (err) => {
        console.error('Failed to load notification history:', err);
        setHistoryLoading(false);
      },
    );

    return () => unsubHistory();
  }, [firestore]);

  // Handle template selection
  const handleApplyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setTitle(tpl.title);
    setBody(tpl.body);
    setTargetType(tpl.targetType);
    if (tpl.targetType === 'station' && stations.length > 0) {
      setTargetId(stations[0].id);
      setTargetLabel(stations[0].name);
    } else if (tpl.targetType === 'episode' && episodes.length > 0) {
      setTargetId(episodes[0].id);
      setTargetLabel(episodes[0].title);
    } else {
      setTargetId('');
      setTargetLabel('');
    }
    triggerSimulate();
  };

  // Handle station pick
  const handleStationChange = (id: string) => {
    setTargetId(id);
    const found = stations.find((s) => s.id === id);
    setTargetLabel(found ? found.name : id);
  };

  // Handle episode pick
  const handleEpisodeChange = (id: string) => {
    setTargetId(id);
    const found = episodes.find((e) => e.id === id);
    setTargetLabel(found ? found.title : id);
  };

  // Simulate notification banner drop
  const triggerSimulate = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
    }, 1500);
  };

  // Send broadcast notification via Cloud Function
  const handleSendBroadcast = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);
    setStatusMessage(null);
    try {
      const functions = getFunctions();
      const broadcastFn = httpsCallable<
        {
          title: string;
          body: string;
          imageUrl?: string;
          targetType: string;
          targetId?: string;
          targetLabel?: string;
          root?: string;
        },
        { success: boolean; notificationId: string; messageId: string }
      >(functions, 'adminBroadcastNotification');

      const res = await broadcastFn({
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        targetType,
        targetId: targetId.trim() || undefined,
        targetLabel: targetLabel.trim() || undefined,
        root: firestoreRoot,
      });

      setStatusMessage({
        type: 'success',
        text: 'تم إرسال الإشعار بنجاح إلى جميع الأجهزة والمستمعين عبر FCM!',
        messageId: res.data.messageId,
      });
      setConfirmOpen(false);
      // Reset composer
      setTitle('');
      setBody('');
      setImageUrl('');
      setTargetType('general');
      setTargetId('');
      setTargetLabel('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إرسال الإشعار. يرجى المحاولة لاحقاً.';
      setStatusMessage({
        type: 'error',
        text: message,
      });
      setConfirmOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  // Delete notification record from history
  const handleDeleteHistory = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا السجل من تاريخ الإشعارات؟')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(firestore, `${firestoreRoot}/notifications/notifications/${id}`));
    } catch (err) {
      console.error('Error deleting notification record:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Re-use notification as template
  const handleReuseNotification = (notif: NotificationRecord) => {
    setTitle(notif.title);
    setBody(notif.body);
    setImageUrl(notif.imageUrl || '');
    setTargetType(notif.targetType);
    setTargetId(notif.targetId || '');
    setTargetLabel(notif.targetLabel || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerSimulate();
  };

  // Filter history items
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const queryTerm = historySearch.toLowerCase();
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(queryTerm) ||
        h.body.toLowerCase().includes(queryTerm) ||
        (h.targetLabel && h.targetLabel.toLowerCase().includes(queryTerm)) ||
        (h.sentBy && h.sentBy.toLowerCase().includes(queryTerm)),
    );
  }, [history, historySearch]);

  const displayTitle = title.trim() || 'عنوان الإشعار يظهر هنا';
  const displayBody =
    body.trim() || 'هذا نص تجريبي لمعاينة شكل الإشعار عند وصوله إلى هواتف المستمعين عبر هدهد FM.';

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
              <Bell className="size-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                إرسال الإشعارات والتنبيهات العامة
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                بث إشعارات فورية (Push Notifications) عبر Firebase Cloud Messaging لجميع مستخدمي هدهد FM
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs gap-1.5 border-primary/20 bg-primary/5 text-primary">
            <Wifi className="size-3.5" />
            <span>Topic: hudhud_fm_announcements</span>
          </Badge>
        </div>
      </div>

      {/* Status feedback message */}
      {statusMessage && (
        <Alert
          variant={statusMessage.type === 'error' ? 'destructive' : 'default'}
          className={
            statusMessage.type === 'success'
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
              : ''
          }
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <div className="ms-2">
            <AlertTitle className="font-semibold">
              {statusMessage.type === 'success' ? 'نجحت العملية' : 'حدث خطأ'}
            </AlertTitle>
            <AlertDescription className="text-sm mt-1">
              {statusMessage.text}
              {statusMessage.messageId && (
                <div className="mt-1 font-mono text-xs opacity-75">
                  معرّف FCM: {statusMessage.messageId}
                </div>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Main Grid: Composer & Mobile Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Composer Form (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-500" />
                  <span>محرر الإشعار الجديد</span>
                </CardTitle>
                {(title || body) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTitle('');
                      setBody('');
                      setImageUrl('');
                      setTargetType('general');
                      setTargetId('');
                      setTargetLabel('');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    تفريغ الحقول
                  </Button>
                )}
              </div>
              <CardDescription>
                أدخل تفاصيل التنبيه لاختباره بالمعاينة الحية وإرساله لجميع الهواتف.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Quick Template Presets */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">قوالب جاهزة سريعة:</div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((tpl) => (
                    <Button
                      key={tpl.name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="text-xs h-8 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {tpl.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={titleId} className="text-sm font-medium text-foreground">
                    عنوان الإشعار <span className="text-destructive">*</span>
                  </label>
                  <span
                    className={`text-xs font-mono ${
                      title.length > 90
                        ? 'text-destructive font-bold'
                        : title.length > 70
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {title.length} / 100
                  </span>
                </div>
                <Input
                  id={titleId}
                  placeholder="مثال: بث مباشر الآن: افتتاح المهرجان الإذاعي 🎙️"
                  value={title}
                  maxLength={100}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base md:text-sm font-medium"
                />
              </div>

              {/* Body textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={bodyId} className="text-sm font-medium text-foreground">
                    نص الإشعار <span className="text-destructive">*</span>
                  </label>
                  <span
                    className={`text-xs font-mono ${
                      body.length > 230
                        ? 'text-destructive font-bold'
                        : body.length > 180
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {body.length} / 250
                  </span>
                </div>
                <Textarea
                  id={bodyId}
                  placeholder="اكتب هنا التفاصيل التي ستظهر للمستخدم في شاشة الهاتف عند وصول التنبيه..."
                  value={body}
                  maxLength={250}
                  rows={3}
                  onChange={(e) => setBody(e.target.value)}
                  className="text-base md:text-sm leading-relaxed"
                />
              </div>

              {/* Image URL (optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="notif-image-url" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-muted-foreground" />
                    صورة الإشعار (اختياري)
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </div>
                <Input
                  id="notif-image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg (رابط صورة HTTPS)"
                  value={imageUrl}
                  dir="ltr"
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-sm font-mono"
                />
                {imageUrl && (
                  <div className="flex items-start gap-2 pt-1">
                    <img
                      src={imageUrl}
                      alt="معاينة الصورة"
                      className="h-14 w-24 rounded-lg object-cover border bg-muted shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      ستظهر الصورة أسفل نص الإشعار في معظم أجهزة Android وiOS التي تدعم الصور في الإشعارات.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Destination */}
              <div className="space-y-3 pt-2 border-t">
                <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Layers className="size-4 text-primary" />
                  <span>وجهة النقر (الإجراء عند فتح الإشعار)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('general');
                      setTargetId('');
                      setTargetLabel('');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      targetType === 'general'
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <Smartphone className="size-5 mb-1" />
                    <span>عام (الرئيسية)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('station');
                      if (stations.length > 0) {
                        setTargetId(stations[0].id);
                        setTargetLabel(stations[0].name);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      targetType === 'station'
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <Radio className="size-5 mb-1" />
                    <span>محطة محددة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('episode');
                      if (episodes.length > 0) {
                        setTargetId(episodes[0].id);
                        setTargetLabel(episodes[0].title);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      targetType === 'episode'
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <PlayCircle className="size-5 mb-1" />
                    <span>حلقة صوتية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('url');
                      setTargetId('');
                      setTargetLabel('');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      targetType === 'url'
                        ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                        : 'border-border hover:bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <Globe className="size-5 mb-1" />
                    <span>رابط خارجي</span>
                  </button>
                </div>

                {/* Sub-selector depending on targetType */}
                {targetType === 'station' && (
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="target-station-select" className="text-xs font-medium text-muted-foreground">اختر المحطة المراد تشغيلها:</label>
                    <select
                      id="target-station-select"
                      value={targetId}
                      onChange={(e) => handleStationChange(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.cityNameAr ? `(${s.cityNameAr})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'episode' && (
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="target-episode-select" className="text-xs font-medium text-muted-foreground">اختر الحلقة المراد فتحها:</label>
                    <select
                      id="target-episode-select"
                      value={targetId}
                      onChange={(e) => handleEpisodeChange(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {episodes.map((ep) => (
                        <option key={ep.id} value={ep.id}>
                          {ep.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'url' && (
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="target-url-input" className="text-xs font-medium text-muted-foreground">الرابط الخارجي (URL):</label>
                    <Input
                      id="target-url-input"
                      type="url"
                      placeholder="https://example.com/live"
                      value={targetId}
                      dir="ltr"
                      onChange={(e) => {
                        setTargetId(e.target.value);
                        setTargetLabel(e.target.value);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Broadcast Trigger Button */}
              <div className="pt-4 border-t">
                <Button
                  size="lg"
                  disabled={!title.trim() || !body.trim() || isSending}
                  onClick={() => setConfirmOpen(true)}
                  className="w-full h-12 text-base font-semibold gap-2 shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary text-primary-foreground transition-all cursor-pointer"
                >
                  <Send className="size-5 rtl:rotate-180" />
                  <span>إرسال الإشعار لجميع الأجهزة النشطة الآن 🚀</span>
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  سيتم بث هذا الإشعار لجميع المستمعين الذين قاموا بتثبيت التطبيق واشتركوا في التنبيهات.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Mobile Mockup Preview (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Smartphone className="size-4 text-primary" />
              <span>معاينة حية على الهاتف (Live Mobile Preview)</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSimulate}
              className="text-xs h-7 gap-1"
            >
              <RefreshCw className={`size-3 ${simulating ? 'animate-spin' : ''}`} />
              <span>محاكاة وصول الإشعار</span>
            </Button>
          </div>

          {/* Preview Mode Selector */}
          <div className="flex rounded-lg bg-muted p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setPreviewMode('lockscreen');
                triggerSimulate();
              }}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                previewMode === 'lockscreen'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              شاشة القفل 🔒
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewMode('banner');
                triggerSimulate();
              }}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                previewMode === 'banner'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              شريط علوي منسدل (Banner) 📲
            </button>
          </div>

          {/* Smartphone Frame */}
          <div className="relative mx-auto w-full max-w-[320px] rounded-[42px] p-3 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black shadow-2xl border-4 border-neutral-700/80 ring-1 ring-black/50">
            {/* Phone Screen Container */}
            <div
              className={`relative overflow-hidden rounded-[32px] aspect-[9/18.5] flex flex-col justify-between text-white select-none transition-colors ${
                previewMode === 'lockscreen'
                  ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950'
                  : 'bg-gradient-to-br from-slate-900 via-zinc-900 to-neutral-950'
              }`}
            >
              {/* Wallpaper Ambient Glow */}
              <div className="absolute inset-0 bg-radial from-violet-600/20 via-transparent to-transparent pointer-events-none" />

              {/* Status Bar & Dynamic Island */}
              <div className="relative z-20 px-6 pt-3 flex items-center justify-between text-[11px] font-semibold text-white/90">
                <span className="font-mono tracking-tighter">{currentTime}</span>
                {/* Dynamic Island Notch */}
                <div className="h-5 w-24 bg-black rounded-full flex items-center justify-end px-2.5 shadow-xs border border-white/5">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <Wifi className="size-3" />
                  <Battery className="size-3.5 fill-current" />
                </div>
              </div>

              {/* Lock Screen Content */}
              {previewMode === 'lockscreen' ? (
                <div className="relative z-10 px-4 flex-1 flex flex-col justify-start pt-8">
                  {/* Lock icon */}
                  <div className="flex justify-center mb-1">
                    <Lock className="size-4 text-white/70" />
                  </div>

                  {/* Clock */}
                  <div className="text-center">
                    <div className="text-5xl font-light tracking-tight font-mono text-white/95">
                      {currentTime}
                    </div>
                    <div className="text-xs text-white/70 font-medium mt-1">
                      السبت، ١٩ سبتمبر
                    </div>
                  </div>

                  {/* Notification Card on Lock Screen */}
                  <div
                    className={`mt-8 rounded-2xl p-3.5 backdrop-blur-xl bg-white/15 dark:bg-black/40 border border-white/20 shadow-xl transition-all duration-500 ${
                      simulating ? 'scale-105 ring-2 ring-primary/60' : 'scale-100'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between text-[11px] mb-1.5 text-white/80">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <div className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-[9px] shadow-xs">
                          FM
                        </div>
                        <span>هدهد FM</span>
                      </div>
                      <span className="text-[10px] text-white/60">الآن</span>
                    </div>

                    {/* Title */}
                    <div className="font-bold text-xs leading-snug text-white line-clamp-1 mb-1">
                      {displayTitle}
                    </div>

                    {/* Body */}
                    <div className="text-[11px] leading-relaxed text-white/85 line-clamp-3">
                      {displayBody}
                    </div>

                    {/* Destination tag */}
                    {targetType !== 'general' && (
                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center gap-1 text-[10px] text-amber-300">
                        {targetType === 'station' && <Radio className="size-3" />}
                        {targetType === 'episode' && <PlayCircle className="size-3" />}
                        {targetType === 'url' && <Globe className="size-3" />}
                        <span className="line-clamp-1">
                          {targetLabel || (targetType === 'station' ? 'فتح المحطة' : targetType === 'episode' ? 'فتح الحلقة' : 'فتح الرابط')}
                        </span>
                      </div>
                    )}

                    {/* Image preview (lock screen) */}
                    {imageUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden">
                        <img
                          src={imageUrl}
                          alt="صورة الإشعار"
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Heads-Up Banner Mode */
                <div className="relative z-10 px-3 flex-1 flex flex-col justify-start pt-2">
                  {/* Floating Notification Banner */}
                  <div
                    className={`rounded-2xl p-3 backdrop-blur-2xl bg-neutral-900/90 border border-white/15 shadow-2xl transition-all duration-300 ${
                      simulating ? 'translate-y-2 ring-2 ring-primary' : 'translate-y-0'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md mt-0.5">
                        FM
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-0.5">
                          <span className="font-semibold text-neutral-200">هدهد FM</span>
                          <span>الآن</span>
                        </div>
                        <div className="font-semibold text-xs text-white leading-tight line-clamp-1">
                          {displayTitle}
                        </div>
                        <div className="text-[11px] text-neutral-300 leading-snug line-clamp-2 mt-0.5">
                          {displayBody}
                        </div>
                        {/* Image preview (banner) */}
                        {imageUrl && (
                          <div className="mt-1.5 rounded-lg overflow-hidden">
                            <img
                              src={imageUrl}
                              alt="صورة الإشعار"
                              className="w-full h-16 object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* App background simulation */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-40">
                    <Radio className="size-12 text-primary mb-2" />
                    <div className="text-xs font-medium text-neutral-400">واجهة هدهد FM</div>
                    <div className="text-[10px] text-neutral-500 mt-1">البث المباشر يعمل بالخلفية</div>
                  </div>
                </div>
              )}

              {/* Home bar indicator */}
              <div className="relative z-20 pb-2 flex justify-center">
                <div className="h-1 w-28 bg-white/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog before Broadcasting */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <AlertCircle className="size-5 text-amber-500" />
              <span>تأكيد إرسال الإشعار لجميع المستمعين</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1.5">
              يرجى مراجعة محتوى الإشعار قبل الإرسال. سيتم إرسال هذا الإشعار فوراً لجميع الأجهزة المشتركة في قناة التنبيهات عبر Firebase Cloud Messaging.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 border-y">
            <div className="rounded-lg bg-muted/60 p-3 space-y-1.5">
              <div className="text-xs text-muted-foreground">عنوان الإشعار:</div>
              <div className="text-sm font-bold text-foreground">{title}</div>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 space-y-1.5">
              <div className="text-xs text-muted-foreground">نص الإشعار:</div>
              <div className="text-sm text-foreground leading-relaxed">{body}</div>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">نوع الوجهة:</span>
              <Badge variant="outline">
                {targetType === 'general' && 'عام (الصفحة الرئيسية)'}
                {targetType === 'station' && `محطة: ${targetLabel || targetId}`}
                {targetType === 'episode' && `حلقة: ${targetLabel || targetId}`}
                {targetType === 'url' && `رابط: ${targetId}`}
              </Badge>
            </div>

            {imageUrl && (
              <div className="rounded-lg bg-muted/60 p-3 space-y-1.5">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="size-3" />
                  صورة الإشعار:
                </div>
                <img
                  src={imageUrl}
                  alt="صورة الإشعار"
                  className="w-full h-28 rounded-lg object-cover border"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <p className="text-[10px] text-muted-foreground font-mono break-all" dir="ltr">{imageUrl}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isSending}
              onClick={() => setConfirmOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              disabled={isSending}
              onClick={handleSendBroadcast}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>جارٍ البث عبر FCM...</span>
                </>
              ) : (
                <>
                  <Send className="size-4 rtl:rotate-180" />
                  <span>تأكيد وبث الإشعار الآن</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast History Table */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <History className="size-5 text-primary" />
                <span>سجل الإشعارات المرسلة سابقاً ({history.length})</span>
              </CardTitle>
              <CardDescription>
                تاريخ الإشعارات التي تم إرسالها عبر لوحة التحكم مع إمكانية إعادة استخدامها أو حذفها
              </CardDescription>
            </div>

            {/* Search filter in history */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث في السجل..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pr-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {historyLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span>جارٍ تحميل سجل الإشعارات...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground space-y-2">
              <Bell className="size-10 mx-auto text-muted-foreground/40" />
              <div className="text-sm font-medium">لا توجد إشعارات مسجلة</div>
              <div className="text-xs">
                {historySearch ? 'لا توجد نتائج مطابقة لبحثك' : 'ابدأ بإنشاء إشعارك الأول أعلاه وسيتم حفظه في هذا السجل'}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">التاريخ والوقت</TableHead>
                  <TableHead className="min-w-[200px]">عنوان الإشعار</TableHead>
                  <TableHead className="min-w-[300px]">نص الإشعار</TableHead>
                  <TableHead className="w-[140px]">الوجهة</TableHead>
                  <TableHead className="w-[160px]">المرسل</TableHead>
                  <TableHead className="w-[130px] text-start">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((notif) => (
                  <TableRow key={notif.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatNotificationDateTime(notif.sentAt, 'الآن')}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        {notif.imageUrl && (
                          <img
                            src={notif.imageUrl}
                            alt="صورة"
                            className="size-8 rounded-md object-cover border shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        {notif.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground leading-relaxed line-clamp-2 max-w-[350px]">
                      {notif.body}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {notif.targetType === 'station'
                          ? `محطة: ${notif.targetLabel || notif.targetId}`
                          : notif.targetType === 'episode'
                            ? `حلقة: ${notif.targetLabel || notif.targetId}`
                            : notif.targetType === 'url'
                              ? 'رابط خارجي'
                              : 'عام'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">
                      {notif.sentBy || 'الأدمن'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="استخدام كقالب"
                          onClick={() => handleReuseNotification(notif)}
                          className="size-8 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="حذف من السجل"
                          disabled={deletingId === notif.id}
                          onClick={() => handleDeleteHistory(notif.id)}
                          className="size-8 text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === notif.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
