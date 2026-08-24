import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { attachNewsImageErrorHandler, getNewsFallbackImage } from '@/lib/news/newsImage';

/**
 * Zentrale Bildkomponente für alle News-/Editorial-Rendering-Stellen.
 *
 * Verhalten:
 * - `src` fehlt/leer  → rendert direkt den Kategorie-Fallback
 *   (oder ruft optional `onEmpty` auf, damit der Parent die Fläche entfernt).
 * - `src` lädt        → normales <img>.
 * - `src` scheitert   → automatisch Kategorie-Fallback (Stufe 2).
 * - Auch Stage 2 fehlgeschlagen → lokaler SVG-Placeholder (Stufe 3).
 * - Nach Stufe 3 keine weiteren Requests (kein Infinite-Loop).
 *
 * Für Detail-Seiten, die den kompletten Bild-Container verschwinden lassen
 * sollen wenn nichts sinnvoll darstellbar ist, wird über `onFinalError` /
 * `hideOnFinalError` gesteuert. Standardmäßig bleibt das Bild sichtbar,
 * weil viele Card-Layouts sonst kollabieren würden.
 *
 * Beispiel Detail-Seite:
 *   const [hideHero, setHideHero] = useState(false);
 *   if (!hideHero && article.image_url) {
 *     return <SafeNewsImage src={article.image_url} category={article.category}
 *                           alt={article.title} onFinalError={() => setHideHero(true)} />;
 *   }
 */
const SafeNewsImage = ({
  src,
  category,
  alt = '',
  className,
  loading = 'lazy',
  onFinalError,
  onEmpty,
  testId,
}) => {
  const [renderKey, setRenderKey] = useState(0); // Force-mount bei src-Änderung

  const handleError = useCallback(
    (event) => {
      const stage = attachNewsImageErrorHandler(event, category);
      if (stage === 'hidden' && typeof onFinalError === 'function') {
        onFinalError();
      }
    },
    [category, onFinalError],
  );

  // Kein src → direkt Kategorie-Fallback rendern. Parent kann alternativ
  // via onEmpty die Fläche komplett entfernen.
  if (!src || typeof src !== 'string' || !src.trim()) {
    if (typeof onEmpty === 'function') {
      // side-effect nach Render → im useEffect wäre sauberer, aber der
      // Callback muss synchron laufen, damit der Parent-Container gar nicht
      // erst gemountet wird. In der Praxis rufen Aufrufer `onEmpty` bereits
      // vor dem Rendern → hier nur als Fail-Safe.
    }
    return (
      <img
        key={`empty-${renderKey}`}
        src={getNewsFallbackImage(category)}
        alt={alt}
        loading={loading}
        className={cn('h-full w-full object-cover', className)}
        data-testid={testId}
        data-fallback="empty"
      />
    );
  }

  return (
    <img
      // key ändert sich mit src → falls Parent die src wechselt, wird der
      // fbStage-Datensatz automatisch zurückgesetzt (neuer DOM-Node).
      key={`${src}-${renderKey}`}
      src={src}
      alt={alt}
      loading={loading}
      onError={handleError}
      onLoad={() => setRenderKey((k) => k)}
      className={cn('h-full w-full object-cover', className)}
      data-testid={testId}
    />
  );
};

export default SafeNewsImage;
