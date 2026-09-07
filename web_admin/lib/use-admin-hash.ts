import { useSyncExternalStore } from 'react';
function subscribe(notify: () => void) {
  window.addEventListener('hashchange', notify);
  return () => {
    window.removeEventListener('hashchange', notify);
  };
}
export function useAdminHash() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
}
