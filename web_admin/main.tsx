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
  '/account-deletion': 'حذف الحساب | هدهد FM',
  '/community-guidelines': 'إرشادات المجتمع | هدهد FM',
  '/privacy': 'سياسة الخصوصية | هدهد FM',
  '/terms': 'شروط الخدمة | هدهد FM',
};
document.title = publicTitles[pathname] ?? 'إدارة هدهد FM';

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
