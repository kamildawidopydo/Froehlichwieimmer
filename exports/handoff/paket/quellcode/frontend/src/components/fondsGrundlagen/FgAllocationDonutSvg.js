import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

function sectorPath(cx, cy, R, r, a0, a1) {
  const xos = cx + R * Math.cos(a0);
  const yos = cy + R * Math.sin(a0);
  const xoe = cx + R * Math.cos(a1);
  const yoe = cy + R * Math.sin(a1);
  const xis = cx + r * Math.cos(a0);
  const yis = cy + r * Math.sin(a0);
  const xie = cx + r * Math.cos(a1);
  const yie = cy + r * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${xos} ${yos} A ${R} ${R} 0 ${large} 1 ${xoe} ${yoe} L ${xie} ${yie} A ${r} ${r} 0 ${large} 0 ${xis} ${yis} Z`;
}

/** Segmente mit Winkel-Lücken + dünne weiße Fugen wie Referenz-Print. */
export function buildAllocationDonutGeometry(segments, { cx = 100, cy = 100, R = 88, r = 56, gapDeg = 1.35 } = {}) {
  const gapRad = (gapDeg * Math.PI) / 180;
  const totalPct = segments.reduce((s, x) => s + x.pct, 0);
  const fullSweep = 2 * Math.PI - segments.length * gapRad;
  let theta = -Math.PI / 2 + gapRad / 2;
  const paths = [];
  const labels = [];
  const rm = (R + r) / 2;
  for (const seg of segments) {
    const sweep = (seg.pct / totalPct) * fullSweep;
    const a0 = theta;
    const a1 = theta + sweep;
    paths.push({ key: seg.label, d: sectorPath(cx, cy, R, r, a0, a1), fill: seg.color });
    const mid = (a0 + a1) / 2;
    const light = seg.pct <= 5 || seg.pct === 10;
    labels.push({
      key: `${seg.label}-pct`,
      x: cx + rm * Math.cos(mid),
      y: cy + rm * Math.sin(mid),
      pct: seg.pct,
      fs: seg.pct >= 25 ? 12 : seg.pct >= 15 ? 10.5 : 9.5,
      fill: light ? '#1e293b' : '#ffffff',
    });
    theta = a1 + gapRad;
  }
  return { paths, labels, cx, cy, r };
}

const FgAllocationDonutSvg = memo(function FgAllocationDonutSvg({ segments, showSegmentPct = true, className }) {
  const { paths, labels, cx, cy, r } = useMemo(() => buildAllocationDonutGeometry(segments), [segments]);

  return (
    <svg viewBox="0 0 200 200" className={cn('block h-[13rem] w-[13rem] shrink-0 sm:h-[14rem] sm:w-[14rem]', className)} aria-hidden>
      <g>
        {paths.map((p) => (
          <path
            key={p.key}
            d={p.d}
            fill={p.fill}
            stroke="#fff"
            strokeWidth={2.2}
            strokeLinejoin="round"
            className="dark:stroke-bank-surface"
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r - 0.5} fill="#fff" className="dark:fill-bank-surface" />
      {showSegmentPct
        ? labels.map((t) => (
            <text
              key={t.key}
              x={t.x}
              y={t.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={t.fill}
              fontSize={t.fs}
              fontWeight="700"
              fontFamily='system-ui, "IBM Plex Sans", sans-serif'
              className="tabular-nums"
              style={{ paintOrder: 'stroke fill', stroke: t.fill === '#ffffff' ? 'rgba(0,0,0,0.12)' : 'none', strokeWidth: t.fill === '#ffffff' ? 0.35 : 0 }}
            >
              {t.pct}%
            </text>
          ))
        : null}
    </svg>
  );
});
FgAllocationDonutSvg.displayName = 'FgAllocationDonutSvg';

export default FgAllocationDonutSvg;
