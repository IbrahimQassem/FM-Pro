import { useEffect, useRef, useState } from 'react';

/** Manual preview only; unmount/source changes always stop playback. */
export function AudioPreview({ url }: { url: string }) {
  const player = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const audio = player.current;
    if (audio) audio.src = url;
    return () => {
      audio?.pause();
      audio?.removeAttribute('src');
      audio?.load();
    };
  }, [url]);
  return (
    <section
      className="space-y-3 rounded-xl border p-3"
      aria-label="اختبار الصوت"
    >
      <p className="text-sm font-semibold">اختبار الصوت</p>
      {/* URL diagnostics only: the existing live/episode schema has no caption track. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={player}
        src={url}
        controls
        preload="none"
        className="w-full"
        aria-label="مشغّل معاينة المحتوى"
        onError={() => setFailed(true)}
        onPlaying={() => setFailed(false)}
      />
      {failed && (
        <output className="block text-sm text-destructive">
          تعذر تشغيل الرابط في المتصفح.
        </output>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        يبدأ التشغيل عند طلبك ويتوقف عند مغادرة المعاينة. قد تمنع سياسات المتصفح
        أو الشبكة تشغيل بعض الروابط، خصوصًا روابط HTTP داخل صفحة HTTPS. هذه
        المعاينة لا تثبت توفر البث في تطبيق الهاتف.
      </p>
    </section>
  );
}
