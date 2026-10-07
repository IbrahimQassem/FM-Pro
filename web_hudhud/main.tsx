import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicHome } from '@/public-home';
import '@/styles.css';
import type { Catalog } from './lib/seo';
const initial = document.getElementById('public-catalog');
const initialCatalog = initial ? JSON.parse(initial.textContent || '{}') as Catalog & { status: number } : undefined;
initial?.remove();

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');

createRoot(root).render(
  <StrictMode>
    <PublicHome initialCatalog={initialCatalog} />
  </StrictMode>,
);
