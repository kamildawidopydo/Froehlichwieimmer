import React from 'react';
import {
  Cpu, Network, Shield, Zap, Gem, Layers, HeartPulse, Droplets, Cloud, Circle,
} from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';

const ICON_MAP = { cpu: Cpu, network: Network, shield: Shield, zap: Zap, gem: Gem, layers: Layers, 'heart-pulse': HeartPulse, droplets: Droplets, cloud: Cloud };

const TrendCard = ({ trend, index }) => {
  const Icon = ICON_MAP[trend.icon] || Circle;
  const num = String(index + 1).padStart(2, '0');
  return (
    <div className="group relative flex flex-col gap-4 border border-bank-border bg-white p-6 transition-colors hover:border-bank-accent-strong/50"
         data-testid="anlagetrend-card">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[12px] tracking-[0.18em] text-bank-accent-strong">{num}</span>
        <Icon className="h-5 w-5 text-bank-text-muted transition-colors group-hover:text-bank-accent-strong" strokeWidth={1.4} />
      </div>
      <h3 className="font-serif text-lg leading-snug text-bank-text">{trend.title}</h3>
      <p className="text-[13.5px] leading-relaxed text-bank-text-muted">{trend.summary}</p>
      <p className="text-[12.5px] leading-relaxed text-bank-text">{trend.detail}</p>
      <div className="mt-auto flex items-center gap-2 border-t border-bank-border pt-3 text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-accent-strong">
        <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-accent-strong" />
        {trend.tag}
      </div>
    </div>
  );
};

const Anlagetrends = ({ trends = [], loading }) => (
  <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="anlagetrends">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3">
        <Eyebrow>Beobachten</Eyebrow>
        <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Anlagetrends</h2>
        <p className="max-w-2xl text-[14px] leading-relaxed text-bank-text-muted">
          Langfristige Investmentthemen, die aktuell wirtschaftlich besonders relevant sind. Beobachten,
          nicht als Kaufempfehlung.
        </p>
      </div>
    </div>

    {loading ? (
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (<div key={i} className="h-[240px] animate-pulse bg-neutral-100" />))}
      </div>
    ) : (
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trends.map((t, i) => (<TrendCard key={t.id} trend={t} index={i} />))}
      </div>
    )}
  </section>
);

export default Anlagetrends;
