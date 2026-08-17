/**
 * Recolor Postbank pages: yellow-dominant palette + official logo.
 * node scripts/recolor-postbank-theme.mjs
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const FILES = [
  ...fs.readdirSync(path.join(root, 'src/pages/postbank')).filter((f) => f.endsWith('.js')).map((f) => `src/pages/postbank/${f}`),
  'src/pages/PostbankContractForm.js',
];

const REPLACEMENTS = [
  ['postbank-wordmark-yellow.svg', 'postbank.svg'],
  ['bg-[#f5f5f0]', 'bg-[#FFFBF0]'],
  ['bg-[#003366] text-white px-6 md:px-10 py-6 md:rounded-t', 'bg-[#FFCC00] text-[#003366] px-6 md:px-10 py-6 md:rounded-t border-b border-[#E6B800]'],
  ['bg-[#003366] px-8 py-6 md:px-10', 'bg-[#FFCC00] px-8 py-6 md:px-10 border-b border-[#E6B800]'],
  ['bg-[#003366] px-8 py-6', 'bg-[#FFCC00] px-8 py-6 border-b border-[#E6B800]'],
  ['w-7 h-7 bg-[#003366] text-white rounded', 'w-7 h-7 bg-[#FFCC00] text-[#003366] border border-[#E6B800] rounded'],
  ['bg-[#003366]/[0.07]', 'bg-[#FFCC00]/30'],
  ['border-[#003366]/15', 'border-[#FFCC00]/55'],
  ['border-[#003366]/20', 'border-[#FFCC00]/45'],
  ['hover:border-[#003366]/30', 'hover:border-[#FFCC00]/75'],
  ['hover:bg-[#003366]/[0.04]', 'hover:bg-[#FFCC00]/20'],
  ['#0078d4', '#FFCC00'],
  ['#4da3e8', '#E6B800'],
  ['#e8eef5', '#FFF4CC'],
  ['#eef2f7', '#FFF9E6'],
  ['rgba(26,58,107,0.10)', 'rgba(255,204,0,0.18)'],
  ['header.bg-\\[\\#003366\\]', 'header.bg-\\[\\#FFCC00\\]'],
  ['.md\\\\:px-10, header.bg-\\\\[\\\\#003366\\\\]', '.md\\\\:px-10, header.bg-\\\\[\\\\#FFCC00\\\\]'],
  // header text on yellow
  ['text-white/60 text-xs mt-1', 'text-[#003366]/65 text-xs mt-1'],
  ['text-white/50 text-[10px] tracking-[0.2em] uppercase', 'text-[#003366]/55 text-[10px] tracking-[0.2em] uppercase'],
  ['text-white text-xl font-medium tracking-[0.01em]', 'text-[#003366] text-xl font-medium tracking-[0.01em]'],
  ['text-lg font-medium tracking-[0.02em] text-white', 'text-lg font-medium tracking-[0.02em] text-[#003366]'],
  ['text-[11px] tracking-wide text-white/50', 'text-[11px] tracking-wide text-[#003366]/60'],
  ['text-[11px] font-semibold text-white tracking-wider', 'text-[11px] font-semibold text-[#003366] tracking-wider'],
  ['text-[11px] text-white/70 tracking-wider mt-0.5', 'text-[11px] text-[#003366]/75 tracking-wider mt-0.5'],
  ['text-[10px] text-white/50 mt-1.5 tracking-wide', 'text-[10px] text-[#003366]/60 mt-1.5 tracking-wide'],
  ['text-[9px] text-white/50 uppercase tracking-[0.15em]', 'text-[9px] text-[#003366]/55 uppercase tracking-[0.15em]'],
  ['text-[8px] text-white/40 mt-1', 'text-[8px] text-[#003366]/50 mt-1'],
  ['border-b border-white/25 pb-1 text-sm font-semibold text-white/50', 'border-b border-[#003366]/25 pb-1 text-sm font-semibold text-[#003366]/55'],
  ['border-b border-white/25 pb-1 text-sm font-semibold text-white', 'border-b border-[#003366]/25 pb-1 text-sm font-semibold text-[#003366]'],
  ['h-8 w-px bg-white/20', 'h-8 w-px bg-[#003366]/20'],
  ['h-6 w-px bg-white/20', 'h-6 w-px bg-[#003366]/20'],
  ['w-px self-center h-8 bg-white/30 shrink-0', 'w-px self-center h-8 bg-[#003366]/25 shrink-0'],
  ['bg-bank-ink hover:bg-bank-ink-hover text-white', 'bg-[#FFCC00] hover:bg-[#E6B800] text-[#003366] border border-[#E6B800]'],
  ['bg-bank-ink hover:bg-bank-ink-hover flex items-center gap-2 text-white', 'bg-[#FFCC00] hover:bg-[#E6B800] flex items-center gap-2 text-[#003366] border border-[#E6B800]'],
  // header pattern overlay — navy dots on yellow
  ["fill='%23ffffff'", "fill='%23003366'"],
  ['opacity-[0.07]', 'opacity-[0.06]'],
  // accent underline under contract title
  ['w-16 h-[3px] bg-[#FFCC00] rounded-full mb-5', 'w-16 h-[3px] bg-[#003366] rounded-full mb-5'],
  ['h-[3px] bg-gradient-to-r from-[#FFCC00] via-[#E6B800] to-transparent mt-5 rounded-full', 'h-[3px] bg-gradient-to-r from-[#003366] via-[#003366]/40 to-transparent mt-5 rounded-full'],
  // larger logo in headers
  ['alt="Postbank" className="h-6 w-auto object-contain"', 'alt="Postbank" className="h-7 w-auto object-contain"'],
  ['alt="Postbank" className="h-7 w-auto object-contain"', 'alt="Postbank" className="h-8 w-auto object-contain"'],
  ['alt="Postbank" className="h-8 w-auto object-contain shrink-0"', 'alt="Postbank" className="h-9 w-auto object-contain shrink-0"'],
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
