function dataUrlToUint8Array(dataUrl) {
  if (!dataUrl) return null;
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function embedSignatureInPdf(doc, page, dataUrl, x, baselineY, maxWidth, maxHeight, downShift = 0) {
  if (!dataUrl) return;
  const bytes = dataUrlToUint8Array(dataUrl);
  if (!bytes) return;
  try {
    const isJpeg = /^data:image\/jpe?g/i.test(dataUrl);
    const image = isJpeg ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x,
      y: baselineY - downShift,
      width,
      height,
    });
  } catch (err) {
    console.warn('[embedSignatureInPdf] failed:', err);
  }
}
