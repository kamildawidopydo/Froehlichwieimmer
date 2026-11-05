export function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return '';
  return dataUrl.replace(/^data:image\/\w+;base64,/, '');
}

/** Resize signature for PDF embedding — keeps transparent background. */
export function prepareSignatureForPdf(dataUrl, maxWidth = 320) {
  if (!dataUrl || typeof document === 'undefined') return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Resize signature for email API (keeps request under Vercel body limits). */
export function compressSignatureDataUrl(dataUrl, maxWidth = 420) {
  if (!dataUrl || typeof document === 'undefined') return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function buildCompressedSignatureEmailAttachments(formData, customerName) {
  const safe = (customerName || 'Kunde').replace(/\s+/g, '_');
  const attachments = [];
  if (formData.sig1_image) {
    const compressed = await compressSignatureDataUrl(formData.sig1_image);
    attachments.push({
      filename: `Unterschrift_1_${safe}.jpg`,
      content: dataUrlToBase64(compressed),
    });
  }
  if (formData.sig2_image) {
    const compressed = await compressSignatureDataUrl(formData.sig2_image);
    attachments.push({
      filename: `Unterschrift_2_${safe}.jpg`,
      content: dataUrlToBase64(compressed),
    });
  }
  return attachments;
}

export function buildSignatureEmailAttachments(formData, customerName) {
  const safe = (customerName || 'Kunde').replace(/\s+/g, '_');
  const attachments = [];
  if (formData.sig1_image) {
    attachments.push({
      filename: `Unterschrift_1_${safe}.png`,
      content: dataUrlToBase64(formData.sig1_image),
    });
  }
  if (formData.sig2_image) {
    attachments.push({
      filename: `Unterschrift_2_${safe}.png`,
      content: dataUrlToBase64(formData.sig2_image),
    });
  }
  return attachments;
}
