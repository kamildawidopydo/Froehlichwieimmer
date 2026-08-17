/** ~200 words per minute, minimum 1 minute. */
export const computeReadTimeMinutes = (
  content: string | null | undefined,
  summary: string | null | undefined,
  title: string | null | undefined,
): number => {
  const text = [title, summary, content]
    .filter((s) => s && String(s).trim().length > 0)
    .join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};
