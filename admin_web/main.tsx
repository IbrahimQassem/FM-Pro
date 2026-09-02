import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AccountDeletionPage } from '@/components/account/account-deletion-page';
import { AdminApp } from '@/components/admin/admin-app';
import { CommunityGuidelinesPage } from '@/components/public/community-guidelines-page';
import '@/app/globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root is missing.');
}

const page =
  window.location.pathname === '/account-deletion' ? (
    <AccountDeletionPage />
  ) : window.location.pathname === '/community-guidelines' ? (
    <CommunityGuidelinesPage />
  ) : (
    <AdminApp />
  );

createRoot(root).render(<StrictMode>{page}</StrictMode>);
