/**
 * Recolor bunq pages: teal + pumpkin accent, light headers for rainbow logo.
 * node scripts/recolor-bunq-theme.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const FILES = [
  ...fs.readdirSync(path.join(root, 'src/pages/bunq')).filter((f) => f.endsWith('.js')).map((f) => `src/pages/bunq/${f}`),
  'src/pages/BunqContractForm.js',
];

const REPLACEMENTS = [
  [
    'flex items-center gap-5 bg-[#0B4F6C] px-8 py-6',
    'flex items-center gap-5 border-b-4 border-[#FF7819] bg-white px-8 py-6',
  ],
  [
    'text-lg font-medium tracking-[0.02em] text-white',
    'text-lg font-medium tracking-[0.02em] text-[#0B4F6C]',
  ],
  [
    'text-[11px] tracking-wide text-white/50',
    'text-[11px] tracking-wide text-[#0B4F6C]/60',
  ],
  ['h-8 w-px bg-white/20', 'h-8 w-px bg-[#0B4F6C]/15'],
  ['bg-[#0B4F6C]/[0.07]', 'bg-[#FF7819]/12'],
  ['border-[#0B4F6C]/15', 'border-[#FF7819]/35'],
  ['hover:border-[#0B4F6C]/30', 'hover:border-[#FF7819]/55'],
  ['group-hover:text-[#0B4F6C]', 'group-hover:text-[#FF7819]'],
  [
    'bg-[#0B4F6C] text-white px-6 md:px-10 py-6 md:rounded-t relative overflow-hidden',
    'bg-white text-[#0B4F6C] px-6 md:px-10 py-6 md:rounded-t relative overflow-hidden border-t-[6px] border-t-[#FF7819] border-b border-[#FF7819]/25',
  ],
  ['bg-[#0B4F6C] px-8 py-6 md:px-10', 'border-b-4 border-[#FF7819] bg-white px-8 py-6 md:px-10'],
  ['bg-[#0B4F6C] px-8 py-6', 'border-b-4 border-[#FF7819] bg-white px-8 py-6'],
  ['h-6 w-px bg-white/20', 'h-6 w-px bg-[#0B4F6C]/15'],
  ['text-white/50 text-[10px] tracking-[0.2em] uppercase', 'text-[#0B4F6C]/50 text-[10px] tracking-[0.2em] uppercase'],
  ['text-white text-xl font-medium tracking-[0.01em]', 'text-[#0B4F6C] text-xl font-medium tracking-[0.01em]'],
  ['text-white/60 text-xs mt-1', 'text-[#0B4F6C]/60 text-xs mt-1'],
  ['>Deutschland</p>', '>Niederlande</p>'],
  ['bg-bank-ink hover:bg-bank-ink-hover text-white', 'bg-[#FF7819] hover:bg-[#E56A12] text-white'],
  [
    'bg-bank-ink hover:bg-bank-ink-hover flex items-center gap-2 text-white',
    'bg-[#FF7819] hover:bg-[#E56A12] flex items-center gap-2 text-white',
  ],
  ['w-7 h-7 bg-[#0B4F6C] text-white rounded', 'w-7 h-7 bg-[#FF7819] text-white rounded'],
  ['alt="bunq" className="h-6 w-auto object-contain"', 'alt="bunq" className="h-8 w-auto object-contain"'],
  ['alt="bunq" className="h-7 w-auto object-contain"', 'alt="bunq" className="h-9 w-auto object-contain"'],
  ['alt="bunq" className="h-8 w-auto object-contain shrink-0"', 'alt="bunq" className="h-10 w-auto object-contain shrink-0"'],
];

for (const rel of FILES) {
  const filePath = path.join(root, rel);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(filePath, content);
  console.log('updated', rel);
}

console.log('done');
