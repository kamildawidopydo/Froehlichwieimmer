import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import { useDashboardMotion } from '@/components/dashboard/motion/dashboardMotion';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CHART_COLORS } from '@/components/dashboard/charts/chartTheme';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';

/**
 * HeroBanner — editorial dashboard intro.
 *
 * Surface:
 *   - Always-dark ink-navy with mesh-navy gradient + topo-pattern overlay.
 *   - Brass top + bottom hairlines for "private bank magazine" framing.
 *   - Tilted gold orb glow in the bottom right.
 *
 * Layout:
 *   - Left  : eyebrow date · Fraunces greeting · lede · actions slot.
 *   - Right : brass-bordered porcelain card with "Gesamtvermögen" → rate-figure value,
 *             delta pill, and a sparkline area chart with brass gradient.
 */
const HeroBanner = ({ title, subtitle, actions }) => {
  const { user } = useAuth();
  const { gesamtvermoegen, heroSnapshots } = useDashboardData();
  const { panel } = useDashboardMotion();

  const heroSparkData = React.useMemo(() => {
    const base = (heroSnapshots || []).map((s) => ({
      date: s.snapshot_date,
      total: Number(s.total_value || 0),
    }));
    if (base.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const last = base[base.length - 1];
      if (last.date !== today) base.push({ date: today, total: gesamtvermoegen });
      else base[base.length - 1] = { date: today, total: gesamtvermoegen };
    }
    return base;
  }, [heroSnapshots, gesamtvermoegen]);

  const heroFirst = heroSparkData[0];
  const heroLast = heroSparkData[heroSparkData.length - 1];
  const heroChangeAbs = heroFirst && heroLast ? heroLast.total - heroFirst.total : 0;
  const heroChangePct = heroFirst && heroFirst.total > 0 ? (heroChangeAbs / heroFirst.total) * 100 : 0;
  const heroUp = heroChangeAbs >= 0;

  const greetingName = (
    user?.first_name ||
    user?.last_name ||
    user?.email?.split('@')[0] ||
    'Kunde'
  ).split(' ')[0];

  const dateLabel = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.section
      className="relative isolate mb-8 overflow-hidden border border-bank-ink bg-bank-ink text-white"
      initial={panel.initial}
      animate={panel.animate}
      transition={panel.transition}
    >
      {/* Decorative layers */}
      <div aria-hidden className="absolute inset-0 bg-mesh-navy" />
      <div aria-hidden className="topo-pattern absolute inset-0 opacity-[0.07]" />
      <div aria-hidden className="grain absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full bg-bank-gold/10 blur-3xl"
      />
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bank-gold/35 to-transparent" />

      {/* Top mono ribbon */}
      <div aria-hidden className="relative flex items-center justify-between px-5 pt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/55 sm:px-8">
        <span>Kapitalmitte · Mein Vermögen</span>
        <span className="hidden sm:inline">{new Date().getFullYear()}</span>
      </div>

      <div className="relative grid grid-cols-1 items-end gap-8 px-5 pb-9 pt-7 sm:px-8 sm:pb-11 sm:pt-9 lg:grid-cols-[1fr_360px] lg:gap-12 lg:pb-14 lg:pt-10 lg:px-12">
        {/* Left: greeting */}
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">
            {dateLabel}
          </p>
          <h1
            className="mt-4 font-display text-[2.2rem] font-light leading-[1.04] tracking-[-0.02em] text-white sm:text-[2.6rem]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 80" }}
          >
            {title || (
              <>
                Guten Tag,<br />
                <span className="italic text-bank-gold-soft">{greetingName}.</span>
              </>
            )}
          </h1>
          <span aria-hidden className="mt-5 block h-px w-20 bg-bank-gold/65" />
          <p className="mt-5 max-w-xl text-[14px] leading-[1.7] text-white/70">
            {subtitle ||
              'Ein Überblick über Ihr Vermögen, Ihre Anlagen und aktuelle Marktbewegungen.'}
          </p>
          {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
        </div>

        {/* Right: Vermögen card */}
        <div className="relative w-full">
          <span aria-hidden className="absolute -inset-px border border-bank-gold/35" />
          <div className="relative border border-bank-gold/35 bg-white/[0.04] p-6 backdrop-blur-md">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-bank-gold/55" />
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-bank-gold">
                Gesamtvermögen
              </p>
              {heroSparkData.length > 1 && (
                <span
                  className={`inline-flex items-center gap-0.5 border px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums ${
                    heroUp
                      ? 'border-emerald-300/55 bg-emerald-300/10 text-emerald-200'
                      : 'border-rose-300/55 bg-rose-300/10 text-rose-200'
                  }`}
                >
                  {heroUp ? <ArrowUpRight size={10} strokeWidth={1.32} /> : <ArrowDownRight size={10} strokeWidth={1.32} />}
                  {heroUp ? '+' : ''}
                  {heroChangePct.toFixed(2)}%
                </span>
              )}
            </div>
            <p
              className="rate-figure mt-3 text-[2.4rem] leading-[1.04] tabular-nums text-white sm:text-[2.7rem]"
              data-numeric
            >
              <AnimatedNumber value={gesamtvermoegen} format={formatEUR} />
            </p>
            {heroSparkData.length > 1 ? (
              <>
                <p className={`mt-1 font-mono text-[11px] tabular-nums ${heroUp ? 'text-emerald-200/85' : 'text-rose-200/85'}`}>
                  {heroUp ? '+' : ''}
                  {formatEUR(heroChangeAbs)} <span className="text-white/45">· 30 Tage</span>
                </p>
                <div className="-mx-2 mt-4 h-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={heroSparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                      <defs>
                        <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.55} />
                          <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke={CHART_COLORS.gold}
                        strokeOpacity={0.85}
                        strokeWidth={1.32}
                        fill="url(#heroSparkGrad)"
                        dot={false}
                        isAnimationActive
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="mt-3 text-[11.5px] leading-snug text-white/55">
                Historie erscheint nach dem ersten Snapshot.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default HeroBanner;
