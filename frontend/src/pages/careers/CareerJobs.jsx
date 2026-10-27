import React from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { Loader2, SearchX } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import JobSearchBar from '@/components/careers/JobSearchBar';
import JobCard from '@/components/careers/JobCard';
import useJobs from './useJobs';

export default function CareerJobs() {
  const { status } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const initial = Object.fromEntries(['q', 'location', 'employment_type', 'level', 'sort'].filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
  const { filters, setFilters, data, loading, search } = useJobs(status.is_staff, initial);

  const apply = (f = filters) => {
    setParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v)), { replace: true });
    search(f);
  };
  const reset = () => { const f = { q: '', location: '', employment_type: '', level: '', sort: 'newest' }; setFilters(f); apply(f); };

  return (
    <>
      <PageMeta title="Stellenangebote | Karriere bei Essence Invest" description="Alle offenen Stellen bei Essence Invest." path="/karriere/stellen" />
      <section className="bg-[#1E222C] pb-24 pt-14">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h1 className="font-display text-4xl text-white sm:text-5xl">Stellenangebote</h1>
          <p className="mt-3 text-white/70">Finde die Position, die zu dir passt.</p>
        </div>
      </section>
      <div className="mx-auto -mt-14 max-w-7xl px-5 lg:px-8">
        <JobSearchBar value={filters} onChange={setFilters} onSubmit={() => apply()} locations={data.locations} types={data.employment_types} compact />
      </div>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#555]" data-testid="job-results-count">{loading ? 'Suche läuft…' : `${data.items.length} ${data.items.length === 1 ? 'Stelle' : 'Stellen'} gefunden`}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={reset} className="text-sm font-medium text-[#36A852]" data-testid="job-filter-reset">Filter zurücksetzen</button>
            <select value={filters.sort} onChange={(e) => { const f = { ...filters, sort: e.target.value }; setFilters(f); apply(f); }}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm" data-testid="job-sort-select" aria-label="Sortierung">
              <option value="newest">Neueste zuerst</option>
              <option value="title">Alphabetisch</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#36A852]" /></div>
        ) : data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center" data-testid="job-results-empty">
            <SearchX className="mx-auto text-[#36A852]" />
            <p className="mt-3 text-[#555]">Keine passenden Stellen gefunden.</p>
            <Link to="/karriere/bewerben?initiativ=1" className="mt-5 inline-block rounded-full bg-[#36A852] px-6 py-3 text-sm font-semibold text-white">Initiativ bewerben</Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.items.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}</div>
        )}
      </section>
    </>
  );
}
