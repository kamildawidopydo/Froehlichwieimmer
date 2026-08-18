import React from 'react';

/**
 * Three fresh brand-mark proposals for "Kapital Direkt24" — Kapitalmitte-style
 * lockup (round emblem + wordmark, small date/tagline above). Each variant uses
 * an original geometric mark and its own colourway. Route: /logo-preview.
 */

// ---------------------------------------------------------------------------
// Variant 01 — Klassik Marine  ·  deep navy circle, ascending K-arc, ivory dot
// ---------------------------------------------------------------------------
function MarkKlassikMarine({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#0B3A7A" />
      {/* subtle inner ring */}
      <circle cx="60" cy="60" r="49" stroke="#F6F7FB" strokeOpacity="0.15" strokeWidth="1" />
      {/* Stylised "K" — vertical stroke + rising diagonal */}
      <rect x="40" y="34" width="6" height="52" rx="2" fill="#F6F7FB" />
      <path
        d="M46 60 L80 34"
        stroke="#F6F7FB"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M46 60 L82 88"
        stroke="#7EB6FF"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* accent dot signalling growth endpoint */}
      <circle cx="82" cy="88" r="4" fill="#7EB6FF" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant 02 — Navy Gold  ·  editorial navy circle with gold hairline monogram
// ---------------------------------------------------------------------------
function MarkNavyGold({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#0F2246" />
      <circle cx="60" cy="60" r="46" stroke="#C79A2E" strokeWidth="1.2" fill="none" />
      {/* d24 hint: upright bar, half-circle, and small "24" hairline */}
      <rect x="42" y="38" width="4" height="44" rx="1.5" fill="#C79A2E" />
      <path
        d="M46 44 Q70 44 70 60 Q70 76 46 76"
        stroke="#C79A2E"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <text
        x="80"
        y="80"
        fontFamily="'Inter', system-ui, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill="#F0C86A"
        letterSpacing="0.5"
      >
        24
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Variant 03 — Sky Modern  ·  bright sky circle with clean geometric growth
// ---------------------------------------------------------------------------
function MarkSkyModern({ size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2878B4" />
          <stop offset="1" stopColor="#1E5FA0" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#skyGrad)" />
      {/* three ascending bars, ivory, right-aligned */}
      <rect x="42" y="66" width="8" height="20" rx="2" fill="#F6F7FB" />
      <rect x="56" y="54" width="8" height="32" rx="2" fill="#F6F7FB" />
      <rect x="70" y="40" width="8" height="46" rx="2" fill="#F6F7FB" />
      {/* trend line */}
      <path
        d="M40 74 L54 60 L68 50 L82 34"
        stroke="#7EE8DE"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="82" cy="34" r="4" fill="#7EE8DE" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Lockup (mark + wordmark side by side, Kapitalmitte-style)
// ---------------------------------------------------------------------------
function Lockup({ Mark, brand, tone = 'light' }) {
  const bg = tone === 'dark' ? '#0F1420' : '#FFFFFF';
  const text = tone === 'dark' ? '#F6F7FB' : '#0F1420';
  const muted = tone === 'dark' ? '#9CA3AF' : '#5B6172';
  return (
    <div
      className="flex items-center gap-8 rounded-3xl border px-10 py-12"
      style={{ background: bg, borderColor: tone === 'dark' ? '#1F2937' : '#E5E7EB' }}
    >
      <Mark size={140} />
      <div className="flex flex-col leading-none">
        <span
          style={{
            color: muted,
            fontFamily: '"Inter", "Helvetica Neue", system-ui, sans-serif',
            fontSize: 13,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          — 24 —
        </span>
        <span
          style={{
            color: text,
            fontFamily: '"Inter", "Helvetica Neue", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 46,
            letterSpacing: '-0.015em',
          }}
        >
          Kapital<span style={{ color: brand, fontWeight: 800 }}>Direkt</span>
          <span style={{ color: text, fontWeight: 500 }}>24</span>
        </span>
        <span
          style={{
            color: muted,
            fontSize: 14,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            marginTop: 12,
          }}
        >
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
    accent: '#7EB6FF',
    Mark: MarkKlassikMarine,
    story:
      'Kreis in tiefem Marineblau, stilisiertes "K" mit aufsteigender Diagonale. Nächster Verwandter zum Kapitalmitte-Look — seriös, klassisch, Bank.',
  },
  {
    id: 'navy-gold',
    name: 'Navy Gold',
    brand: '#0F2246',
    accent: '#C79A2E',
    Mark: MarkNavyGold,
    story:
      'Dunkles Marine mit dünnem Goldring und feiner "d24"-Monogramm-Andeutung. Editorial, Premium, Vermögensverwaltung.',
  },
  {
    id: 'sky-modern',
    name: 'Sky Modern',
    brand: '#2878B4',
    accent: '#7EE8DE',
    Mark: MarkSkyModern,
    story:
      'Helleres Blau mit sanftem Verlauf, drei aufsteigenden Balken und Mint-Trendlinie. Frisch, digital, näher an einer Neobank.',
  },
];

export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-[#F6F7FB] px-6 py-16" data-testid="logo-preview-page">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[#5B6172]">Internal · Brand Preview</p>
          <h1 className="text-3xl font-semibold text-[#0F1420] sm:text-4xl">
            Kapital Direkt24 — 3 Entwürfe im Kapitalmitte-Stil
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#5B6172]">
            Kreis-Emblem + Wordmark, kleine "— 24 —" Überzeile analog zu Kapitalmitte&apos;s
            "— 2006 —" Marker. Jede Variante mit hellem und dunklem Rendering.
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

              <div className="grid grid-cols-1 gap-4">
                <Lockup Mark={v.Mark} brand={v.brand} tone="light" />
                <Lockup Mark={v.Mark} brand={v.accent} tone="dark" />
              </div>
            </li>
          ))}
        </ol>

        <footer className="mt-10 rounded-2xl border border-dashed border-[#5B6172]/40 bg-white/60 p-6 text-sm text-[#5B6172]">
          <p>
            <strong className="text-[#0F1420]">So geht&apos;s weiter:</strong> Sag &laquo;Nr. X&raquo; im
            Chat, dann ersetze ich die aktuelle Marke im Header, Footer, Login-Screen, Social-Preview und
            PDFs durch die gewählte Variante und lege die passenden SVG/PNG in&nbsp;
            <code className="font-mono text-[11px]">public/assets/logo/</code> ab.
          </p>
        </footer>
      </div>
    </div>
  );
}
