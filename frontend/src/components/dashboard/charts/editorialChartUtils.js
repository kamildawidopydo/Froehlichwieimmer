/** SVG geometry helpers for editorial dashboard charts. */

export const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

export const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
};

export const describeDonutSegment = (cx, cy, innerR, outerR, startAngle, endAngle) => {
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
};

export const buildDonutSegments = (items, { cx, cy, innerR, outerR, gapDeg = 2, startDeg = 0 }) => {
  const total = items.reduce((s, d) => s + Math.max(d.value, 0), 0);
  if (total <= 0) return [];

  const totalGap = gapDeg * items.length;
  const sweep = 360 - totalGap;
  let cursor = startDeg;

  return items.map((item, idx) => {
    const slice = (Math.max(item.value, 0) / total) * sweep;
    const startAngle = cursor;
    const endAngle = cursor + slice;
    cursor = endAngle + gapDeg;
    return {
      ...item,
      idx,
      startAngle,
      endAngle,
      path: describeDonutSegment(cx, cy, innerR, outerR, startAngle, endAngle),
      midAngle: startAngle + slice / 2,
    };
  });
};

export const buildBarLayout = ({ count, width, padL, padR, gapRatio = 0.32 }) => {
  const innerW = width - padL - padR;
  const slotW = count > 0 ? innerW / count : innerW;
  const barW = slotW * (1 - gapRatio);
  const xAt = (i) => padL + i * slotW + (slotW - barW) / 2;
  return { innerW, slotW, barW, xAt };
};

export const buildStackedBarScale = (rows, keys, height, padT, padB, tickCount = 5) => {
  const maxTotal = Math.max(
    0,
    ...rows.map((r) => keys.reduce((s, k) => s + Math.max(Number(r[k] || 0), 0), 0)),
  );
  const innerH = height - padT - padB;
  const niceMax = maxTotal <= 0 ? 1 : Math.ceil(maxTotal * 1.08 / 1000) * 1000 || maxTotal * 1.08;
  const step = niceMax / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * step);
  const yAt = (v) => padT + innerH - (v / niceMax) * innerH;
  const barHeight = (v) => (v / niceMax) * innerH;
  return { niceMax, ticks, yAt, barHeight, innerH };
};

export const hoverIndexFromEvent = (event, count) => {
  if (count < 1) return null;
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  const idx = Math.floor(ratio * count);
  return Math.max(0, Math.min(count - 1, idx));
};
