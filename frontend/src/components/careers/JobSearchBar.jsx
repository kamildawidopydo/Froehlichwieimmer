import React from 'react';
import { Search, MapPin, Briefcase, Layers } from 'lucide-react';

const Field = ({ icon: Icon, label, children }) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl bg-[#F7F5F0] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#36A852]/40">
    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#686A64]"><Icon size={12} />{label}</span>
    {children}
  </label>
);

const selCls = 'w-full bg-transparent text-[15px] text-[#1E222C] outline-none';

export default function JobSearchBar({ value, onChange, onSubmit, locations = [], types = [], areas = [], compact = false }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className={`grid gap-2.5 rounded-2xl bg-white p-3 shadow-[0_30px_60px_-30px_rgba(30,34,44,0.45)] ${compact ? 'lg:grid-cols-[2fr_1fr_1fr_1fr_auto]' : 'md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]'}`}
      data-testid="job-search-form" role="search"
    >
      <Field icon={Search} label="Jobtitel oder Stichwort">
        <input className={selCls} placeholder="z. B. Finanzberater" value={value.q} onChange={set('q')} data-testid="job-search-q" />
      </Field>
      <Field icon={MapPin} label="Arbeitsort">
        <select className={selCls} value={value.location} onChange={set('location')} data-testid="job-search-location">
          <option value="">Alle Arbeitsorte</option>
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      <Field icon={Briefcase} label="Beschäftigungsart">
        <select className={selCls} value={value.employment_type} onChange={set('employment_type')} data-testid="job-search-type">
          <option value="">Alle</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field icon={Layers} label="Tätigkeitsbereich">
        <select className={selCls} value={value.area} onChange={set('area')} data-testid="job-search-area">
          <option value="">Alle Bereiche</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </Field>
      <button type="submit" data-testid="job-search-submit"
        className="rounded-xl bg-[#36A852] px-6 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#2E9446] md:col-span-2 lg:col-span-1">
        Stellenangebote finden
      </button>
    </form>
  );
}
