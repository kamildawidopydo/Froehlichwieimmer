/**
 * Load static PDFs from the deployed site (/public/pdfs) on the server.
 * Avoids sending multi‑MB base64 blobs in the request body (Vercel 4.5MB limit).
 */
function getSiteOrigin() {
  if (process.env.REACT_APP_SITE_URL?.trim()) {
    return process.env.REACT_APP_SITE_URL.trim().replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return 'https://www.kapitalmitte.com';
}

/** Skip huge PDFs as Resend attachments (Vercel memory/timeout). */
const MAX_ATTACHMENT_BYTES = 1_200_000;

function isPdfBuffer(buf) {
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
}

async function fetchPdfAsBase64FromUrl(relativeOrAbsoluteUrl) {
  const origin = getSiteOrigin();
  const url = relativeOrAbsoluteUrl.startsWith('http')
    ? relativeOrAbsoluteUrl
    : `${origin}${relativeOrAbsoluteUrl.startsWith('/') ? '' : '/'}${relativeOrAbsoluteUrl}`;

  try {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const contentLength = head.headers.get('content-length');
      if (contentLength && Number(contentLength) > MAX_ATTACHMENT_BYTES) {
        console.warn(`[fetchSitePdf] skip large PDF (${contentLength} bytes via HEAD): ${url}`);
        return { tooLarge: true, url, filename: null };
      }
    } catch (headErr) {
      console.warn(`[fetchSitePdf] HEAD failed for ${url}:`, headErr.message);
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[fetchSitePdf] ${url} → ${response.status}`);
      return null;
    }
    const ct = response.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      console.warn(`[fetchSitePdf] HTML instead of PDF: ${url}`);
      return null;
    }
    const buf = Buffer.from(await response.arrayBuffer());
    if (!isPdfBuffer(buf)) {
      console.warn(`[fetchSitePdf] invalid PDF bytes: ${url}`);
      return null;
    }
    if (buf.length > MAX_ATTACHMENT_BYTES) {
      console.warn(`[fetchSitePdf] skip large PDF (${buf.length} bytes): ${url}`);
      return { tooLarge: true, url, filename: null };
    }
    return { tooLarge: false, content: buf.toString('base64') };
  } catch (err) {
    console.warn(`[fetchSitePdf] failed ${url}:`, err.message);
    return null;
  }
}

/**
 * @param {{ url: string, filename: string }[]} pdfConfigs
 * @returns {Promise<{ filename: string, content: string }[]>}
 */
async function fetchSitePdfs(pdfConfigs) {
  if (!pdfConfigs?.length) return [];

  const origin = getSiteOrigin();
  const results = await Promise.all(
    pdfConfigs.map(async ({ url, filename }) => {
      const fetched = await fetchPdfAsBase64FromUrl(url);
      if (!fetched) return null;
      if (fetched.tooLarge) {
        const href = url.startsWith('http') ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
        return { filename, content: null, downloadUrl: href };
      }
      return { filename, content: fetched.content };
    }),
  );

  return results.filter(Boolean);
}

module.exports = { getSiteOrigin, fetchSitePdfs, fetchPdfAsBase64FromUrl };
