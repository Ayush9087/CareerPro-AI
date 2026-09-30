import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-center gap-2 bg-career-dark px-4 py-2.5 text-sm font-medium text-white animate-slide-down"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline.</span>
    </div>
  );
}
