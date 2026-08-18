import React from 'react';

/**
 * Five original brand-mark proposals for "Kapital Direkt24".
 * Each variant renders its own inline SVG emblem + wordmark, sized consistently.
 * This route is for internal review only — pick a favourite before we replace
 * the current site-wide BrandLogo asset.
 */

const wordmark = (color, tone = 'dark') => ({
  color: tone === 'light' ? '#F6F7FB' : color,
  brand: color,
});

// ---------------------------------------------------------------------------
// Variant 01 — Klassik Marine (Chart-Balken im Kreis)
// ---------------------------------------------------------------------------
function MarkKlassik({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#0B3A7A" />
      <circle cx="32" cy="32" r="30" stroke="#0B3A7A" strokeWidth="2" />
      <rect x="18" y="34" width="5" height="14" rx="1.2" fill="#F6F7FB" />
      <rect x="26" y="28" width="5" height="20" rx="1.2" fill="#F6F7FB" />
      <rect x="34" y="22" width="5" height="26" rx="1.2" fill="#F6F7FB" />
      <rect x="42" y="16" width="5" height="32" rx="1.2" fill="#4FB0FF" />
      <path d="M18 20 L28 24 L38 18 L48 12" stroke="#4FB0FF" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="48" cy="12" r="1.8" fill="#4FB0FF" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant 02 — Kompass Gold (Navy + Goldakzent, Kompass-Pfeil)
// ---------------------------------------------------------------------------
function MarkKompass({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M32 3 L57 17 V47 L32 61 L7 47 V17 Z"
        fill="#0F2246"
        stroke="#0F2246"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="18" stroke="#C79A2E" strokeWidth="1.4" fill="none" />
      <path d="M32 15 L37 32 L32 49 L27 32 Z" fill="#C79A2E" />
      <path d="M32 15 L37 32 L32 32 Z" fill="#F0C86A" />
      <circle cx="32" cy="32" r="2.2" fill="#F6F7FB" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant 03 — Ozean Teal (Wellen)
// ---------------------------------------------------------------------------
function MarkOzean({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#0E7C86" />
      <path d="M8 26 Q20 18 32 26 T56 26" stroke="#7EE8DE" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M8 36 Q20 28 32 36 T56 36" stroke="#F6F7FB" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M8 46 Q20 38 32 46 T56 46" stroke="#7EE8DE" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="20" r="3" fill="#F6F7FB" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant 04 — Wachstum Emerald (Sprossen / Blattmarke)
// ---------------------------------------------------------------------------
function MarkWachstum({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#F3F1E7" />
      <path
        d="M32 52 C 24 44 20 34 22 22 C 30 24 38 28 42 34 C 40 42 36 48 32 52 Z"
        fill="#0F8A5F"
      />
      <path
        d="M32 52 C 40 44 44 34 42 22 C 34 24 26 28 22 34 C 24 42 28 48 32 52 Z"
        fill="#12A570"
        opacity="0.85"
      />
      <path d="M32 52 V26" stroke="#F3F1E7" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32" cy="20" r="2.4" fill="#C79A2E" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant 05 — Puls Coral (24-Punkte-Ring, Pulslinie)
// ---------------------------------------------------------------------------
function MarkPuls({ size = 56 }) {
  const dots = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const r = 26;
    return { x: 32 + Math.cos(a) * r, y: 32 + Math.sin(a) * r, i };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#1B1F2A" />
      {dots.map((d) => (
        <circle
          key={d.i}
          cx={d.x}
          cy={d.y}
          r={d.i % 6 === 0 ? 1.8 : 1.1}
          fill={d.i % 6 === 0 ? '#EF6B4A' : '#8A8FA0'}
        />
      ))}
      <path
        d="M12 32 H22 L26 24 L32 40 L38 26 L42 32 H52"
        stroke="#EF6B4A"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Lockup (mark + wordmark side by side)
// ---------------------------------------------------------------------------
function Lockup({ Mark, brand, tone = 'light' }) {
  const bg = tone === 'dark' ? '#0F1420' : '#FFFFFF';
  const text = tone === 'dark' ? '#F6F7FB' : '#0F1420';
  const muted = tone === 'dark' ? '#9CA3AF' : '#5B6172';
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border px-6 py-5"
      style={{ background: bg, borderColor: tone === 'dark' ? '#1F2937' : '#E5E7EB' }}
    >
      <Mark size={56} />
      <div className="flex flex-col leading-tight">
        <span
          style={{
            color: text,
            fontFamily: '"Inter", "Helvetica Neue", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: '-0.01em',
          }}
        >
          Kapital <span style={{ color: brand, fontWeight: 800 }}>Direkt</span>
          <span style={{ color: text, fontWeight: 500 }}>24</span>
        </span>
        <span style={{ color: muted, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Investieren · direkt
        </span>
      </div>
    </div>
  );
}

const variants = [
  {
    id: 'klassik-marine',
    name: 'Klassik Marine',
    brand: '#0B3A7A',
    accent: '#4FB0FF',
    Mark: MarkKlassik,
    story: 'Kreis-Emblem mit aufsteigenden Balken und Trendlinie. Konservativ, seriös, Bank-Vibe.',
  },
  {
    id: 'kompass-gold',
    name: 'Kompass Gold',
    brand: '#0F2246',
    accent: '#C79A2E',
    Mark: MarkKompass,
    story: 'Achteckiges Schild mit Kompass. Signalisiert Orientierung, Premium, Vermögensverwaltung.',
  },
  {
    id: 'ozean-teal',
    name: 'Ozean Teal',
    brand: '#0E7C86',
    accent: '#7EE8DE',
    Mark: MarkOzean,
    story: 'Wellen im Rounded-Square. Modern, ruhig, fintech-lastig, hebt sich von klassischen Banken ab.',
  },
  {
    id: 'wachstum-emerald',
    name: 'Wachstum Emerald',
    brand: '#0F8A5F',
    accent: '#C79A2E',
    Mark: MarkWachstum,
    story: 'Organische Blatt-Silhouette auf Elfenbein. Nachhaltigkeit, langfristiges Wachstum.',
  },
  {
    id: 'puls-coral',
    name: 'Puls Coral',
    brand: '#EF6B4A',
    accent: '#F6F7FB',
    Mark: MarkPuls,
    story: '24-Punkte-Ring (steht für "24") + EKG-Pulslinie. Dynamisch, mutig, digital-first.',
  },
];

export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-[#F6F7FB] px-6 py-16" data-testid="logo-preview-page">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[#5B6172]">Internal · Brand Preview</p>
          <h1 className="text-3xl font-semibold text-[#0F1420] sm:text-4xl">
            Kapital Direkt24 — Logo-Entwürfe
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#5B6172]">
            Fünf frische Vorschläge — Symbol + Wordmark, jeweils auf hell und dunkel. Sag welche Nummer du
            möchtest, dann wird sie site-weit ausgerollt.
          </p>
        </header>

        <ol className="grid grid-cols-1 gap-6">
          {variants.map((v, idx) => (
            <li
              key={v.id}
              data-testid={`logo-variant-${v.id}`}
              className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="rounded-full bg-[#0F1420] px-3 py-1 text-xs font-semibold text-white">
                    Nr. {idx + 1}
                  </span>
                  <h2 className="text-xl font-semibold text-[#0F1420]">{v.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    aria-label="brand color"
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: v.brand }}
                    title={v.brand}
                  />
                  <span
                    aria-label="accent color"
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: v.accent }}
                    title={v.accent}
                  />
                  <code className="ml-2 font-mono text-[11px] text-[#5B6172]">
                    {v.brand} · {v.accent}
                  </code>
                </div>
              </div>

              <p className="mb-5 text-sm text-[#5B6172]">{v.story}</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Lockup Mark={v.Mark} brand={v.brand} tone="light" />
                <Lockup Mark={v.Mark} brand={v.accent} tone="dark" />
              </div>
            </li>
          ))}
        </ol>

        <footer className="mt-10 rounded-2xl border border-dashed border-[#5B6172]/40 bg-white/60 p-6 text-sm text-[#5B6172]">
          <p>
            <strong className="text-[#0F1420]">So geht&apos;s weiter:</strong> Sag &laquo;Nr. X&raquo; im
            Chat, dann ersetze ich die aktuelle Marke im Header, Footer, Login-Screen, PDFs und Social-Preview
            durch die gewählte Variante und lade PNG/SVG-Varianten für dark/light in&nbsp;
            <code className="font-mono text-[11px]">public/assets/logo/</code>.
          </p>
        </footer>
      </div>
    </div>
  );
}
