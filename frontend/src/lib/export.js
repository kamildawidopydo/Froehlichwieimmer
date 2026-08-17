/**
 * Lightweight CSV / download helpers — no external dependencies.
 * Uses UTF-8 BOM for Excel compatibility with German umlauts.
 */

const escapeCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const toCSV = (rows, columns, { delimiter = ';' } = {}) => {
  const header = columns.map((c) => escapeCell(c.header)).join(delimiter);
  const body = rows
    .map((row) =>
      columns.map((c) => escapeCell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(delimiter)
    )
    .join('\n');
  return `${header}\n${body}`;
};

export const downloadFile = (content, filename, mime = 'text/plain;charset=utf-8') => {
  const blob = content instanceof Blob ? content : new Blob(['\uFEFF', content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

export const downloadCSV = (rows, columns, filename) => {
  const csv = toCSV(rows, columns);
  downloadFile(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv;charset=utf-8');
};

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export const formatEUR = (v) =>
  v == null ? '' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
