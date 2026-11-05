import React from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Small heart toggle used on Aktien- and Markt-Kacheln.
 * Consumers pass the current `watched` state + `onAdd/onRemove` handlers so
 * the component stays state-less and reusable across two contexts.
 */
const WatchButton = ({
  symbol,
  displayName,
  assetType = 'stock',
  watched,
  isAuthed,
  onAdd,
  onRemove,
  size = 16,
  className = '',
  variant = 'floating',
  testid,
}) => {
  const navigate = useNavigate();

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      toast.message('Anmelden zum Merken', {
        description: 'Legen Sie Ihre persönliche Watchlist an — kostenlos.',
        action: {
          label: 'Anmelden',
          onClick: () => navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`),
        },
      });
      return;
    }
    try {
      if (watched) {
        await onRemove(symbol);
        toast.success(`${displayName || symbol} entfernt`);
      } else {
        await onAdd({ symbol, display_name: displayName, asset_type: assetType });
        toast.success(`${displayName || symbol} zur Watchlist hinzugefügt`);
      }
    } catch (err) {
      toast.error('Aktion fehlgeschlagen. Bitte erneut versuchen.');
    }
  };

  const positionClass = variant === 'floating'
    ? 'absolute right-2.5 top-2.5 border border-bank-border bg-white/95 backdrop-blur-sm shadow-editorial-sm hover:bg-white'
    : 'border border-bank-border bg-white hover:bg-bank-bg/50';

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={testid || `watch-btn-${symbol}`}
      aria-label={watched ? `${displayName || symbol} von Watchlist entfernen` : `${displayName || symbol} zur Watchlist hinzufügen`}
      aria-pressed={watched}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 ${positionClass} ${className}`}
    >
      <Heart
        size={size}
        strokeWidth={1.6}
        className={watched ? 'text-rose-600' : 'text-bank-text-muted'}
        fill={watched ? 'currentColor' : 'none'}
      />
    </button>
  );
};

export default WatchButton;
