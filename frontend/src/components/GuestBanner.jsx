import { Info } from 'lucide-react';
import { useApp } from '../lib/AppContext';

// Reminder shown to guests that nothing they open is kept after the tab is closed.
export default function GuestBanner() {
  const { user, openAuth } = useApp();
  if (user) return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:px-6 sm:text-sm" role="note">
      <Info size={15} className="shrink-0" />
      <p className="min-w-0 flex-1">Guest mode: your files are removed when you close this tab.</p>
      <button className="shrink-0 font-semibold underline underline-offset-2" onClick={openAuth}>Sign in to save</button>
    </div>
  );
}
