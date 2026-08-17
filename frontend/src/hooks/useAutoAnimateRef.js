import { useEffect, useRef } from 'react';
import autoAnimate from '@formkit/auto-animate';

/**
 * Subtle list reorder / insert animations for dashboard tables and feeds.
 * @param {boolean} active — re-run when conditional parent mounts (e.g. list length > 0)
 */
const useAutoAnimateRef = (active = true) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return undefined;

    const controller = autoAnimate(el, {
      duration: 280,
      easing: 'ease-out',
    });

    return () => {
      controller?.destroy?.();
    };
  }, [active]);

  return ref;
};

export default useAutoAnimateRef;
