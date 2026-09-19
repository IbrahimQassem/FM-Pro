import { useState } from 'react';
import { Radio } from 'lucide-react';

export function StationLogo({
  name,
  logoUrl,
  thumbnailUrl,
  frequency,
  className = 'size-9',
  iconClassName = 'size-4',
}: {
  name?: string;
  logoUrl?: unknown;
  thumbnailUrl?: unknown;
  frequency?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [error, setError] = useState(false);

  const rawUrl =
    typeof logoUrl === 'string' && logoUrl.trim()
      ? logoUrl.trim()
      : typeof thumbnailUrl === 'string' && thumbnailUrl.trim()
        ? thumbnailUrl.trim()
        : '';

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const firstLetter = cleanName ? cleanName.slice(0, 1) : 'م';

  if (rawUrl && !error) {
    return (
      <img
        src={rawUrl}
        alt={cleanName || 'شعار المحطة'}
        loading="lazy"
        onError={() => setError(true)}
        className={`${className} shrink-0 rounded-xl object-cover border bg-muted/50 shadow-2xs`}
      />
    );
  }

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20 shadow-2xs select-none`}
      title={cleanName}
      aria-hidden="true"
    >
      {frequency ? (
        <Radio className={iconClassName} />
      ) : (
        <span>{firstLetter}</span>
      )}
    </div>
  );
}
