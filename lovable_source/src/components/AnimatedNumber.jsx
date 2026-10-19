import { useEffect, useRef, useState } from 'react';

const AnimatedNumber = ({
  value,
  duration = 700,
  format = (v) => String(Math.round(v)),
  className,
}) => {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(null);
  const fromRef = useRef(value);

  useEffect(() => {
    if (!Number.isFinite(value)) return;
    fromRef.current = display;
    const start = performance.now();
    const from = fromRef.current;
    const delta = value - from;
    if (Math.abs(delta) < 0.001) {
      setDisplay(value);
      return;
    }
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(from + delta * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
};

export default AnimatedNumber;
