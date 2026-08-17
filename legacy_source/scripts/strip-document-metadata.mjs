/**
 * Strip Info/XMP metadata from dokumente PDFs via pdf-lib only (no raw binary scrub).
 * Run: node scripts/strip-document-metadata.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, PDFName } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_DIR = path.resolve(__dirname, '../public/assets/documents');

const FILES = [
  'Kapitalmitte_Kundendokumente.pdf',
  'Kapitalmitte_Risiken_der_Kapitalanlage.pdf',
  'Kapitalmitte_Informationsbogen_Einlagenloesungen.pdf',
  'Freistellungsauftrag.pdf',
];

async function stripAllMetadata(inputBytes, outPath) {
  const pdf = await PDFDocument.load(inputBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  try {
    const infoRef = pdf.context.trailer.get(PDFName.of('Info'));
    if (infoRef) {
      pdf.context.trailer.delete(PDFName.of('Info'));
      try {
        pdf.context.delete(infoRef);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const metaRef = pdf.catalog.get(PDFName.of('Metadata'));
    if (metaRef) {
      pdf.catalog.delete(PDFName.of('Metadata'));
      try {
        pdf.context.delete(metaRef);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }

  try {
    pdf.setTitle('');
    pdf.setAuthor('');
    pdf.setSubject('');
    pdf.setKeywords([]);
    pdf.setCreator('');
    pdf.setProducer('');
  } catch {
    /* ignore */
  }

  let out = await pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
  const pdf2 = await PDFDocument.load(out, { ignoreEncryption: true, updateMetadata: false });
  try {
    const infoRef = pdf2.context.trailer.get(PDFName.of('Info'));
    if (infoRef) pdf2.context.trailer.delete(PDFName.of('Info'));
    const metaRef = pdf2.catalog.get(PDFName.of('Metadata'));
    if (metaRef) pdf2.catalog.delete(PDFName.of('Metadata'));
  } catch {
    /* ignore */
  }
  try {
    pdf2.setTitle('');
    pdf2.setAuthor('');
    pdf2.setSubject('');
    pdf2.setKeywords([]);
    pdf2.setCreator('');
    pdf2.setProducer('');
  } catch {
    /* ignore */
  }
  out = await pdf2.save({ useObjectStreams: false, updateFieldAppearances: false });
  fs.writeFileSync(outPath, out);
}

async function main() {
  for (const f of FILES) {
    const p = path.join(DOC_DIR, f);
    if (!fs.existsSync(p)) {
      console.warn('skip', f);
      continue;
    }
    try {
      await stripAllMetadata(fs.readFileSync(p), p);
    } catch (err) {
      console.error('FAIL', f, err.message);
      continue;
    }
    const check = await PDFDocument.load(fs.readFileSync(p), {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    console.log(
      'OK',
      f,
      `title=${JSON.stringify(check.getTitle() || '')}`,
      `author=${JSON.stringify(check.getAuthor() || '')}`,
      `producer=${JSON.stringify(check.getProducer() || '')}`,
      `creator=${JSON.stringify(check.getCreator() || '')}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
