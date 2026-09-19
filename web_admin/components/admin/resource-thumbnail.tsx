import { useState } from 'react';
import {
  Radio,
  Mic2,
  PlayCircle,
  Megaphone,
  MapPin,
  User,
  MessageSquare,
  Flag,
  Heart,
  Bell,
} from 'lucide-react';
import { type ResourceKey } from '@/lib/admin-resources';
import { type AdminRecord } from '@/components/admin/admin-app';

export function ResourceThumbnail({
  resource,
  record,
  title,
  className = 'size-10',
  iconClassName = 'size-4',
}: {
  resource: ResourceKey;
  record: AdminRecord;
  title: string;
  className?: string;
  iconClassName?: string;
}) {
  const [imageError, setImageError] = useState(false);

  // Extract raw image URL based on resource type
  let rawUrl = '';
  if (resource === 'stations') {
    const url = record.data.logoUrl || record.data.thumbnailUrl;
    if (typeof url === 'string') rawUrl = url.trim();
  } else if (resource === 'programs') {
    const url = record.data.coverUrl || record.data.thumbnailUrl;
    if (typeof url === 'string') rawUrl = url.trim();
  } else if (resource === 'episodes') {
    const url = record.data.coverUrl;
    if (typeof url === 'string') rawUrl = url.trim();
  } else if (resource === 'banners') {
    const url = record.data.imageUrl;
    if (typeof url === 'string') rawUrl = url.trim();
  } else if (resource === 'users') {
    const url = record.data.avatarUrl;
    if (typeof url === 'string') rawUrl = url.trim();
  } else if (resource === 'comments') {
    const url = record.data.authorAvatar;
    if (typeof url === 'string') rawUrl = url.trim();
  }

  const cleanTitle = title.trim();
  const firstLetter = cleanTitle ? cleanTitle.slice(0, 1) : '';

  if (rawUrl && !imageError) {
    return (
      <img
        src={rawUrl}
        alt={cleanTitle || 'معاينة'}
        loading="lazy"
        onError={() => setImageError(true)}
        className={`${className} shrink-0 rounded-xl object-cover border bg-muted/50 shadow-2xs`}
      />
    );
  }

  // Fallback rendering per resource
  switch (resource) {
    case 'stations':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          {record.data.frequency ? (
            <Radio className={iconClassName} />
          ) : (
            <span>{firstLetter || 'م'}</span>
          )}
        </div>
      );

    case 'programs':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <Mic2 className={iconClassName} />
        </div>
      );

    case 'episodes':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs border border-purple-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <PlayCircle className={iconClassName} />
        </div>
      );

    case 'banners':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <Megaphone className={iconClassName} />
        </div>
      );

    case 'locations':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <MapPin className={iconClassName} />
        </div>
      );

    case 'users':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs border border-sky-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          {firstLetter ? <span>{firstLetter}</span> : <User className={iconClassName} />}
        </div>
      );

    case 'comments':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <MessageSquare className={iconClassName} />
        </div>
      );

    case 'reports':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <Flag className={iconClassName} />
        </div>
      );

    case 'favorites':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold text-xs border border-pink-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <Heart className={`${iconClassName} fill-pink-500/20`} />
        </div>
      );

    case 'subscriptions':
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs border border-teal-500/20 shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <Bell className={iconClassName} />
        </div>
      );

    default:
      return (
        <div
          className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground font-bold text-xs border shadow-2xs select-none`}
          title={cleanTitle}
          aria-hidden="true"
        >
          <span>{firstLetter || '•'}</span>
        </div>
      );
  }
}
