import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, PenSquare, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageMeta from '@/components/PageMeta';
import { newsMarkteApi, formatRelative } from '@/services/newsMarkteApi';

const emptyDraft = { title: '', dek: '', body: '', published: true };

const AdminEditorial = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null); // {id?, ...emptyDraft}
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await newsMarkteApi.adminList();
      setItems(data);
    } catch (err) {
      toast.error('Beiträge konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => setDraft({ ...emptyDraft });
  const openEdit = (item) =>
    setDraft({ id: item.id, title: item.title, dek: item.dek, body: item.body, published: item.published });
  const close = () => setDraft(null);

  const save = async () => {
    if (!draft?.title?.trim() || draft.body.trim().length < 10) {
      toast.error('Titel und Text sind erforderlich (min. 10 Zeichen).');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        dek: draft.dek?.trim() || '',
        body: draft.body.trim(),
        published: draft.published,
      };
      if (draft.id) {
        await newsMarkteApi.adminUpdate(draft.id, payload);
        toast.success('Beitrag aktualisiert.');
      } else {
        await newsMarkteApi.adminCreate(payload);
        toast.success('Beitrag erstellt.');
      }
      close();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Beitrag wirklich löschen?')) return;
    try {
      await newsMarkteApi.adminDelete(id);
      toast.success('Beitrag gelöscht.');
      load();
    } catch {
      toast.error('Löschen fehlgeschlagen.');
    }
  };

  const togglePublish = async (item) => {
    try {
      await newsMarkteApi.adminUpdate(item.id, {
        title: item.title,
        dek: item.dek,
        body: item.body,
        published: !item.published,
      });
      load();
    } catch {
      toast.error('Status konnte nicht geändert werden.');
    }
  };

  return (
    <div className="p-6 sm:p-10" data-testid="admin-editorial-page">
      <PageMeta title="Admin — Unsere Einschätzung" noIndex path="/admin/editorial" />

      <header className="mb-8 flex items-center justify-between border-b border-bank-border pb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-text-muted">Redaktion</p>
          <h1 className="mt-2 font-serif text-3xl text-bank-text">Unsere Einschätzung</h1>
          <p className="mt-1 text-sm text-bank-text-muted">
            Beiträge erstellen, veröffentlichen oder wieder in den Entwurf setzen.
          </p>
        </div>
        <Button onClick={openNew} className="rounded-none" data-testid="editorial-new-btn">
          <Plus className="mr-2 h-4 w-4" /> Neuer Beitrag
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-bank-text-muted">Wird geladen …</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-bank-text-muted">
          Noch keine Beiträge. Legen Sie mit „Neuer Beitrag" die erste Einschätzung an.
        </p>
      ) : (
        <div className="divide-y divide-bank-border border-t border-bank-border">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-1 gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10.5px] font-medium uppercase tracking-[0.24em] ${
                      item.published ? 'text-emerald-700' : 'text-neutral-400'
                    }`}
                  >
                    {item.published ? 'Veröffentlicht' : 'Entwurf'}
                  </span>
                  <span className="text-[11px] text-bank-text-muted">{formatRelative(item.updated_at || item.published_at)}</span>
                </div>
                <p className="mt-1 font-serif text-lg text-bank-text">{item.title}</p>
                {item.dek && <p className="mt-1 text-sm text-bank-text-muted line-clamp-2">{item.dek}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none"
                  onClick={() => togglePublish(item)}
                  data-testid={`editorial-toggle-${item.id}`}
                >
                  {item.published ? (
                    <>
                      <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Entwurf
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Veröffentlichen
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none"
                  onClick={() => openEdit(item)}
                  data-testid={`editorial-edit-${item.id}`}
                >
                  <PenSquare className="mr-1.5 h-3.5 w-3.5" /> Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => remove(item.id)}
                  data-testid={`editorial-delete-${item.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="editorial-drawer"
        >
          <div className="w-full max-w-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-bank-border px-6 py-4">
              <div>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.28em] text-bank-text-muted">Redaktion</p>
                <h2 className="mt-1 font-serif text-xl text-bank-text">
                  {draft.id ? 'Beitrag bearbeiten' : 'Neuer Beitrag'}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1 text-bank-text-muted hover:bg-neutral-100"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <label className="block text-xs font-medium uppercase tracking-[0.16em] text-bank-text-muted">
                Titel
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[15px] focus:border-bank-accent-strong focus:outline-none"
                data-testid="editorial-title-input"
              />

              <label className="mt-5 block text-xs font-medium uppercase tracking-[0.16em] text-bank-text-muted">
                Anriss (optional)
              </label>
              <input
                type="text"
                value={draft.dek}
                onChange={(e) => setDraft({ ...draft, dek: e.target.value })}
                className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px] focus:border-bank-accent-strong focus:outline-none"
                data-testid="editorial-dek-input"
              />

              <label className="mt-5 block text-xs font-medium uppercase tracking-[0.16em] text-bank-text-muted">
                Text · Absätze durch Leerzeile trennen
              </label>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={12}
                className="mt-2 w-full border border-bank-border bg-white px-3 py-2 text-[14px] leading-relaxed focus:border-bank-accent-strong focus:outline-none"
                data-testid="editorial-body-input"
              />

              <label className="mt-5 flex items-center gap-3 text-sm text-bank-text">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                  className="h-4 w-4"
                />
                Sofort veröffentlichen
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-bank-border px-6 py-4">
              <Button variant="outline" onClick={close} className="rounded-none">
                Abbrechen
              </Button>
              <Button onClick={save} disabled={saving} className="rounded-none" data-testid="editorial-save-btn">
                {saving ? 'Speichert …' : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEditorial;
