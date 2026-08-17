/**
 * Swap inline headers → BunqContractHeader on generated forms.
 * node scripts/patch-bunq-headers.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

function swapHeader(rel, productTitle, introTitle, bodyClass) {
  const file = path.join(root, rel);
  let s = fs.readFileSync(file, 'utf8');

  if (!s.includes("from '@/components/bunq/BunqContractHeader'")) {
    s = s.replace(
      "import SignaturePad from '@/components/SignaturePad';\nimport { buildSignatureEmailAttachments }",
      "import SignaturePad from '@/components/SignaturePad';\nimport BunqContractHeader, { BunqContractIntro } from '@/components/bunq/BunqContractHeader';\nimport { buildSignatureEmailAttachments }",
    );
  }

  const start = s.indexOf('<main className="contract-paper');
  const section1 = s.indexOf('{/* Section 1: Kundendaten */}');
  if (start < 0 || section1 < 0) {
    console.error('markers missing', rel);
    process.exit(1);
  }

  const oldBlock = s.slice(start, section1);
  const paras = [...oldBlock.matchAll(/<p>[\s\S]*?<\/p>/g)].map((m) => m[0]);
  const introParas = paras.slice(0, 2).join('\n            ');

  const mid = `<main className="contract-paper py-0 max-w-[860px] mx-auto my-4 md:my-8 bg-white shadow-[0_1px_30px_rgba(255,120,25,0.12)] md:rounded" ref={formRef}>

        <BunqContractHeader productTitle="${productTitle}" />

        <div className="${bodyClass}">

        <BunqContractIntro title="${introTitle}">
            ${introParas}
        </BunqContractIntro>

        `;

  s = s.slice(0, start) + mid + s.slice(section1);
  fs.writeFileSync(file, s);
  console.log('header swapped', rel);
}

swapHeader('src/pages/BunqContractForm.js', 'Flexgeldanlage', 'Flexgeldvertrag', 'contract-form-body px-6 md:px-10 py-8');
swapHeader('src/pages/bunq/BunqFestgeldVertrag.js', 'Festgeldanlage', 'Festgeldvertrag', 'px-6 md:px-10 py-8');
