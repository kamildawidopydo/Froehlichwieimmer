import React, { useEffect, useState } from 'react';
import { DownloadCloud } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';

const sizeMb = (b) => `${(b / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;

export default function AdminExports() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch('/api/admin/exports', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Export-Pakete"
        titleIcon={DownloadCloud}
        description="Geschützte Downloads – nur für angemeldete Administratoren."
      />
      <AdminSurfaceCard>
        <div className="divide-y divide-bank-border" data-testid="admin-exports-list">
          {items === null && <p className="p-4 text-sm text-bank-text-muted">Lädt…</p>}
          {items && items.length === 0 && <p className="p-4 text-sm text-bank-text-muted">Noch keine Export-Pakete vorhanden.</p>}
          {(items || []).map((it) => (
            <div key={it.name} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-bank-text">{it.name}</p>
                <p className="text-xs text-bank-text-muted">{sizeMb(it.size_bytes)}</p>
              </div>
              <a
                href={`/api/admin/exports/${encodeURIComponent(it.name)}`}
                className="inline-flex items-center gap-2 rounded-md bg-bank-ink px-3 py-2 text-sm text-white hover:bg-bank-ink-elev"
                data-testid={`admin-export-download-${it.name}`}
              >
                <DownloadCloud size={15} /> Herunterladen
              </a>
            </div>
          ))}
        </div>
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
}
