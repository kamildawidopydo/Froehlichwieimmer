import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';
import { useWatchlist } from '@/services/watchlistApi';

/**
 * Editorial-styled Watchlist toggle for /aktien/:symbol.
 * - When user is logged in: toggles the symbol in the persisted watchlist.
 * - When logged out: redirects to /login?next=<current-page>.
 * All persistence lives in Mongo via `/api/watchlist` (see server.py). No
 * localStorage-Pseudo-Watchlist as a primary store — session-bound state only.
 */
export default function StockWatchButton({ symbol, displayName }) {
  const { isAuthed, isWatched, add, remove, loading } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const watched = isWatched(symbol);
  const label = !isAuthed
    ? 'Zur Watchlist hinzufügen'
    : watched
      ? 'In Watchlist · entfernen'
      : 'Zur Watchlist hinzufügen';

  const onClick = async () => {
    if (!isAuthed) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      if (watched) {
        await remove(symbol);
        toast.success(`${displayName || symbol} aus der Watchlist entfernt`);
      } else {
        await add({ symbol, display_name: displayName || symbol, asset_type: 'stock' });
        toast.success(`${displayName || symbol} zur Watchlist hinzugefügt`);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Aktion fehlgeschlagen.';
      toast.error(msg === 'LOGIN_REQUIRED' ? 'Bitte einloggen.' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || loading}
      aria-pressed={watched}
      aria-label={label}
      data-testid="stock-watch-button"
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em]',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
        watched
          ? 'border-bank-primary/60 bg-bank-primary/10 text-bank-primary-strong hover:bg-bank-primary/15'
          : 'border-bank-border bg-white text-bank-text hover:border-bank-primary hover:text-bank-primary-strong dark:bg-bank-surface',
        (busy || loading) && 'cursor-wait opacity-60',
      )}
    >
      <Heart
        className={cn('h-4 w-4', watched && 'fill-bank-primary text-bank-primary')}
        strokeWidth={LUCIDE_STROKE}
        aria-hidden
      />
      {label}
    </button>
  );
}
