import { Camera, Radio } from 'lucide-react';
import links from '../assets/platform-links.json' with { type: 'json' };

export function PlatformLinks() {
  return (
    <nav aria-label="HudHud FM platform links" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {links.map((link) => {
        const Icon = link.id === 'instagram' ? Camera : Radio;
        return (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, minWidth: 44, padding: '8px 12px' }}>
            <Icon size={18} aria-hidden="true" />
            <span>{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
