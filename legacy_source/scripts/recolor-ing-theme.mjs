/**
 * Recolor ING pages: orange-accent light headers + real logo (distinct from BBVA navy).
 * node scripts/recolor-ing-theme.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const FILES = [
  ...fs.readdirSync(path.join(root, 'src/pages/ing')).filter((f) => f.endsWith('.js')).map((f) => `src/pages/ing/${f}`),
  'src/pages/IngContractForm.js',
];

const REPLACEMENTS = [
  // Docs hub: white header with orange left rail (not solid navy like BBVA)
  [
    'flex items-center gap-5 bg-[#003087] px-8 py-6',
    'flex items-center gap-5 border-b-4 border-[#FF6200] bg-white px-8 py-6',
  ],
  [
    'text-lg font-medium tracking-[0.02em] text-white',
    'text-lg font-medium tracking-[0.02em] text-[#003087]',
  ],
  [
    'text-[11px] tracking-wide text-white/50',
    'text-[11px] tracking-wide text-[#003087]/60',
  ],
  ['h-8 w-px bg-white/20', 'h-8 w-px bg-[#003087]/15'],
  ['bg-[#003087]/[0.07]', 'bg-[#FF6200]/12'],
  ['border-[#003087]/15', 'border-[#FF6200]/35'],
  ['hover:border-[#003087]/30', 'hover:border-[#FF6200]/55'],
  ['group-hover:text-[#003087]', 'group-hover:text-[#FF6200]'],
  // Contract form header — light panel + orange top bar (vs BBVA full navy)
  [
    'bg-[#003087] text-white px-6 md:px-10 py-6 md:rounded-t relative overflow-hidden',
    'bg-white text-[#003087] px-6 md:px-10 py-6 md:rounded-t relative overflow-hidden border-t-[6px] border-t-[#FF6200] border-b border-[#FF6200]/25',
  ],
  ["fill='%23ffffff'", "fill='%23FF6200'"],
  ['opacity-[0.07]', 'opacity-[0.05]'],
  ['bg-white/30', 'bg-[#003087]/20'],
  ['text-white tracking-wider', 'text-[#003087] tracking-wider'],
  ['text-white/70 tracking-wider', 'text-[#003087]/70 tracking-wider'],
  ['text-white/50 mt-1.5', 'text-[#003087]/55 mt-1.5'],
  ['text-white/50 uppercase', 'text-[#003087]/50 uppercase'],
  ['text-white/50">—', 'text-[#003087]/45">—'],
  ['text-white/40 mt-1', 'text-[#003087]/40 mt-1'],
  ['border-white/25', 'border-[#003087]/20'],
  ['text-sm font-semibold text-white"', 'text-sm font-semibold text-[#003087]"'],
  ['from-[#FF6200] via-[#FF8533]', 'from-[#FF6200] via-[#FF8533]'],
  // CTA buttons stay ING orange accent
  ['bg-bank-ink hover:bg-bank-ink-hover text-white', 'bg-[#FF6200] hover:bg-[#E55800] text-white'],
  [
    'bg-bank-ink hover:bg-bank-ink-hover flex items-center gap-2 text-white',
    'bg-[#FF6200] hover:bg-[#E55800] flex items-center gap-2 text-white',
  ],
  ['w-7 h-7 bg-[#003087] text-white rounded', 'w-7 h-7 bg-[#FF6200] text-white rounded'],
  // Larger real logo
  ['alt="ING" className="h-6 w-auto object-contain"', 'alt="ING" className="h-8 w-auto object-contain"'],
  ['alt="ING" className="h-7 w-auto object-contain"', 'alt="ING" className="h-9 w-auto object-contain"'],
  ['alt="ING" className="h-8 w-auto object-contain shrink-0"', 'alt="ING" className="h-10 w-auto object-contain shrink-0"'],
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
