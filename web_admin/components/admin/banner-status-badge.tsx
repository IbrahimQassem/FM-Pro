import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  bannerStatus,
  bannerStatusLabels,
  bannerTime,
} from '@/lib/banner-status';

export function BannerStatusBadge({ data }: { data: Record<string, unknown> }) {
  const [now, setNow] = useState(Date.now);
  const start = bannerTime(data.startAt),
    end = bannerTime(data.expiresAt);
  useEffect(() => {
    let timer: number;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const next = [start, end]
        .filter(
          (time): time is number =>
            time !== null && Number.isFinite(time) && time > current,
        )
        .sort((a, b) => a - b)[0];
      if (next !== undefined)
        timer = window.setTimeout(
          tick,
          Math.min(next - current + 1, 2147483647),
        );
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [start, end]);
  const status = bannerStatus(data, now);
  return (
    <Badge variant={status === 'visible' ? 'default' : 'secondary'}>
      {bannerStatusLabels[status]}
    </Badge>
  );
}
