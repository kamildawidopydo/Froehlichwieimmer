import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, PenSquare, Trash2, Eye, Save, X, ExternalLink, Search, AlertTriangle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import PageMeta from '@/components/PageMeta';
import { EINORDNUNG_CATEGORY_LABEL } from '@/services/einordnungApi';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });

const STATUS_LABEL = { draft: 'Entwurf', scheduled: 'Geplant', published: 'Veröffentlicht', archived: 'Archiviert' };
const STATUS_TONE = {
  draft: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  scheduled: 'bg-sky-50 text-sky-800 border-sky-200',
  published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  archived: 'bg-amber-50 text-amber-800 border-amber-200',
};

const dtFmt = (iso) => (iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
const dtLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const slugify = (v) => (v || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '').slice(0, 80);

const emptyDraft = {
  id: null,
  title: '',
  slug: '',
  category: 'zinsen',
  teaser: '',
  body: '',
  author: 'Fröhlich Vermögensberatung',
  image_url: '',
  related_news_slug: '',
  status: 'draft',
  is_featured: false,
  published_at: '',
};

/** Simple Markdown-ish preview (H2, H3, bold, italic, paragraphs, lists). */
const renderPreview = (body) => {
  if (!body) return null;
  return body.split(/\n{2,}/).map((block, idx) => {
    const t = block.trim();
    if (t.startsWith('### ')) return <h3 key={idx} className="mt-6 font-serif text-xl text-bank-text">{t.replace(/^###\s+/, '')}</h3>;
    if (t.startsWith('## ')) return <h2 key={idx} className="mt-8 font-serif text-2xl text-bank-text">{t.replace(/^##\s+/, '')}</h2>;
    if (/^([-*])\s/.test(t)) {
      return (
        <ul key={idx} className="mt-4 list-disc pl-6 text-[15px] leading-relaxed text-bank-text">
          {t.split('\n').map((li, i) => <li key={i}>{li.replace(/^[-*]\s+/, '')}</li>)}
        </ul>
      );
    }
    const withInline = t
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    return <p key={idx} className="mt-4 text-[15px] leading-relaxed text-bank-text" dangerouslySetInnerHTML={{ __html: withInline }} />;
  });
};

const AdminEinordnung = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hideDemo, setHideDemo] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initialSlug, setInitialSlug] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (q.trim()) params.q = q.trim();
      const { data } = await api.get('/einordnung/admin/list', { params });
      setItems(data.items || []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) toast.error('Zugang verweigert — bitte als Admin einloggen.');
      else toast.error('Beiträge konnten nicht geladen werden.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, q]);

  useEffect(() => {
    const iv = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(iv);
  }, [load, q]);

  const visibleItems = useMemo(
    () => (hideDemo ? items.filter((i) => !i.is_demo) : items),
    [items, hideDemo],
  );

  const openNew = () => { setDraft({ ...emptyDraft }); setInitialSlug(''); };
  const openEdit = (item) => {
    setDraft({
      id: item.id,
      title: item.title,
      slug: item.slug,
      category: item.category,
      teaser: item.teaser,
      body: item.body || '',
      author: item.author,
      image_url: item.image_url || '',
      related_news_slug: item.related_news_slug || '',
      status: item.status,
      is_featured: !!item.is_featured,
      published_at: item.published_at || '',
    });
    setInitialSlug(item.slug);
  };
  const close = () => { setDraft(null); setPreviewOpen(false); };

  const handleFieldChange = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const suggestSlug = () => handleFieldChange({ slug: slugify(draft.title) });

  const validate = () => {
    if (!draft.title.trim() || draft.title.trim().length < 4) { toast.error('Titel ist Pflichtfeld (min. 4 Zeichen).'); return false; }
    if (!draft.teaser.trim() || draft.teaser.trim().length < 10) { toast.error('Teaser ist Pflichtfeld (min. 10 Zeichen).'); return false; }
    if (!draft.body.trim() || draft.body.trim().length < 40) { toast.error('Haupttext ist Pflichtfeld (min. 40 Zeichen).'); return false; }
    if (!EINORDNUNG_CATEGORY_LABEL[draft.category]) { toast.error('Ungültige Kategorie.'); return false; }
    return true;
  };

  const save = async (targetStatus) => {
    if (!validate()) return;
    if (draft.id && draft.slug !== initialSlug) {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('Eine Änderung des Slugs verändert die öffentliche URL dieses Beitrags. Fortfahren?');
      if (!ok) return;
    }
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      slug: draft.slug ? slugify(draft.slug) : undefined,
      category: draft.category,
      teaser: draft.teaser.trim(),
      body: draft.body.trim(),
      author: draft.author?.trim() || 'Fröhlich Vermögensberatung',
      image_url: draft.image_url?.trim() || null,
      related_news_slug: draft.related_news_slug?.trim() || null,
      status: targetStatus || draft.status,
      is_featured: !!draft.is_featured,
      published_at: draft.published_at ? new Date(draft.published_at).toISOString() : null,
    };
    try {
      if (draft.id) {
        await api.put(`/einordnung/admin/${draft.id}`, payload);
        toast.success('Beitrag aktualisiert.');
      } else {
        await api.post('/einordnung/admin', payload);
        toast.success('Beitrag erstellt.');
      }
      close(); load();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) toast.error('Slug ist bereits vergeben.');
      else toast.error(err?.response?.data?.detail || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (item) => {
    const extraWarn = item.status === 'published' ? '\n\nDer Beitrag ist aktuell VERÖFFENTLICHT.' : '';
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Möchten Sie diesen Beitrag wirklich dauerhaft löschen?${extraWarn}\n\n„${item.title}"`)) return;
    try {
      await api.delete(`/einordnung/admin/${item.id}`);
      toast.success('Beitrag gelöscht.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Löschen fehlgeschlagen.');
    }
  };

  return (
    <AdminSubpageLayout>
      <PageMeta title="Unsere Einordnung — Admin" description="Redaktionelle Beiträge verwalten" path="/admin/einordnung" noIndex />
      <AdminSubpageHeader
        eyebrow="Redaktion"
        titleIcon={BookOpen}
        title="Unsere Einordnung"
        description="Redaktionelle Beiträge für /news/nachrichten anlegen, planen, veröffentlichen und archivieren."
        actions={
          <Button onClick={openNew} data-testid="einordnung-new-btn" className="bg-bank-primary text-white hover:bg-bank-primary/90">
            <Plus size={15} strokeWidth={1.8} className="mr-2" /> Neue Einordnung erstellen
          </Button>
        }
      />

      {/* Filter row */}
      <AdminSurfaceCard className="mb-6 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Beiträge durchsuchen…" className="pl-9" data-testid="einordnung-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="einordnung-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="draft">Entwürfe</SelectItem>
              <SelectItem value="scheduled">Geplant</SelectItem>
              <SelectItem value="published">Veröffentlicht</SelectItem>
              <SelectItem value="archived">Archiviert</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger data-testid="einordnung-category-filter"><SelectValue placeholder="Kategorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {Object.entries(EINORDNUNG_CATEGORY_LABEL).map(([slug, label]) => (
                <SelectItem key={slug} value={slug}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between border border-bank-border bg-white px-3">
            <Label className="text-[12px] text-bank-text-muted">DEMO ausblenden</Label>
            <Switch checked={hideDemo} onCheckedChange={setHideDemo} data-testid="einordnung-hide-demo" />
          </div>
        </div>
      </AdminSurfaceCard>

      {/* Liste */}
      <AdminSurfaceCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="bg-bank-bg text-left text-[10.5px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
              <tr>
                <th className="px-4 py-3">Titel</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Veröffentlicht</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Zuletzt bearbeitet</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody data-testid="einordnung-admin-list">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-5"><div className="h-4 w-1/2 animate-pulse bg-neutral-100" /></td></tr>
              ))}
              {!loading && visibleItems.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-bank-text-muted">Keine Beiträge gefunden.</td></tr>
              )}
              {!loading && visibleItems.map((item) => (
                <tr key={item.id} className="border-t border-bank-border/60 hover:bg-bank-bg/40" data-testid={`einordnung-row-${item.slug}`}>
                  <td className="max-w-[380px] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-serif text-[14px] text-bank-text">{item.title}</span>
                      {item.is_demo && <span className="border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.16em] text-amber-900">Demo</span>}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-neutral-500">/{item.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-bank-text-muted">{EINORDNUNG_CATEGORY_LABEL[item.category] || item.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${STATUS_TONE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-bank-text-muted">{dtFmt(item.published_at)}</td>
                  <td className="px-4 py-3 text-[12px] text-bank-text-muted">{item.is_featured ? 'Ja' : '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-bank-text-muted">{dtFmt(item.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'published' && (
                        <Link to={`/news/einordnung/${item.slug}`} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-bank-primary" title="Öffentliche Seite ansehen">
                          <ExternalLink size={14} strokeWidth={1.8} />
                        </Link>
                      )}
                      <button type="button" onClick={() => openEdit(item)} className="text-neutral-500 hover:text-bank-primary" data-testid={`einordnung-edit-${item.slug}`} title="Bearbeiten">
                        <PenSquare size={14} strokeWidth={1.8} />
                      </button>
                      <button type="button" onClick={() => deletePost(item)} className="text-neutral-500 hover:text-rose-700" data-testid={`einordnung-delete-${item.slug}`} title="Löschen">
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSurfaceCard>

      {/* Editor overlay */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" data-testid="einordnung-editor">
          <div className="my-8 w-full max-w-5xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-bank-border bg-white px-5 py-3.5">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Fröhlich · Redaktion</p>
                <h2 className="mt-1 font-serif text-[19px] text-bank-text">{draft.id ? 'Beitrag bearbeiten' : 'Neue Einordnung'}</h2>
              </div>
              <button type="button" onClick={close} aria-label="Schließen" className="text-neutral-500 hover:text-bank-primary"><X size={18} strokeWidth={1.7} /></button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
              {/* Left: Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="e-title">Titel *</Label>
                  <Input id="e-title" value={draft.title} onChange={(e) => handleFieldChange({ title: e.target.value })} onBlur={() => { if (!draft.slug) suggestSlug(); }} data-testid="e-title" />
                </div>
                <div>
                  <Label htmlFor="e-slug">Slug</Label>
                  <div className="flex gap-2">
                    <Input id="e-slug" value={draft.slug} onChange={(e) => handleFieldChange({ slug: slugify(e.target.value) })} placeholder="wird automatisch generiert" data-testid="e-slug" />
                    <Button type="button" variant="outline" onClick={suggestSlug}>Aus Titel</Button>
                  </div>
                  {draft.id && draft.slug !== initialSlug && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-amber-800"><AlertTriangle size={12} /> Slug-Änderung verändert die öffentliche URL.</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Kategorie *</Label>
                    <Select value={draft.category} onValueChange={(v) => handleFieldChange({ category: v })}>
                      <SelectTrigger data-testid="e-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EINORDNUNG_CATEGORY_LABEL).map(([slug, label]) => (
                          <SelectItem key={slug} value={slug}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="e-author">Autor</Label>
                    <Input id="e-author" value={draft.author} onChange={(e) => handleFieldChange({ author: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="e-teaser">Teaser *</Label>
                  <Textarea id="e-teaser" rows={3} value={draft.teaser} onChange={(e) => handleFieldChange({ teaser: e.target.value })} data-testid="e-teaser" />
                </div>
                <div>
                  <Label htmlFor="e-body">Haupttext * <span className="text-[11px] font-normal text-neutral-500">(Markdown: ## Überschrift · ** fett ** · * kursiv * · - Liste · [Link](url))</span></Label>
                  <Textarea id="e-body" rows={14} value={draft.body} onChange={(e) => handleFieldChange({ body: e.target.value })} className="font-mono text-[13px]" data-testid="e-body" />
                  <p className="mt-1 text-[11px] text-neutral-500">Bitte einen Abschnitt „## Was bedeutet das für Anleger?" mit einer kurzen Zusammenfassung ergänzen.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="e-image">Bild-URL</Label>
                    <Input id="e-image" value={draft.image_url} onChange={(e) => handleFieldChange({ image_url: e.target.value })} placeholder="https://…" />
                  </div>
                  <div>
                    <Label htmlFor="e-related">Verknüpfte Nachricht (Slug)</Label>
                    <Input id="e-related" value={draft.related_news_slug} onChange={(e) => handleFieldChange({ related_news_slug: e.target.value })} placeholder="euronews-slug (optional)" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Status</Label>
                    <Select value={draft.status} onValueChange={(v) => handleFieldChange({ status: v })}>
                      <SelectTrigger data-testid="e-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Entwurf</SelectItem>
                        <SelectItem value="scheduled">Geplant</SelectItem>
                        <SelectItem value="published">Veröffentlicht</SelectItem>
                        <SelectItem value="archived">Archiviert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="e-published">Veröffentlichungsdatum</Label>
                    <Input id="e-published" type="datetime-local"
                           value={dtLocalInput(draft.published_at)}
                           onChange={(e) => handleFieldChange({ published_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
                  </div>
                </div>
                <div className="flex items-center justify-between border border-bank-border bg-bank-bg px-3 py-2">
                  <Label className="text-[13px]">Featured — auf News-Seite hervorheben</Label>
                  <Switch checked={draft.is_featured} onCheckedChange={(v) => handleFieldChange({ is_featured: v })} data-testid="e-featured" />
                </div>
              </div>

              {/* Right: Actions + Preview */}
              <div className="space-y-3">
                <div className="border border-bank-border bg-bank-bg p-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Aktionen</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button type="button" variant="outline" onClick={() => setPreviewOpen((v) => !v)} data-testid="e-preview-toggle">
                      <Eye size={14} strokeWidth={1.8} className="mr-2" /> {previewOpen ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => save('draft')} disabled={saving} data-testid="e-save-draft">
                      <Save size={14} strokeWidth={1.8} className="mr-2" /> Als Entwurf speichern
                    </Button>
                    <Button type="button" variant="outline" onClick={() => save('scheduled')} disabled={saving || !draft.published_at} data-testid="e-schedule">
                      Veröffentlichung planen
                    </Button>
                    <Button type="button" onClick={() => save('published')} disabled={saving} className="bg-bank-primary text-white hover:bg-bank-primary/90" data-testid="e-publish">
                      Veröffentlichen
                    </Button>
                    <Button type="button" variant="outline" onClick={() => save('archived')} disabled={saving} data-testid="e-archive">
                      Archivieren
                    </Button>
                  </div>
                </div>

                {previewOpen && (
                  <div className="border border-bank-gold/60 bg-white p-4" data-testid="e-preview">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold">Vorschau — nicht veröffentlicht</p>
                    {draft.image_url && (
                      <img src={draft.image_url} alt="" className="mt-3 aspect-[16/9] w-full object-cover" />
                    )}
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-bank-gold">
                      {EINORDNUNG_CATEGORY_LABEL[draft.category] || draft.category}
                    </p>
                    <h3 className="mt-1 font-serif text-[22px] leading-tight text-bank-text">{draft.title || 'Titel …'}</h3>
                    <p className="mt-2 text-[13.5px] text-bank-text-muted">{draft.teaser || 'Teaser …'}</p>
                    <div className="mt-4 border-t border-bank-border pt-3">{renderPreview(draft.body)}</div>
                    <div className="mt-6 border border-bank-border bg-bank-cream/50 p-3 text-[11.5px] leading-relaxed text-bank-text-muted">
                      Diese Veröffentlichung dient allgemeinen Informationszwecken und stellt keine individuelle Anlageberatung dar.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminEinordnung;
