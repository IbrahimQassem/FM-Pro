import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AccountDeletionPage } from '@/components/account/account-deletion-page';
import { AdminApp } from '@/components/admin/admin-app';
import { CommunityGuidelinesPage } from '@/components/public/community-guidelines-page';
import { PrivacyPolicyPage } from '@/components/public/privacy-policy-page';
import { TermsOfServicePage } from '@/components/public/terms-of-service-page';
import '@/app/globals.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root is missing.');
}

const pathname = window.location.pathname;
const publicTitles: Record<string, string> = {
  '/account-deletion': 'حذف الحساب | هدهد إف إم',
  '/community-guidelines': 'إرشادات المجتمع | هدهد إف إم',
  '/privacy': 'سياسة الخصوصية | هدهد إف إم',
  '/terms': 'شروط الخدمة | هدهد إف إم',
};
document.title = publicTitles[pathname] ?? 'إدارة هدهد إف إم';

const page =
  pathname === '/account-deletion' ? (
    <AccountDeletionPage />
  ) : pathname === '/community-guidelines' ? (
    <CommunityGuidelinesPage />
  ) : pathname === '/privacy' ? (
    <PrivacyPolicyPage />
  ) : pathname === '/terms' ? (
    <TermsOfServicePage />
  ) : (
    <AdminApp />
  );

createRoot(root).render(<StrictMode>{page}</StrictMode>);
