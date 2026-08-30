import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AdminApp } from '@/components/admin/admin-app';
import '@/app/globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root is missing.');
}

createRoot(root).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
