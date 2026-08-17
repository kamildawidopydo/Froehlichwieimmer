import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  applyBankDefaultsToForm,
  bankSupportsProduct,
  emptyConditionsForm,
  formatConditionsForStorage,
  FORMULAR_BANKS,
  FORMULAR_PRODUCTS,
} from '@/lib/formularConditions';

const FormularConditionsDialog = ({ open, onOpenChange, codeRow, onSaved }) => {
  const [form, setForm] = useState(emptyConditionsForm());
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyConditionsForm(codeRow?.contract_conditions || null));
    }
  }, [open, codeRow]);

  const availableProducts = useMemo(
    () => FORMULAR_PRODUCTS.filter((p) => bankSupportsProduct(form.bank, p.id)),
    [form.bank],
  );

  useEffect(() => {
    if (!availableProducts.some((p) => p.id === form.product)) {
      setForm((prev) => ({ ...prev, product: availableProducts[0]?.id || 'festgeld' }));
    }
  }, [availableProducts, form.product]);

  const updateField = (key, value) => {
    if (key === 'bank') {
      setForm((prev) => applyBankDefaultsToForm(prev, value));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!codeRow?.id) return;

    const payload = formatConditionsForStorage(form);
    if (!payload.investmentAmountDisplay || !payload.interestRate || !payload.term || !payload.welcomeBonus) {
      toast.error('Bitte alle Konditionen-Felder ausfüllen.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('formular_access_codes')
      .update({ contract_conditions: payload })
      .eq('id', codeRow.id);
    setSaving(false);

    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }

    toast.success('Konditionen gespeichert');
    onSaved?.();
    onOpenChange(false);
  };

  const clearConditions = async () => {
    if (!codeRow?.id) return;
    if (!window.confirm('Konditionen für diesen Code entfernen? Es gelten dann wieder die Standardwerte.')) return;

    setClearing(true);
    const { error } = await supabase
      .from('formular_access_codes')
      .update({ contract_conditions: null })
      .eq('id', codeRow.id);
    setClearing(false);

    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }

    toast.success('Konditionen entfernt');
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Konditionen bearbeiten</DialogTitle>
          <DialogDescription>
            Gilt nur für die gewählte Bank und den gewählten Vertrag. Alle anderen Banken/Verträge nutzen die
            Standardwerte.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-bank-text-muted">
                Bank
              </Label>
              <Select value={form.bank} onValueChange={(v) => updateField('bank', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Bank wählen" />
                </SelectTrigger>
                <SelectContent className="z-toast" sideOffset={4}>
                  {FORMULAR_BANKS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-bank-text-muted">
                Vertrag
              </Label>
              <Select value={form.product} onValueChange={(v) => updateField('product', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vertrag wählen" />
                </SelectTrigger>
                <SelectContent className="z-toast" sideOffset={4}>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cond-amount">Anlagebetrag (in EUR)</Label>
              <Input
                id="cond-amount"
                value={form.investmentAmountDisplay}
                onChange={(e) => updateField('investmentAmountDisplay', e.target.value)}
                placeholder="10.000,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cond-rate">Zinssatz p.a.</Label>
              <Input
                id="cond-rate"
                value={form.interestRate}
                onChange={(e) => updateField('interestRate', e.target.value)}
                placeholder="4,24 %"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cond-term">Laufzeit</Label>
              <Input
                id="cond-term"
                value={form.term}
                onChange={(e) => updateField('term', e.target.value)}
                placeholder="12 Monate"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cond-bonus">Willkommensbonus (in EUR)</Label>
              <Input
                id="cond-bonus"
                value={form.welcomeBonus}
                onChange={(e) => updateField('welcomeBonus', e.target.value)}
                placeholder="295,00"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="border-rose-300/55 text-rose-700"
            disabled={clearing || saving || !codeRow?.contract_conditions}
            onClick={clearConditions}
          >
            {clearing ? 'Wird entfernt…' : 'Konditionen entfernen'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" disabled={saving} onClick={save}>
              {saving ? 'Speichern…' : 'Speichern'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormularConditionsDialog;
