import React, { useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { Loader2, MapPin, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { JobRow } from '@/components/careers/JobCard';
import JobsPerspectives from '@/components/careers/JobsPerspectives';
import { LEVEL_LABEL } from '@/lib/careersContent';
import useJobs from './useJobs';

const EMPTY = { q: '', location: '', employment_type: '', level: '', area: '', sort: 'newest' };

const Group = ({ title, options, value, onPick, testid }) => options.length === 0 ? null : (
  <fieldset className="border-b border-black/5 py-5 last:border-0" data-testid={testid}>
    <legend className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#686A64]">{title}</legend>
    <div className="space-y-1">
      {[['', 'Alle'], ...options].map(([v, l]) => (
        <button key={v || 'all'} type="button" onClick={() => onPick(v)} data-testid={`${testid}-${v || 'all'}`}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors ${value === v ? 'bg-[#36A852]/10 font-semibold text-[#1E222C]' : 'text-[#444] hover:bg-black/[0.03]'}`}>
          <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${value === v ? 'border-[#36A852]' : 'border-black/20'}`}>
            {value === v && <span className="h-2 w-2 rounded-full bg-[#36A852]" />}
          </span>{l}
        </button>
      ))}
    </div>
  </fieldset>
);

export default function CareerJobs() {
  const { status } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const initial = Object.fromEntries(Object.keys(EMPTY).filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
  const { filters, setFilters, data, loading, search } = useJobs(status.is_staff, initial);

  const apply = (f) => {
    setFilters(f);
    setParams(Object.fromEntries(Object.entries(f).filter(([k, v]) => v && !(k === 'sort' && v === 'newest'))), { replace: true });
    search(f);
  };
  const pick = (k) => (v) => apply({ ...filters, [k]: v });
  const activeCount = ['location', 'employment_type', 'level', 'area'].filter((k) => filters[k]).length;
  const noJobs = !loading && data.items.length === 0 && (data.published_total === 0 || (activeCount === 0 && !filters.q));

  const filterPanel = (
    <>
      <Group title="Arbeitsort" options={data.locations.map((l) => [l, l])} value={filters.location} onPick={pick('location')} testid="filter-location" />
      <Group title="Tätigkeitsbereich" options={data.areas.map((a) => [a, a])} value={filters.area} onPick={pick('area')} testid="filter-area" />
      <Group title="Beschäftigungsart" options={data.employment_types.map((t) => [t, t])} value={filters.employment_type} onPick={pick('employment_type')} testid="filter-type" />
      <Group title="Karrierelevel" options={Object.entries(LEVEL_LABEL)} value={filters.level} onPick={pick('level')} testid="filter-level" />
    </>
  );

  return (
    <>
      <PageMeta title="Stellenangebote | Karriere bei der Fröhlich Vermögensberatung GmbH" description="Alle offenen Stellen der Fröhlich Vermögensberatung GmbH – filtern nach Karrierelevel, Beschäftigungsart und Standort." path="/karriere/stellen" />
      <section className="relative isolate overflow-hidden bg-[#1E222C] pb-28 pt-14">
        <img src="/assets/careers/office.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7BD58F]">Jobbörse</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Stellenangebote</h1>
          <p className="mt-3 max-w-xl text-white/75">Finden Sie die Position, die zu Ihnen passt – vom Einstieg bis zur Führungsaufgabe.</p>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-5 lg:px-8">
        <form onSubmit={(e) => { e.preventDefault(); apply(filters); }} role="search"
          className="flex flex-wrap gap-2 rounded-2xl bg-white p-2.5 shadow-[0_30px_60px_-30px_rgba(30,34,44,0.5)] sm:flex-nowrap" data-testid="job-search-form">
          <label className="flex basis-full items-center gap-3 rounded-xl bg-[#F7F5F0] px-4 sm:flex-1 sm:basis-auto">
            <Search size={18} className="shrink-0 text-[#36A852]" />
            <input className="w-full bg-transparent py-3.5 text-[15px] outline-none" placeholder="Jobtitel oder Stichwort" aria-label="Jobtitel oder Stichwort"
              value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} data-testid="job-search-q" />
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#F7F5F0] px-4 sm:w-60 sm:flex-none">
            <MapPin size={18} className="shrink-0 text-[#36A852]" />
            <select className="w-full cursor-pointer bg-transparent py-3.5 text-[15px] outline-none" aria-label="Arbeitsort" value={filters.location}
              onChange={(e) => apply({ ...filters, location: e.target.value })} data-testid="job-search-location">
              <option value="">Alle Arbeitsorte</option>
              {data.locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <button type="submit" className="rounded-xl bg-[#36A852] px-5 text-[15px] font-semibold text-white hover:bg-[#2E9446] sm:px-7" data-testid="job-search-submit">
            <span className="hidden sm:inline">Stellenangebote finden</span><Search size={18} className="sm:hidden" />
          </button>
        </form>
      </div>
      {noJobs ? (
        <JobsPerspectives locations={data.locations} selected={filters.location} onPickLocation={(l) => apply({ ...filters, location: l })} />
      ) : (
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-black/5 bg-white px-4" data-testid="job-filter-sidebar">{filterPanel}</div>
        </aside>
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-medium" data-testid="job-results-count">{loading ? 'Suche läuft…' : `${data.items.length} ${data.items.length === 1 ? 'Stelle' : 'Stellen'} gefunden`}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowFilters(true)} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 bg-white px-4 py-2 text-sm lg:hidden" data-testid="job-filter-open">
                <SlidersHorizontal size={15} /> Filter{activeCount > 0 && ` (${activeCount})`}
              </button>
              {(activeCount > 0 || filters.q) && <button type="button" onClick={() => apply(EMPTY)} className="text-sm font-medium text-[#36A852]" data-testid="job-filter-reset">Zurücksetzen</button>}
              <select value={filters.sort} onChange={(e) => apply({ ...filters, sort: e.target.value })} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm" data-testid="job-sort-select" aria-label="Sortierung">
                <option value="newest">Neueste zuerst</option>
                <option value="title">Alphabetisch</option>
              </select>
            </div>
          </div>
          {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#36A852]" /></div>
            : data.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center" data-testid="job-results-empty">
                <SearchX className="mx-auto text-[#36A852]" />
                <p className="mt-3 text-[#555]">Keine passenden Stellen gefunden.</p>
                <button type="button" onClick={() => apply(EMPTY)} className="mt-5 inline-block rounded-full bg-[#36A852] px-6 py-3 text-sm font-semibold text-white" data-testid="job-empty-reset">Filter zurücksetzen</button>
              </div>
            ) : <div className="space-y-3">{data.items.map((j, i) => <JobRow key={j.id} job={j} index={i} />)}</div>}
        </div>
      </section>
      )}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" onClick={() => setShowFilters(false)}>
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-6 pt-4" onClick={(e) => e.stopPropagation()} data-testid="job-filter-sheet">
            <div className="flex items-center justify-between"><p className="text-lg font-semibold">Filter</p><button type="button" onClick={() => setShowFilters(false)} aria-label="Schließen"><X /></button></div>
            {filterPanel}
            <button type="button" onClick={() => setShowFilters(false)} className="mt-2 w-full rounded-full bg-[#36A852] py-3.5 font-semibold text-white" data-testid="job-filter-apply">{data.items.length} Stellen anzeigen</button>
          </div>
        </div>
      )}
    </>
  );
}
