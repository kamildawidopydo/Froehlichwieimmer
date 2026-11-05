function isPdfBytes(bytes) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export async function fetchPdfAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Failed to fetch PDF: ${url} (${response.status})`);
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    console.warn(`PDF URL returned HTML (file missing?): ${url}`);
    return null;
  }
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (!isPdfBytes(bytes)) {
    console.warn(`Invalid PDF content at ${url}`);
    return null;
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function fetchAdditionalPdfs(pdfConfigs) {
  const results = await Promise.allSettled(
    pdfConfigs.map(async ({ url, filename }) => {
      const content = await fetchPdfAsBase64(url);
      if (!content) return null;
      return { filename, content };
    })
  );
  return results
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
}
