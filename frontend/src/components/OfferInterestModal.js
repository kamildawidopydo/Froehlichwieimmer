import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Send, User, Mail, Phone, MessageSquare, CheckCircle } from 'lucide-react';
import BankLogo from './BankLogo';
import { getDisplayProductType } from '@/lib/productDisplay';
import { formatRateDe } from '@/lib/interestRateHistory';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import { validatePersonName } from '@/lib/personName';

function getOfferTermLabel(offer) {
  const type = getDisplayProductType(offer);
  if (offer.deposit_term === 0 || type === 'Tagesgeld') return 'flexibel verfügbar';
  return `${offer.deposit_term} Monate Laufzeit`;
}

const OfferInterestModal = ({ offer, isOpen, onClose }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('offer_interests')
        .insert([{
          offer_id: offer.id,
          offer_bank_name: offer.bank_name,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          message: form.message || null,
        }]);

      if (error) throw error;

      try {
        await fetch('/api/send-offer-interest-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            message: form.message || null,
            offer: {
              bank_name: offer.bank_name,
              product_label: getDisplayProductType(offer),
              term_label: getOfferTermLabel(offer),
              rate_label: formatRateDe(offer.interest_rate),
            },
          }),
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      logEvent(EVENTS.OFFER_INTEREST_SUBMIT, {
        offer_id: offer.id,
        bank: offer.bank_name,
        interest_rate: offer.interest_rate,
      });
      setSubmitted(true);
      toast.success('Vielen Dank — wir melden uns persönlich bei Ihnen.');
    } catch (error) {
      toast.error('Fehler beim Senden der Anfrage');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ name: '', email: '', phone: '', message: '' });
    setSubmitted(false);
    onClose();
  };

  if (!offer) return null;

  const productLabel = getDisplayProductType(offer);
  const termLabel = getOfferTermLabel(offer);
  const firstName = form.name.trim().split(/\s+/)[0] || null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-white p-0">
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-bank-success/15 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-bank-success" />
            </div>
            <h2 className="text-2xl font-bold text-bank-text mb-3">
              Ihre {productLabel}-Anfrage ist eingegangen
            </h2>
            <p className="text-bank-text-muted mb-3">
              {firstName ? (
                <>
                  Vielen Dank, {firstName} — wir nehmen uns Ihr Anliegen persönlich vor.
                </>
              ) : (
                <>Vielen Dank — wir nehmen uns Ihr Anliegen persönlich vor.</>
              )}
            </p>
            <p className="text-sm text-bank-text-muted mb-3">
              Unser Beratungsteam prüft das Angebot der <strong>{offer.bank_name}</strong>{' '}
              ({formatRateDe(offer.interest_rate)}&nbsp;p.a., {termLabel}) und bereitet die nächsten Schritte für Sie vor.
            </p>
            <p className="text-sm text-bank-text-muted mb-6">
              Wir melden uns werktags in der Regel innerhalb von 24&nbsp;Stunden bei Ihnen — unverbindlich, mit Antworten auf Ihre Fragen und allen relevanten Details zu diesem Angebot.
            </p>
            <Button
              className="bg-bank-ink hover:bg-bank-ink-hover text-white px-8"
              onClick={handleClose}
              data-testid="interest-success-close-btn"
            >
              Schließen
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-bank-bg border-b border-bank-border p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-bank-text mb-1">
                  Interesse an diesem Angebot
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-bank-text-muted">
                Füllen Sie das Formular aus und wir kontaktieren Sie mit weiteren Informationen.
              </p>
              <div className="flex items-center gap-3 mt-4 p-3 bg-white rounded-lg border border-bank-border">
                <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="sm" />
                <div>
                  <p className="font-semibold text-bank-text">{offer.bank_name}</p>
                  <div className="text-sm text-bank-text-muted">
                    {offer.interest_rate}% p.a. | {offer.deposit_term || 0} Monate
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-bank-text-muted mb-2">
                  <User size={14} /> Name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: sanitizeFormField('name', e.target.value) })}
                  placeholder="Ihr vollständiger Name"
                  required
                  data-testid="interest-name-input"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-bank-text-muted mb-2">
                  <Mail size={14} /> E-Mail *
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ihre@email.de"
                  required
                  data-testid="interest-email-input"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-bank-text-muted mb-2">
                  <Phone size={14} /> Telefon (optional)
                </label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: sanitizeFormField('phone', e.target.value) })}
                  placeholder="+49 123 456 7890"
                  data-testid="interest-phone-input"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-bank-text-muted mb-2">
                  <MessageSquare size={14} /> Nachricht (optional)
                </label>
                <textarea
                  className="flex w-full rounded-md border border-bank-border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-bank-text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary focus-visible:ring-offset-2"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Haben Sie spezielle Fragen zu diesem Angebot?"
                  data-testid="interest-message-input"
                />
              </div>

              <p className="text-xs text-bank-text-muted">
                Mit dem Absenden stimmen Sie zu, dass wir Sie zu diesem Angebot kontaktieren dürfen. Ihre Daten werden gemäß unserer{' '}
                <a href="/legal/privacy" className="text-bank-accent hover:underline">Datenschutzerklärung</a> verarbeitet.
              </p>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  data-testid="interest-cancel-btn"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-bank-ink hover:bg-bank-ink-hover text-white"
                  disabled={loading}
                  data-testid="interest-submit-btn"
                >
                  {loading ? 'Wird gesendet...' : <><Send size={16} className="mr-2" />Anfrage senden</>}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OfferInterestModal;