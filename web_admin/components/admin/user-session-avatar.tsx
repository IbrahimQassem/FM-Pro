import { useState, useEffect } from 'react';
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
  const [error, setError] = useState(false);
  const cleanSrc =
    typeof src === 'string' &&
    (src.trim().startsWith('http://') ||
      src.trim().startsWith('https://') ||
      src.trim().startsWith('/') ||
      src.trim().startsWith('data:image/'))
      ? src.trim()
      : '';
  const initial = name.trim() ? name.trim().charAt(0).toUpperCase() : '';

  useEffect(() => {
    setError(false);
  }, [src]);

  return (
    <span
      className={`grid place-items-center overflow-hidden bg-primary/15 font-bold text-primary shrink-0 select-none ${className}`}
    >
      {cleanSrc && !error ? (
        <img
          src={cleanSrc}
          alt={name}
          onError={() => setError(true)}
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
