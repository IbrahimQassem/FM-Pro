import { Camera, Radio } from 'lucide-react';
import links from '../../../assets/platform-links.json' with { type: 'json' };

export function PlatformLinks() {
  return (
    <nav aria-label="HudHud FM platform links" className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {links.map((link) => {
        const Icon = link.id === 'instagram' ? Camera : Radio;
        return (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Icon className="size-4" aria-hidden="true" />
            <span>{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
