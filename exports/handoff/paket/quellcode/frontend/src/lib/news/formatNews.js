const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatterLong = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatNewsDate = (iso, { long = false } = {}) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const fmt = long ? dateFormatterLong : dateFormatter;
  return `${fmt.format(d)} Uhr`;
};

export const formatReadTime = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n === 1 ? '1 Min. Lesezeit' : `${n} Min. Lesezeit`;
};

export const groupVideosByShowLabel = (videos) => {
  if (!Array.isArray(videos) || videos.length === 0) return [];
  const groups = new Map();
  for (const video of videos) {
    const label = video.show_label?.trim() || 'Weitere Videos';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(video);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
};

export const formatVideoDuration = (seconds) => {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = Math.floor(n % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const splitParagraphs = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
};

export const normalizeNewsText = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[„“”"']/g, '')
    .replace(/[.,;:!?()[\]{}]/g, '')
    .trim();

export const dedupeSummaryParagraphs = (paragraphs, summary) => {
  if (!summary || paragraphs.length === 0) return paragraphs;
  const first = paragraphs[0];
  if (normalizeNewsText(first) === normalizeNewsText(summary)) {
    return paragraphs.slice(1);
  }
  return paragraphs;
};

export const shouldShowSummary = (summary, paragraphs) => {
  if (!summary) return false;
  if (paragraphs.length === 0) return true;
  return normalizeNewsText(paragraphs[0]) !== normalizeNewsText(summary);
};
