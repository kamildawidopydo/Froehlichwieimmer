/** PDF aus /assets/documents/ laden (SPA-Fallback auf HTML erkennen). */
export async function fetchPdfBlob(fileUrl) {
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.blob();
  const type = (res.headers.get('content-type') || raw.type || '').toLowerCase();
  if (type.includes('text/html')) {
    throw new Error('not_pdf');
  }
  return raw.type === 'application/pdf' ? raw : new Blob([raw], { type: 'application/pdf' });
}
