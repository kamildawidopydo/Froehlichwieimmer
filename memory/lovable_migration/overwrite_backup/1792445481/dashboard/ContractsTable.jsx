import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';

const ContractsTable = ({ columns = [], rows = [], emptyHint = 'Keine Daten.' }) => {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const tbodyRef = useAutoAnimateRef(Array.isArray(rows) && rows.length > 0);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = (row) =>
      typeof col.sortValue === 'function'
        ? col.sortValue(row)
        : typeof col.value === 'function'
          ? col.value(row)
          : row[col.value];
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sort.dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, sort, columns]);

  const toggleSort = (key, sortable) => {
    if (!sortable) return;
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: 'asc' };
    });
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="text-xs text-bank-text-muted py-6 text-center border border-dashed border-bank-border/70 rounded-xl">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-bank-border/70 bg-bank-surface">
      <table className="min-w-[980px] table-auto text-xs md:min-w-full">
        <thead className="bg-bank-bg/40 text-bank-text-muted">
          <tr>
            {columns.map((col) => {
              const sortable = col.sortable !== false;
              const isActive = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  } ${sortable ? 'cursor-pointer select-none hover:text-bank-text' : ''}`}
                  onClick={() => toggleSort(col.key, sortable)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortable && !isActive && (
                      <ArrowUpDown size={10} className="text-bank-border" />
                    )}
                    {sortable && isActive && sort.dir === 'asc' && (
                      <ArrowUp size={10} className="text-bank-primary" />
                    )}
                    {sortable && isActive && sort.dir === 'desc' && (
                      <ArrowDown size={10} className="text-bank-primary" />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={tbodyRef} className="divide-y divide-bank-border/60">
          {sorted.map((row, i) => (
            <tr
              key={row.contractId || row.id || i}
              className={`transition-colors duration-200 hover:bg-bank-bg/30 ${
                i % 2 === 1 ? 'bg-bank-bg/15' : ''
              }`}
            >
              {columns.map((col) => {
                const raw =
                  typeof col.value === 'function' ? col.value(row) : row[col.value];
                const display = col.render ? col.render(row, raw) : raw;
                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2 text-bank-text whitespace-nowrap ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : ''
                    } ${col.cellClass || ''}`}
                  >
                    {display ?? '–'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContractsTable;
