import { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

export function UserSessionAvatar({
  src,
  name,
  className = 'size-10 rounded-xl',
  iconSize = 'size-5',
}: {
  src?: string | null;
  name: string;
  className?: string;
  iconSize?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const cleanSrc =
    typeof src === 'string' &&
    (src.trim().startsWith('http://') ||
      src.trim().startsWith('https://') ||
      src.trim().startsWith('/') ||
      src.trim().startsWith('data:image/'))
      ? src.trim()
      : '';
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : '';
  const hasError = cleanSrc !== '' && failedSrc === cleanSrc;

  return (
    <span
      className={`grid place-items-center overflow-hidden bg-primary/15 font-bold text-primary shrink-0 select-none ${className}`}
    >
      {cleanSrc && !hasError ? (
        <img
          src={cleanSrc}
          alt={name}
          onError={() => setFailedSrc(cleanSrc)}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : initial ? (
        initial
      ) : (
        <UserIcon className={iconSize} />
      )}
    </span>
  );
}
