import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ListChecks, Plus, Trash2, Save, RefreshCw } from 'lucide-react';

const SECTION_OPTIONS = ['Sicherheit', 'Flexibilitaet', 'Kundenfreundlichkeit'];

const createInfoRow = () => ({
  id: crypto.randomUUID(),
  section: 'Sicherheit',
  item_label: '',
  item_description: '',
  is_positive: true,
  sort_order: 0,
  persistedId: null,
});

const createGuidelineRow = () => ({
  id: crypto.randomUUID(),
  guideline_text: '',
  sort_order: 0,
  persistedId: null,
});

const AdminCreditBankDetails = () => {
  const [searchParams] = useSearchParams();
  const initialOfferId = searchParams.get('offer') || '';

  const [offers, setOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState(initialOfferId);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const [productRows, setProductRows] = useState([]);
  const [guidelineRows, setGuidelineRows] = useState([]);

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.id === selectedOfferId) || null,
    [offers, selectedOfferId],
  );

  const fetchOffers = async () => {
    setLoadingOffers(true);
    const { data, error } = await supabase
      .from('credit_offers')
      .select('id, purpose, is_active, banks(name, country)')
      .order('sort_priority', { ascending: true })
      .order('effective_rate_from', { ascending: true });

    if (error) {
      toast.error('Kredit-Angebote konnten nicht geladen werden.');
      setOffers([]);
    } else {
      setOffers(data || []);
      if (!selectedOfferId && data?.length) {
        setSelectedOfferId(data[0].id);
      }
    }
    setLoadingOffers(false);
  };

  const fetchDetails = async (offerId) => {
    if (!offerId) {
      setProductRows([]);
      setGuidelineRows([]);
      return;
    }
    setLoadingDetails(true);
    try {
      const [infoRes, guideRes] = await Promise.all([
        supabase
          .from('credit_offer_product_information')
          .select('*')
          .eq('credit_offer_id', offerId)
          .order('section', { ascending: true })
          .order('sort_order', { ascending: true }),
        supabase
          .from('credit_offer_acceptance_guidelines')
          .select('*')
          .eq('credit_offer_id', offerId)
          .order('sort_order', { ascending: true }),
      ]);

      if (infoRes.error) throw infoRes.error;
      if (guideRes.error) throw guideRes.error;

      setProductRows(
        (infoRes.data || []).map((row) => ({
          id: crypto.randomUUID(),
          section: row.section,
          item_label: row.item_label || '',
          item_description: row.item_description || '',
          is_positive: row.is_positive ?? true,
          sort_order: row.sort_order ?? 0,
          persistedId: row.id,
        })),
      );

      setGuidelineRows(
        (guideRes.data || []).map((row) => ({
          id: crypto.randomUUID(),
          guideline_text: row.guideline_text || '',
          sort_order: row.sort_order ?? 0,
          persistedId: row.id,
        })),
      );
    } catch (error) {
      toast.error(`Fehler beim Laden der Details: ${error.message}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    fetchDetails(selectedOfferId);
  }, [selectedOfferId]);

  const saveDetails = async () => {
    if (!selectedOfferId) {
      toast.error('Bitte zuerst ein Kredit-Angebot auswaehlen.');
      return;
    }
    setSaving(true);
    try {
      const cleanedProductRows = productRows
        .map((row, idx) => ({
          credit_offer_id: selectedOfferId,
          section: row.section,
          item_label: row.item_label.trim(),
          item_description: row.item_description.trim() || null,
          is_positive: !!row.is_positive,
          sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : idx,
        }))
        .filter((row) => row.item_label);

      const cleanedGuidelines = guidelineRows
        .map((row, idx) => ({
          credit_offer_id: selectedOfferId,
          guideline_text: row.guideline_text.trim(),
          sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : idx,
        }))
        .filter((row) => row.guideline_text);

      const deleteInfo = supabase
        .from('credit_offer_product_information')
        .delete()
        .eq('credit_offer_id', selectedOfferId);
      const deleteGuidelines = supabase
        .from('credit_offer_acceptance_guidelines')
        .delete()
        .eq('credit_offer_id', selectedOfferId);

      const [deleteInfoRes, deleteGuideRes] = await Promise.all([deleteInfo, deleteGuidelines]);
      if (deleteInfoRes.error) throw deleteInfoRes.error;
      if (deleteGuideRes.error) throw deleteGuideRes.error;

      if (cleanedProductRows.length > 0) {
        const { error } = await supabase
          .from('credit_offer_product_information')
          .insert(cleanedProductRows);
        if (error) throw error;
      }

      if (cleanedGuidelines.length > 0) {
        const { error } = await supabase
          .from('credit_offer_acceptance_guidelines')
          .insert(cleanedGuidelines);
        if (error) throw error;
      }

      toast.success('Bankdetails gespeichert.');
      await fetchDetails(selectedOfferId);
    } catch (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Kredit"
        title="Kredit-Bankdetails"
        titleIcon={ListChecks}
        description="Produktinformationen und Annahmerichtlinien pro Kredit-Angebot manuell pflegen."
        actions={
          <Button variant="outline" onClick={fetchOffers} disabled={loadingOffers}>
            <RefreshCw size={16} className={`mr-2 ${loadingOffers ? 'animate-spin' : ''}`} />
            Angebote neu laden
          </Button>
        }
      />

      <AdminToolbarCard className="space-y-3">
        <label className="block text-sm font-medium text-bank-text-muted">Kredit-Angebot auswaehlen</label>
        <select
          value={selectedOfferId}
          onChange={(e) => setSelectedOfferId(e.target.value)}
          className="h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/40"
        >
          <option value="">Bitte waehlen...</option>
          {offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.banks?.name || 'Unbekannt'} - {offer.purpose} {offer.is_active ? '' : '[inaktiv]'}
            </option>
          ))}
        </select>
        {selectedOffer ? (
          <p className="text-sm text-bank-text-muted">
            Bearbeite: <span className="font-medium text-bank-text">{selectedOffer.banks?.name}</span>
          </p>
        ) : null}
      </AdminToolbarCard>

      <div className="space-y-6">
        <AdminSurfaceCard className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-bank-text">Produktinformationen</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setProductRows((prev) => [...prev, { ...createInfoRow(), sort_order: prev.length }])
              }
              disabled={!selectedOfferId}
            >
              <Plus size={14} className="mr-1" />
              Zeile
            </Button>
          </div>

          {loadingDetails ? (
            <p className="py-6 text-sm text-bank-text-muted">Details werden geladen...</p>
          ) : productRows.length === 0 ? (
            <p className="py-6 text-sm text-bank-text-muted">Noch keine Produktinformationen vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {productRows.map((row, index) => (
                <div key={row.id} className="rounded-lg border border-bank-border/70 p-3">
                  <div className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-3">
                      <label className="mb-1 block text-xs text-bank-text-muted">Sektion</label>
                      <select
                        value={row.section}
                        onChange={(e) =>
                          setProductRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, section: e.target.value } : item,
                            ),
                          )
                        }
                        className="h-9 w-full rounded-md border border-bank-border px-2 text-sm"
                      >
                        {SECTION_OPTIONS.map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="mb-1 block text-xs text-bank-text-muted">Titel</label>
                      <Input
                        value={row.item_label}
                        onChange={(e) =>
                          setProductRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, item_label: e.target.value } : item,
                            ),
                          )
                        }
                        placeholder="z.B. Kostenlose Sondertilgung"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="mb-1 block text-xs text-bank-text-muted">Beschreibung</label>
                      <Input
                        value={row.item_description}
                        onChange={(e) =>
                          setProductRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, item_description: e.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Kurze Erklaerung"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="mb-1 block text-xs text-bank-text-muted">Positiv</label>
                      <input
                        type="checkbox"
                        checked={row.is_positive}
                        onChange={(e) =>
                          setProductRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, is_positive: e.target.checked } : item,
                            ),
                          )
                        }
                        className="mt-2 h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setProductRows((prev) => prev.filter((item) => item.id !== row.id))}
                      className="rounded-md p-1.5 text-bank-text-muted/70 hover:bg-bank-error/10 hover:text-bank-error"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSurfaceCard>

        <AdminSurfaceCard className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-bank-text">Annahmerichtlinien</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setGuidelineRows((prev) => [...prev, { ...createGuidelineRow(), sort_order: prev.length }])
              }
              disabled={!selectedOfferId}
            >
              <Plus size={14} className="mr-1" />
              Zeile
            </Button>
          </div>

          {loadingDetails ? (
            <p className="py-6 text-sm text-bank-text-muted">Details werden geladen...</p>
          ) : guidelineRows.length === 0 ? (
            <p className="py-6 text-sm text-bank-text-muted">Noch keine Annahmerichtlinien vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {guidelineRows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 rounded-lg border border-bank-border/70 p-3">
                  <Input
                    value={row.guideline_text}
                    onChange={(e) =>
                      setGuidelineRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, guideline_text: e.target.value } : item,
                        ),
                      )
                    }
                    placeholder="z.B. Kreditnehmer ist volljaehrig"
                  />
                  <button
                    onClick={() => setGuidelineRows((prev) => prev.filter((item) => item.id !== row.id))}
                    className="rounded-md p-2 text-bank-text-muted/70 hover:bg-bank-error/10 hover:text-bank-error"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </AdminSurfaceCard>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={saveDetails}
          disabled={!selectedOfferId || saving}
          className="rounded-xl bg-bank-ink text-white hover:bg-bank-ink-elev"
        >
          <Save size={15} className="mr-2" />
          {saving ? 'Wird gespeichert...' : 'Bankdetails speichern'}
        </Button>
      </div>
    </AdminSubpageLayout>
  );
};

export default AdminCreditBankDetails;
