import React, { useState } from 'react';
import { toast } from 'sonner';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Statement from '@/pages/Statement';

/**
 * Session 82.39 · Depot P1 · Kunden-Kontoauszug (Export-Panel).
 *
 * Setzt auf den bestehenden Print-Statement auf und ergänzt oben ein
 * kompaktes CSV/PDF-Export-Panel, das den Mongo-nativen
 * `/api/portfolio/statements`-Endpoint konsumiert.
 * Downloads laufen authentifiziert (credentials: include) über Same-Origin
 * FastAPI — keine Supabase-Abhängigkeit.
 */
export default function KontoauszugPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloading, setDownloading] = useState(null); // 'csv' | 'pdf' | null
  const [error, setError] = useState(null);

  const doDownload = async (format) => {
    setError(null);
    setDownloading(format);
    try {
      const params = new URLSearchParams({ format });
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const resp = await fetch(`/api/portfolio/statements?${params.toString()}`, {
        credentials: 'include',
        headers: { Accept: format === 'pdf' ? 'application/pdf' : 'text/csv' },
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const cd = resp.headers.get('content-disposition') || '';
      const match = cd.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : `kontoauszug.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} heruntergeladen`);
    } catch (err) {
      setError(err.message || 'Download fehlgeschlagen');
      toast.error(`Export fehlgeschlagen: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <section
        className="rounded-xl border border-bank-border bg-white p-5 shadow-sm"
        data-testid="statement-export-panel"
      >
        <div className="mb-4 flex items-center gap-2">
          <FileText size={16} strokeWidth={1.6} className="text-bank-gold" />
          <h2 className="font-display text-[1.1rem] font-light text-bank-text">
            Kontoauszug exportieren
          </h2>
        </div>
        <p className="mb-4 text-[12.5px] text-bank-text-muted">
          Revisionssicherer Export aller Geldbewegungen aus dem Cash-Ledger.
          Zeitraum optional — leere Felder liefern die vollständige Historie.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <Label htmlFor="stmt-from" className="text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
              Von
            </Label>
            <Input
              id="stmt-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="statement-date-from"
              className="mt-1"
              max={dateTo || undefined}
            />
          </div>
          <div className="min-w-[140px]">
            <Label htmlFor="stmt-to" className="text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
              Bis
            </Label>
            <Input
              id="stmt-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="statement-date-to"
              className="mt-1"
              min={dateFrom || undefined}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => doDownload('csv')}
              disabled={downloading !== null}
              data-testid="statement-download-csv"
              className="gap-2"
            >
              {downloading === 'csv' ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} strokeWidth={1.6} />
              )}
              CSV exportieren
            </Button>
            <Button
              variant="primary"
              onClick={() => doDownload('pdf')}
              disabled={downloading !== null}
              data-testid="statement-download-pdf"
              className="gap-2"
            >
              {downloading === 'pdf' ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} strokeWidth={1.6} />
              )}
              PDF exportieren
            </Button>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            data-testid="statement-export-error"
            className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800"
          >
            {error}
          </p>
        )}
      </section>
      <Statement embedded />
    </div>
  );
}
