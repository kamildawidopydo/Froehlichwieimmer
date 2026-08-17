import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { generateKnabFestgeldPdf } from '@/lib/generateKnabFestgeldPdf';
import { parseApiJsonResponse, apiErrorMessage } from '@/lib/parseApiJsonResponse';
import NationalitySelect from '@/components/profile/NationalitySelect';
import FormAddressFields from '@/components/profile/FormAddressFields';
import {
  isAtLeast18,
  maxBirthDateForMinimumAge,
  UNDER_AGE_MESSAGE,
} from '@/lib/ageValidation';
import {
  KNAB_FESTGELD_CONDITIONS,
  flexgeldInterestPaymentLabel,
  prepareKnabFestgeldPdfData,
  validateContractAddress,
} from '@/lib/contractAddress';
import { useFormularConditions } from '@/hooks/useFormularConditions';
import TaxIdInput, { validateEuropeanTaxId } from '@/components/profile/TaxIdInput';
import { getCountryForNationality } from '@/constants/countries';
import SignaturePad from '@/components/SignaturePad';
import { contractFormSubmitErrorMessage } from '@/lib/contractFormSubmitError';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import {
  Check,
  FileText,
  Download,
  Printer,
  AlertTriangle,
  Info,
  Lightbulb,
  Loader2,
  CheckCircle2,
  Send
} from 'lucide-react';

const KnabFestgeldVertrag = () => {
  const { conditions } = useFormularConditions('knab', 'festgeld', KNAB_FESTGELD_CONDITIONS);
  const formRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    salutation: '',
    fullName: '',
    birthDate: '',
    birthPlace: '',
    nationality: 'Deutsch',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    phone: '',
    mobile: '',
    email: '',
    taxId: '',

    registryCourt: '',
    registryNumber: '',

    idType: 'personalausweis',
    idNumber: '',
    idIssuedDate: '',
    idValidUntil: '',
    idAuthority: '',

    interestPayment: '',

    accountHolder: '',
    iban: '',
    bic: '',
    bankName: '',

    s_salutation: '',
    s_fullName: '',
    s_birthDate: '',
    s_birthPlace: '',
    s_nationality: '',
    s_street: '',
    s_houseNumber: '',
    s_postalCode: '',
    s_city: '',
    s_phone: '',
    s_mobile: '',
    s_email: '',
    s_taxId: '',
    s_idType: 'personalausweis',
    s_idNumber: '',
    s_idIssuedDate: '',
    s_idValidUntil: '',
    s_idAuthority: '',

    sig1_date: '',
    sig1_image: null,
    sig2_date: '',
    sig2_image: null,

    agbAccepted: false,
    privacyAccepted: false,
    productInfoAccepted: false,
    depositProtectionAccepted: false,
    withdrawalRightAccepted: false,
    correctnessConfirmed: false
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: sanitizeFormField(field, value) }));
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const validateForm = () => {
    const required = ['salutation', 'fullName', 'birthDate', 'birthPlace', 'nationality', 'street', 'houseNumber', 'postalCode', 'city', 'phone', 'email', 'taxId', 'idNumber', 'idIssuedDate', 'idValidUntil', 'idAuthority', 'accountHolder', 'iban', 'bic'];
    for (const field of required) {
      if (!formData[field]) return false;
    }
    if (!isAtLeast18(formData.birthDate)) return false;
    if (!validateEuropeanTaxId(formData.taxId, getCountryForNationality(formData.nationality)).ok) return false;
    if (formData.s_fullName) {
      if (!formData.s_email) return false;
      if (formData.s_birthDate && !isAtLeast18(formData.s_birthDate)) return false;
    }
    if (formData.s_taxId && !validateEuropeanTaxId(formData.s_taxId, getCountryForNationality(formData.s_nationality || formData.nationality)).ok) {
      return false;
    }
    return true;
  };

  const validateSignatures = () => {
    if (!formData.sig1_date?.trim()) {
      return 'Bitte geben Sie Ort und Datum für die Unterschrift des ersten Anlegers an.';
    }
    if (!formData.sig1_image) {
      return 'Bitte unterschreiben Sie als erster Anleger.';
    }
    if (formData.s_fullName?.trim()) {
      if (!formData.sig2_date?.trim()) {
        return 'Bitte geben Sie Ort und Datum für die Unterschrift des zweiten Anlegers an.';
      }
      if (!formData.sig2_image) {
        return 'Bitte unterschreiben Sie als zweiter Anleger.';
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!allConfirmationsAccepted) {
      toast.error('Bitte bestätigen Sie alle Erklärungen.');
      return;
    }
    if (!validateForm()) {
      if (formData.birthDate && !isAtLeast18(formData.birthDate)) {
        toast.error(UNDER_AGE_MESSAGE);
      } else if (formData.s_birthDate && !isAtLeast18(formData.s_birthDate)) {
        toast.error('Der zweite Anleger muss mindestens 18 Jahre alt sein.');
      } else if (!validateEuropeanTaxId(formData.taxId, getCountryForNationality(formData.nationality)).ok) {
        toast.error(validateEuropeanTaxId(formData.taxId, getCountryForNationality(formData.nationality)).message);
      } else if (formData.s_taxId && !validateEuropeanTaxId(formData.s_taxId, getCountryForNationality(formData.s_nationality || formData.nationality)).ok) {
        toast.error(validateEuropeanTaxId(formData.s_taxId, getCountryForNationality(formData.s_nationality || formData.nationality)).message);
      } else {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus.');
      }
      return;
    }

    const addressCheck = validateContractAddress(formData);
    if (!addressCheck.ok) {
      toast.error(addressCheck.message);
      return;
    }

    const signatureError = validateSignatures();
    if (signatureError) {
      toast.error(signatureError);
      return;
    }

    if (!formData.interestPayment) {
      toast.error('Bitte wählen Sie eine Zinsgutschrift aus.');
      return;
    }

    setSubmitting(true);
    try {
      let pdfBase64;
      try {
        pdfBase64 = await generateKnabFestgeldPdf(prepareKnabFestgeldPdfData(formData, conditions));
      } catch (pdfErr) {
        console.error('PDF error:', pdfErr);
        toast.error(`PDF konnte nicht erstellt werden: ${pdfErr.message || 'Unbekannter Fehler'}`);
        return;
      }

      const zinsgutschriftLabel = flexgeldInterestPaymentLabel(formData.interestPayment);
      const formSummaryHtml = `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 8px;color:#6B7C93;">Anleger</td><td style="padding:6px 8px;font-weight:600;">${formData.fullName}</td></tr>
          <tr style="background:#F4F5F7;"><td style="padding:6px 8px;color:#6B7C93;">Anlagebetrag</td><td style="padding:6px 8px;font-weight:600;">${conditions.investmentAmountDisplay} EUR</td></tr>
          <tr><td style="padding:6px 8px;color:#6B7C93;">Zinssatz p.a.</td><td style="padding:6px 8px;font-weight:600;">${conditions.interestRate}</td></tr>
          <tr style="background:#F4F5F7;"><td style="padding:6px 8px;color:#6B7C93;">Laufzeit</td><td style="padding:6px 8px;font-weight:600;">${conditions.term}</td></tr>
          <tr><td style="padding:6px 8px;color:#6B7C93;">Willkommensbonus</td><td style="padding:6px 8px;font-weight:600;">${conditions.welcomeBonus} EUR</td></tr>
          <tr style="background:#F4F5F7;"><td style="padding:6px 8px;color:#6B7C93;">Zinsgutschrift</td><td style="padding:6px 8px;font-weight:600;">${zinsgutschriftLabel}</td></tr>
          <tr><td style="padding:6px 8px;color:#6B7C93;">IBAN</td><td style="padding:6px 8px;font-weight:600;">${formData.iban}</td></tr>
          <tr style="background:#F4F5F7;"><td style="padding:6px 8px;color:#6B7C93;">Zweiter Anleger</td><td style="padding:6px 8px;font-weight:600;">${formData.s_fullName || '—'}</td></tr>
        </table>
      `;

      const response = await fetch('/api/send-knab-festgeld-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: formData.email,
          customerName: formData.fullName,
          pdfBase64,
          formSummaryHtml,
          formSummary: {
            iban: formData.iban,
            secondInvestor: formData.s_fullName || null,
          },
        }),
      });

      const { data, raw } = await parseApiJsonResponse(response);
      if (!response.ok) throw new Error(apiErrorMessage(response, raw, data?.error));

      setSubmitted(true);
      toast.success('Ihr Festgeldvertrag wurde erfolgreich versendet!');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(`Fehler: ${contractFormSubmitErrorMessage(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const allConfirmationsAccepted =
    formData.agbAccepted &&
    formData.privacyAccepted &&
    formData.productInfoAccepted &&
    formData.depositProtectionAccepted &&
    formData.withdrawalRightAccepted;

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 bg-bank-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-bank-success" />
          </div>
          <h2 className="text-2xl font-semibold text-bank-primary mb-4">Antrag erfolgreich eingereicht</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Vielen Dank für Ihr Vertrauen in Kapitalmitte. Wir haben Ihren Antrag erhalten und prüfen Ihre
            Angaben sorgfältig.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Unser Team wird sich in Kürze bei Ihnen melden. Bei Rückfragen erreichen Sie uns unter{' '}
            <a href="mailto:kundenservice@kapitalmitte.com" className="text-bank-primary hover:underline">
              kundenservice@kapitalmitte.com
            </a>
            .
          </p>
          <Button
            onClick={() => { setSubmitted(false); setFormData(prev => ({ ...prev, agbAccepted: false, privacyAccepted: false, productInfoAccepted: false, depositProtectionAccepted: false, withdrawalRightAccepted: false, correctnessConfirmed: false })); }}
            variant="outline"
            className="mr-3"
          >
            Neuen Antrag stellen
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-bank-ink hover:bg-bank-ink-hover text-white"
          >
            Zur Startseite
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f3f8] contract-form-root">
      <style>
        {`
          @media print {
            @page { size: A4; margin: 9mm 8mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; box-sizing: border-box !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            html, body, #root {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            body { font-size: 9.5pt; line-height: 1.35; }
            aside[aria-label="Kundenservice"], .live-ticker-wrap { display: none !important; visibility: hidden !important; }
            header.sticky, footer.bg-bank-primary, footer.relative.mt-20,
            .min-h-screen.flex.flex-col > footer,
            .min-h-screen.flex.flex-col > header { display: none !important; }
            .min-h-screen.flex.flex-col > main {
              overflow: visible !important;
              padding: 0 !important;
            }
            .contract-form-root {
              background: white !important;
              min-height: auto !important;
              font-size: 9.5pt;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .contract-paper {
              box-shadow: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
              width: 100% !important;
              max-width: none !important;
              padding: 0 !important;
            }
            .max-w-\\[860px\\], .mx-auto, .my-4, .md\\:my-8 {
              max-width: none !important;
              width: 100% !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
            }
            .print-break-avoid, .print-signature-block { page-break-inside: avoid; break-inside: avoid; }
            h3, h4 { page-break-after: avoid; break-after: avoid; }
            section { page-break-inside: auto; }

            .print-signatures-section {
              break-before: page;
              page-break-before: always;
              padding-top: 3mm;
            }
            .print-signatures-section > .flex.items-center { margin-bottom: 8px !important; }
            .print-signature-block { margin-bottom: 10px !important; }
            .print-signatures-section canvas,
            .print-signatures-section .h-28 {
              height: 56px !important;
              min-height: 56px !important;
              max-height: 56px !important;
            }

            .print-terms-columns {
              columns: 2 !important;
              column-gap: 10px !important;
            }
            .print-terms-columns .print-term-item {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .md\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
            .md\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
            .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
            .sm\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
            .lg\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
            .md\\:col-span-2 { grid-column: span 2 !important; }
            .flex-col.md\\:flex-row, .md\\:flex-row { flex-direction: row !important; }
            .md\\:items-end { align-items: flex-end !important; }
            .md\\:px-10, header.bg-\\[\\#3E4A59\\] {
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            header.bg-\\[\\#3E4A59\\] {
              padding-left: 2mm !important;
              padding-right: 2mm !important;
              width: 100% !important;
            }
            .md\\:p-6 { padding: 8px !important; }
            .md\\:rounded-t { border-radius: 0 !important; }
            .md\\:rounded { border-radius: 0 !important; }

            input, .date-picker-trigger, button[role="combobox"] {
              border: none !important; border-bottom: 0.5px solid #b0bec5 !important;
              background: transparent !important; box-shadow: none !important;
              padding: 0 2px !important; height: auto !important; min-height: 16px !important;
              font-size: 9.5pt !important; line-height: 1.3 !important; border-radius: 0 !important;
            }
            button[aria-haspopup="dialog"] {
              border: none !important; border-bottom: 0.5px solid #b0bec5 !important;
              background: transparent !important; box-shadow: none !important;
              padding: 0 !important; height: auto !important; min-height: 16px !important;
              font-size: 9.5pt !important; line-height: 1.3 !important; border-radius: 0 !important;
              gap: 0 !important; display: inline !important;
            }
            button[aria-haspopup="dialog"] > svg { display: none !important; }
            button[aria-haspopup="dialog"] > span[role="button"] { display: none !important; }
            button[aria-haspopup="dialog"] > span.flex-1 { font-size: 9.5pt !important; }
            input[type="checkbox"] {
              border: 1px solid #3E4A59 !important; border-bottom: 1px solid #3E4A59 !important;
              width: 11px !important; height: 11px !important; min-height: 11px !important;
              padding: 0 !important; appearance: auto !important;
            }
            button[role="checkbox"] {
              width: 11px !important; height: 11px !important; min-height: 11px !important;
              border: 1px solid #3E4A59 !important; border-radius: 2px !important;
              padding: 0 !important; flex-shrink: 0 !important;
            }
            button[role="radio"] {
              width: 11px !important; height: 11px !important; min-height: 11px !important;
              border: 1px solid #3E4A59 !important; border-radius: 50% !important;
              padding: 0 !important; flex-shrink: 0 !important;
            }

            label { font-size: 8.5pt !important; line-height: 1.3 !important; }
            .text-\\[13px\\] { font-size: 9.5pt !important; }
            .text-\\[12px\\] { font-size: 9pt !important; }
            .text-\\[11px\\] { font-size: 8.5pt !important; }
            .text-\\[10px\\] { font-size: 8pt !important; }
            .text-\\[9px\\] { font-size: 7.5pt !important; }
            .text-sm { font-size: 9pt !important; }
            .text-xs { font-size: 8.5pt !important; }
            .text-\\[15px\\] { font-size: 10.5pt !important; }
            .text-xl { font-size: 12pt !important; }
            .text-\\[2\\.2rem\\] { font-size: 16pt !important; }

            .mb-10 { margin-bottom: 11px !important; }
            .mb-8 { margin-bottom: 9px !important; }
            .mb-6 { margin-bottom: 7px !important; }
            .mb-5 { margin-bottom: 6px !important; }
            .mb-4 { margin-bottom: 5px !important; }
            .mb-3 { margin-bottom: 4px !important; }
            .mb-1 { margin-bottom: 2px !important; }
            .mt-10 { margin-top: 9px !important; }
            .mt-5 { margin-top: 5px !important; }
            .mt-4 { margin-top: 4px !important; }
            .mt-1, .mt-1\\.5 { margin-top: 2px !important; }
            .py-8 { padding-top: 8px !important; padding-bottom: 8px !important; }
            .py-6 { padding-top: 6px !important; padding-bottom: 6px !important; }
            .py-3 { padding-top: 3px !important; padding-bottom: 3px !important; }
            .py-2 { padding-top: 2px !important; padding-bottom: 2px !important; }
            .px-5, .px-6, .px-4 { padding-left: 0 !important; padding-right: 0 !important; }
            .pt-4 { padding-top: 4px !important; }
            .pb-5 { padding-bottom: 5px !important; }
            .pb-2, .pb-1 { padding-bottom: 2px !important; }
            .p-4 { padding: 6px !important; }
            .p-5 { padding: 7px !important; }
            .space-y-4 > * + * { margin-top: 5px !important; }
            .space-y-3 > * + * { margin-top: 4px !important; }
            .space-y-2 > * + * { margin-top: 3px !important; }
            .grid { gap: 6px 8px !important; }
            .gap-6, .gap-5 { gap: 6px !important; }
            .gap-4 { gap: 5px !important; }
            .gap-3 { gap: 4px !important; }
            .gap-x-12 { column-gap: 18px !important; }
            .gap-y-4 { row-gap: 5px !important; }

            .leading-relaxed { line-height: 1.35 !important; }
            .leading-snug, .leading-tight { line-height: 1.25 !important; }
            .rounded-lg { border-radius: 2px !important; }
            .w-7 { width: 16px !important; }
            .h-7 { height: 16px !important; }
            .h-\\[3px\\] { height: 2px !important; }
            .h-8 { height: 18px !important; }
            .border-l-4 { border-left-width: 2px !important; }
            .border-t-2 { border-top-width: 1px !important; }

            .h-10 { height: auto !important; min-height: 16px !important; }

            [data-radix-popper-content-wrapper] { display: none !important; }

            .w-5.h-5 { width: 12px !important; height: 12px !important; }
            .w-4.h-4 { width: 10px !important; height: 10px !important; }

            header.bg-\\[\\#3E4A59\\] { padding: 8px 10px !important; }
            header .h-10, header .h-7 { height: 16px !important; }
            header .w-px { height: 16px !important; }

            footer.mt-10 { margin-top: 8px !important; padding-top: 5px !important; width: 100% !important; }

            .print-term-item { padding-bottom: 3px !important; margin-bottom: 1px !important; }
            .print-term-item h4 { font-size: 8pt !important; margin-bottom: 1px !important; }
            .print-term-item p { font-size: 7.5pt !important; line-height: 1.3 !important; }

            .print-break-avoid .border.border-\\[\\#a8bed3\\].rounded.bg-\\[\\#f6f9fc\\],
            .print-signature-block .border.border-\\[\\#a8bed3\\].rounded.bg-\\[\\#f6f9fc\\] {
              padding: 7px 9px !important;
            }
          }
        `}
      </style>

      <main className="contract-paper py-0 max-w-[860px] mx-auto my-4 md:my-8 bg-white shadow-[0_1px_30px_rgba(62,74,89,0.10)] md:rounded" ref={formRef}>

        {/* Header */}
        <header className="bg-[#3E4A59] text-white px-6 md:px-10 py-6 md:rounded-t relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />
          <div className="relative flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white px-3 py-2 shrink-0"><img src="/assets/bank-logos/knab.svg" alt="Knab" className="h-7 w-auto object-contain" /></div>
                <div className="w-px self-center h-8 bg-white/30 shrink-0" />
                <div className="flex flex-col justify-center leading-tight">
                  <p className="text-[11px] font-semibold text-white tracking-wider">Festgeldanlage</p>
                  <p className="text-[11px] text-white/70 tracking-wider mt-0.5">mit garantierter Verzinsung</p>
                </div>
              </div>
              <p className="text-[10px] text-white/50 mt-1.5 tracking-wide">Knab B.V. · Amsterdam, Niederlande</p>
            </div>
          </div>
          <div className="h-[3px] bg-gradient-to-r from-[#E8A020] via-[#F0C060] to-transparent mt-5 rounded-full" />
          <div className="relative mt-4 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <span className="text-[9px] text-white/50 uppercase tracking-[0.15em]">Vertragsnummer</span>
              <p className="mt-1 border-b border-white/25 pb-1 text-sm font-semibold text-white/50">—</p>
              <p className="text-[8px] text-white/40 mt-1">Wird im Rahmen der Verarbeitung automatisch vergeben.</p>
            </div>
            <div className="flex-1">
              <span className="text-[9px] text-white/50 uppercase tracking-[0.15em]">Vertragsdatum</span>
              <p className="mt-1 border-b border-white/25 pb-1 text-sm font-semibold text-white">{new Date().toLocaleDateString('de-DE')}</p>
            </div>
          </div>
        </header>

        <div className="px-6 md:px-10 py-8">

        {/* Introduction */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-[#3E4A59] mb-1">Festgeldvertrag</h2>
          <div className="w-16 h-[3px] bg-[#E8A020] rounded-full mb-5" />
          <div className="text-[13px] text-[#3a4f6a] leading-relaxed space-y-3">
            <p>
              zwischen dem Anleger [nachfolgend „Anleger" genannt] und <strong className="text-[#3E4A59]">Knab B.V.</strong> [nachfolgend „Bank" genannt],
              vermittelt durch <strong className="text-[#3E4A59]">Kapitalmitte</strong>.
            </p>
            <p>
              Dieses Dokument bestätigt die Vereinbarung zwischen dem oben genannten Anleger und der Knab B.V. über eine
              Festgeldanlage zu den nachfolgend aufgeführten Bedingungen. Die Festgeldanlage erfolgt für die vertraglich
              vereinbarte Laufzeit zu einem festen, garantierten Zinssatz.
            </p>
          </div>
        </div>

        {/* Section 1: Kundendaten */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-7 h-7 bg-[#3E4A59] text-white rounded flex items-center justify-center font-bold text-xs">1</span>
            <h3 className="text-[15px] font-bold text-[#3E4A59] uppercase tracking-wide">Kundendaten</h3>
            <div className="flex-1 h-px bg-[#3E4A59]/20" />
          </div>

          {/* Erster Anleger */}
          <div className="border border-[#a8bed3] rounded-lg mb-6 print-break-avoid">
            <div className="px-5 pt-4 pb-2">
              <h4 className="text-[13px] font-bold text-[#3E4A59]">Erster Anleger</h4>
            </div>
            <div className="px-5 pb-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <Label className="font-semibold text-bank-primary">Name, Vorname *</Label>
                  <Input value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} className="mt-1" />
                </div>
                <div className="flex items-center gap-5 pb-2">
                  {['Frau', 'Herr'].map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#3E4A59]">
                      <input type="checkbox" checked={formData.salutation === opt.toLowerCase()} onChange={() => handleInputChange('salutation', opt.toLowerCase())} className="w-4 h-4 accent-[#3E4A59]" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold text-bank-primary">Geburtsort *</Label>
                  <Input value={formData.birthPlace} onChange={(e) => handleInputChange('birthPlace', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Geburtsdatum *</Label>
                  <DatePicker date={formData.birthDate} setDate={(date) => handleInputChange('birthDate', date)} id="birth-date" maxDate={maxBirthDateForMinimumAge()} />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Staatsangehörigkeit *</Label>
                  <NationalitySelect value={formData.nationality} onChange={(value) => handleInputChange('nationality', value)} required />
                </div>
              </div>

              <FormAddressFields
                values={formData}
                onChange={handleInputChange}
                labelClassName="text-bank-primary"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold text-bank-primary">E-Mail-Adresse *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold text-bank-primary">Telefon *</Label>
                  <Input value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Mobile</Label>
                  <Input value={formData.mobile} onChange={(e) => handleInputChange('mobile', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Steueridentifikationsnummer *</Label>
                  <TaxIdInput
                    value={formData.taxId}
                    onChange={(value) => handleInputChange('taxId', value)}
                    country={getCountryForNationality(formData.nationality)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Erster Anleger — Legitimation */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-[13px] font-bold text-[#3E4A59]">Legitimiert durch:</span>
              {['Personalausweis', 'Reisepass'].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#3E4A59]">
                  <input type="checkbox" checked={formData.idType === opt.toLowerCase()} onChange={() => handleInputChange('idType', opt.toLowerCase())} className="w-4 h-4 accent-[#3E4A59]" />
                  {opt}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="font-semibold text-bank-primary">Ausweis-Nr. *</Label>
                <Input value={formData.idNumber} onChange={(e) => handleInputChange('idNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="font-semibold text-bank-primary">ausgestellt am *</Label>
                <DatePicker date={formData.idIssuedDate} setDate={(date) => handleInputChange('idIssuedDate', date)} id="id-issued" />
              </div>
              <div>
                <Label className="font-semibold text-bank-primary">gültig bis *</Label>
                <DatePicker date={formData.idValidUntil} setDate={(date) => handleInputChange('idValidUntil', date)} id="id-valid" />
              </div>
              <div>
                <Label className="font-semibold text-bank-primary">Behörde/Ort *</Label>
                <Input value={formData.idAuthority} onChange={(e) => handleInputChange('idAuthority', e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Zweiter Anleger bzw. Bevollmächtigte Person */}
          <div className="border border-[#a8bed3] rounded-lg mb-6 print-break-avoid">
            <div className="px-5 pt-4 pb-2">
              <h4 className="text-[13px] font-bold text-[#3E4A59]">
                Zweiter Anleger bzw. Bevollmächtigte Person
                <span className="ml-2 text-[12px] font-normal text-gray-400">(optional)</span>
              </h4>
            </div>
            <div className="px-5 pb-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <Label className="font-semibold text-bank-primary">Name, Vorname</Label>
                  <Input value={formData.s_fullName} onChange={(e) => handleInputChange('s_fullName', e.target.value)} className="mt-1" />
                </div>
                <div className="flex items-center gap-5 pb-2">
                  {['Frau', 'Herr'].map((opt) => (
                    <label key={`s-${opt}`} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#3E4A59]">
                      <input type="checkbox" checked={formData.s_salutation === opt.toLowerCase()} onChange={() => handleInputChange('s_salutation', opt.toLowerCase())} className="w-4 h-4 accent-[#3E4A59]" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold text-bank-primary">Geburtsort</Label>
                  <Input value={formData.s_birthPlace} onChange={(e) => handleInputChange('s_birthPlace', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Geburtsdatum</Label>
                  <DatePicker date={formData.s_birthDate} setDate={(date) => handleInputChange('s_birthDate', date)} id="s-birth-date" maxDate={maxBirthDateForMinimumAge()} />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Staatsangehörigkeit</Label>
                  <NationalitySelect value={formData.s_nationality} onChange={(value) => handleInputChange('s_nationality', value)} />
                </div>
              </div>

              <FormAddressFields
                values={formData}
                onChange={handleInputChange}
                prefix="s_"
                labelClassName="text-bank-primary"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold text-bank-primary">E-Mail-Adresse</Label>
                  <Input type="email" value={formData.s_email} onChange={(e) => handleInputChange('s_email', e.target.value)} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-semibold text-bank-primary">Telefon</Label>
                  <Input value={formData.s_phone} onChange={(e) => handleInputChange('s_phone', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Mobile</Label>
                  <Input value={formData.s_mobile} onChange={(e) => handleInputChange('s_mobile', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold text-bank-primary">Steueridentifikationsnummer</Label>
                  <TaxIdInput
                    value={formData.s_taxId}
                    onChange={(value) => handleInputChange('s_taxId', value)}
                    country={getCountryForNationality(formData.s_nationality || formData.nationality)}
                    className="mt-1"
                    required={false}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Zweiter Anleger — Legitimation */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-[13px] font-bold text-[#3E4A59]">Legitimiert durch:</span>
              {['Personalausweis', 'Reisepass'].map((opt) => (
                <label key={`s-${opt}`} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#3E4A59]">
                  <input type="checkbox" checked={formData.s_idType === opt.toLowerCase()} onChange={() => handleInputChange('s_idType', opt.toLowerCase())} className="w-4 h-4 accent-[#3E4A59]" />
                  {opt}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="font-semibold text-bank-primary">Ausweis-Nr.</Label>
                <Input value={formData.s_idNumber} onChange={(e) => handleInputChange('s_idNumber', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="font-semibold text-bank-primary">ausgestellt am</Label>
                <DatePicker date={formData.s_idIssuedDate} setDate={(date) => handleInputChange('s_idIssuedDate', date)} id="s-id-issued" />
              </div>
              <div>
                <Label className="font-semibold text-bank-primary">gültig bis</Label>
                <DatePicker date={formData.s_idValidUntil} setDate={(date) => handleInputChange('s_idValidUntil', date)} id="s-id-valid" />
              </div>
              <div>
                <Label className="font-semibold text-bank-primary">Behörde/Ort</Label>
                <Input value={formData.s_idAuthority} onChange={(e) => handleInputChange('s_idAuthority', e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <div className="bg-bank-bg p-4 rounded-lg flex gap-3 border-l-4 border-bank-accent">
            <Info className="w-5 h-5 text-bank-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong className="text-bank-primary">Hinweis zur Legitimationsprüfung:</strong> Gemäß Geldwäschegesetz ist die Knab B.V. verpflichtet, die Identität des Kunden zu überprüfen.
            </p>
          </div>
        </section>

        {/* Section 2: Festgeldkonditionen — fixed values, Zinsgutschrift selectable */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-7 h-7 bg-[#3E4A59] text-white rounded flex items-center justify-center font-bold text-xs">2</span>
            <h3 className="text-[15px] font-bold text-[#3E4A59] uppercase tracking-wide">Angaben zur Festgeldanlage</h3>
            <div className="flex-1 h-px bg-[#3E4A59]/20" />
          </div>

          <div className="border border-[#b0bec5] mb-5">
            <div className="bg-[#f0f4fa] px-4 py-2 border-b border-[#b0bec5]">
              <h4 className="text-sm font-bold text-[#3E4A59]">Festgeldkonditionen</h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div>
                  <Label className="text-xs font-bold text-[#3E4A59]">Anlagebetrag (in EUR)*</Label>
                  <Input
                    readOnly
                    tabIndex={-1}
                    value={conditions.investmentAmountDisplay}
                    className="mt-1 border-[#b0bec5] bg-[#f0f4fa] text-[#3E4A59] font-semibold cursor-default"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#3E4A59]">Zinssatz p.a.*</Label>
                  <Input
                    readOnly
                    tabIndex={-1}
                    value={conditions.interestRate}
                    className="mt-1 border-[#b0bec5] bg-[#f0f4fa] text-[#3E4A59] font-semibold cursor-default"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#3E4A59]">Laufzeit*</Label>
                  <Input
                    readOnly
                    tabIndex={-1}
                    value={conditions.term}
                    className="mt-1 border-[#b0bec5] bg-[#f0f4fa] text-[#3E4A59] font-semibold cursor-default"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-[#3E4A59]">Willkommensbonus (in EUR)*</Label>
                  <Input
                    readOnly
                    tabIndex={-1}
                    value={conditions.welcomeBonus}
                    className="mt-1 border-[#b0bec5] bg-[#f0f4fa] text-[#3E4A59] font-semibold cursor-default"
                  />
                </div>
              </div>

              <div className="border-t border-[#b0bec5] pt-4">
                <Label className="text-xs font-bold text-[#3E4A59] mb-3 block">Zinsgutschrift:*</Label>
                <RadioGroup
                  value={formData.interestPayment}
                  onValueChange={(val) => handleInputChange('interestPayment', val)}
                  className="flex flex-wrap gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="quarterly" id="fest-quarterly" />
                    <Label htmlFor="fest-quarterly" className="cursor-pointer text-sm text-[#3E4A59]">vierteljährlich</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="semi-annual" id="fest-semi-annual" />
                    <Label htmlFor="fest-semi-annual" className="cursor-pointer text-sm text-[#3E4A59]">halbjährlich</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="maturity" id="fest-maturity" />
                    <Label htmlFor="fest-maturity" className="cursor-pointer text-sm text-[#3E4A59]">am Laufzeitende</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <div className="bg-[#f0f4fa] border border-[#b0bec5] p-4 text-xs text-[#3a5070] leading-relaxed mb-4">
            Bitte beachten Sie, dass der Mindestanlagebetrag <strong>10.000,00 EUR</strong> und der maximale Anlagebetrag <strong>1.000.000,00 EUR</strong> beträgt.
            Die Festgeldanlage erfolgt für die vertraglich vereinbarte Laufzeit als fest angelegte Anlage.
            Eine vorzeitige Verfügung über den Anlagebetrag ist während der gesamten Laufzeit grundsätzlich ausgeschlossen.
            Nach Ablauf der Laufzeit werden Kapital und Zinsen automatisch auf das von Ihnen benannte Referenzkonto überwiesen.
          </div>

          <div className="border-l-4 border-[#c4a235] bg-[#fdf8e8] p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#c4a235] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#5a4a10] leading-relaxed">
              <strong className="text-[#3a3000]">Wichtiger Hinweis:</strong> Die Gewährung des Willkommensbonus setzt voraus, dass zum Zeitpunkt der Kontoeröffnung keine bestehende Geschäftsbeziehung in Form eines Kontos bei der Knab B.V. vorliegt. Der Bonus wird ausschließlich Neukunden gewährt, die bislang kein Konto bei der Knab B.V. unterhalten haben. Bestehende oder ehemalige Kontoverbindungen können zum Ausschluss von der Bonusgewährung führen.
            </p>
          </div>
        </section>

        {/* Section 3: Referenzkonto */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-7 h-7 bg-[#3E4A59] text-white rounded flex items-center justify-center font-bold text-xs">3</span>
            <h3 className="text-[15px] font-bold text-[#3E4A59] uppercase tracking-wide">Angaben zum Referenzkonto für Zins- und Rückzahlung</h3>
            <div className="flex-1 h-px bg-[#3E4A59]/20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="font-semibold text-bank-primary">Kontoinhaber *</Label>
              <Input
                value={formData.accountHolder}
                onChange={(e) => handleInputChange('accountHolder', e.target.value)}
                className="mt-1"
                data-testid="input-account-holder"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="font-semibold text-bank-primary">IBAN *</Label>
              <Input
                value={formData.iban}
                onChange={(e) => handleInputChange('iban', e.target.value)}
                placeholder="DE__ ____ ____ ____ ____ __"
                className="mt-1 font-mono tracking-wider"
                data-testid="input-iban"
              />
            </div>
            <div>
              <Label className="font-semibold text-bank-primary">BIC *</Label>
              <Input
                value={formData.bic}
                onChange={(e) => handleInputChange('bic', e.target.value)}
                className="mt-1 font-mono"
                data-testid="input-bic"
              />
            </div>
            <div>
              <Label className="font-semibold text-bank-primary">Kreditinstitut</Label>
              <Input
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                className="mt-1"
                data-testid="input-bank-name"
              />
            </div>
          </div>
        </section>

        <div className="bg-[#f0f4fa] border border-[#b0bec5] p-4 mb-10 flex gap-3">
          <Info className="w-5 h-5 text-[#3E4A59] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#3a5070] leading-relaxed">
            Das Referenzkonto dient als Abwicklungskonto für die Festgeldanlage. Über dieses Konto erfolgen sowohl die Einzahlung des Anlagebetrags als auch die Auszahlung der Zinsen und die Rückführung des Kapitals bei Fälligkeit. Auszahlungen werden ausschließlich auf das hinterlegte Referenzkonto vorgenommen.
          </p>
        </div>

        {/* Section 4: Allgemeine Vertragsbedingungen — Festgeld */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-7 h-7 bg-[#3E4A59] text-white rounded flex items-center justify-center font-bold text-xs">4</span>
            <h3 className="text-[15px] font-bold text-[#3E4A59] uppercase tracking-wide">Allgemeine Vertragsbedingungen</h3>
            <div className="flex-1 h-px bg-[#3E4A59]/20" />
          </div>

          <div className="space-y-2 text-[12px] text-gray-600 print-terms-columns">
            {[
              { title: '§ 1 Vertragsgegenstand', content: 'Der Anleger legt über den Vermittler Kapitalmitte bei der Bank einen Festgeldbetrag für die vertraglich vereinbarte Laufzeit zu einem festen Zinssatz an. Während der gesamten Laufzeit ist der Anlagebetrag fest gebunden und kann grundsätzlich nicht vorzeitig verfügt werden.' },
              { title: '§ 2 Zustandekommen des Vertrags', content: 'Der Vertrag kommt zustande, indem der Kunde ein bindendes Angebot durch Unterzeichnung des Antrags abgibt. Der Vertrag wird wirksam, sobald das Angebot geprüft, gegengezeichnet und der Anlagebetrag eingezahlt wurde.' },
              { title: '§ 3 Legitimationsprüfung', content: 'Die Bank überprüft die Identität des Anlegers gemäß GwG. Die Identifikation erfolgt durch einen amtlichen Lichtbildausweis (Personalausweis oder Reisepass); bei juristischen Personen sind Handelsregisterauszüge und Vertretungsnachweise vorzulegen.' },
              { title: '§ 4 Zinsen und Verzinsung', content: 'Der Festgeldbetrag wird für die gesamte vertragliche Laufzeit zu dem im Antrag vereinbarten festen Zinssatz verzinst. Dieser Zinssatz ist während der gesamten Laufzeit garantiert und unabhängig von Marktzinsschwankungen. Die Zinsberechnung erfolgt auf Basis von 365 Tagen pro Jahr (act/365).' },
              { title: '§ 5 Auszahlung und Fälligkeit', content: 'Die Zinsen und das angelegte Kapital werden bei Fälligkeit dem im Vertrag benannten Referenzkonto gutgeschrieben. Sofern eine jährliche Zinsgutschrift vereinbart wurde, werden die Zinsen jeweils zum Jahrestag der Anlage auf das Referenzkonto überwiesen. Eine automatische Verlängerung der Festgeldanlage findet nicht statt.' },
              { title: '§ 6 Vorzeitige Freigabe', content: 'Eine vorzeitige Verfügung über das Festgeld ist während der gesamten Laufzeit grundsätzlich ausgeschlossen. In begründeten Ausnahmefällen kann die Bank auf Antrag des Anlegers eine vorzeitige Freigabe gewähren. In diesem Fall wird ein reduzierter Zinssatz angewendet, der deutlich unter dem vertraglich vereinbarten Zinssatz liegt.' },
              { title: '§ 7 Widerrufsrecht', content: 'Der Anleger kann seine Vertragserklärung innerhalb von 14 Tagen ohne Angabe von Gründen in Textform widerrufen. Die Frist beginnt nach Erhalt des Vertrags und aller vertragsrelevanten Informationen. Zur Wahrung der Frist genügt die rechtzeitige Absendung des Widerrufs an kundenservice@kapitalmitte.com.' },
              { title: '§ 8 Folgen des Widerrufs', content: 'Im Falle eines wirksamen Widerrufs sind die beiderseits empfangenen Leistungen zurückzugewähren. Die Bank erstattet alle Zahlungen unverzüglich, spätestens innerhalb von 14 Tagen. Bereits gutgeschriebene Zinsen werden anteilig berechnet und ausgezahlt.' },
              { title: '§ 9 Einlagensicherung', content: 'Die Einlagen bei der Bank sind durch die gesetzliche Einlagensicherung bis zu 100.000 € pro Kunde und Kreditinstitut abgesichert; bei Gemeinschaftskonten beträgt die Absicherung 200.000 €. Die Bank ist Mitglied im Einlagensicherungsfonds des Bundesverbandes deutscher Banken e.V.' },
              { title: '§ 10 Steuerliche Behandlung', content: 'Kapitalerträge unterliegen der Abgeltungssteuer in Höhe von 25 % zuzüglich Solidaritätszuschlag (5,5 %) sowie gegebenenfalls Kirchensteuer. Die Bank führt Steuern automatisch ab, sofern kein ausreichender Freistellungsauftrag oder eine NV-Bescheinigung vorliegt. Der Sparer-Pauschbetrag beträgt 1.000 € für Alleinstehende bzw. 2.000 € für Verheiratete.' },
              { title: '§ 11 Datenschutz', content: 'Die Bank verarbeitet personenbezogene Daten zur Vertragserfüllung sowie zur Erfüllung gesetzlicher Pflichten, insbesondere nach GwG, KWG und steuerrechtlichen Vorschriften. Es gelten die Bestimmungen der DSGVO und des BDSG. Der Anleger hat das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung sowie Datenübertragbarkeit.' },
              { title: '§ 12 Preise und Kosten', content: 'Die Einrichtung und Führung des Festgeldkontos ist gebührenfrei.' },
              { title: '§ 13 Erfüllungsort, Gerichtsstand', content: 'Es gilt ausschließlich deutsches Recht. Erfüllungsort und Gerichtsstand ist Amsterdam, soweit gesetzlich zulässig.' },
              { title: '§ 14 Vertragssprache', content: 'Vertragssprache ist Deutsch. Neben diesen Bedingungen gelten die Allgemeinen Geschäftsbedingungen der Knab B.V. sowie die Sonderbedingungen für den Zahlungsverkehr; bei Widersprüchen haben diese Festgeldbedingungen Vorrang.' },
              { title: '§ 15 Bestätigung des Anlegers', content: 'Der Anleger versichert, die Geschäftsbeziehung ausschließlich im eigenen wirtschaftlichen Interesse zu begründen. Änderungen zu persönlichen Angaben oder zur Eigentums- und Kontrollstruktur sind unverzüglich mitzuteilen, insbesondere gemäß § 11 Abs. 6 GwG.' },
            ].map((item, idx) => (
              <div key={idx} className="pb-1 border-b border-gray-100 print-term-item">
                <h4 className="text-[11px] font-bold text-[#3E4A59] mb-0">{item.title}</h4>
                <p className="leading-tight text-[10px]">{item.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Bestätigungen und Erklärungen */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-7 h-7 bg-[#3E4A59] text-white rounded flex items-center justify-center font-bold text-xs">5</span>
            <h3 className="text-[15px] font-bold text-[#3E4A59] uppercase tracking-wide">Bestätigungen und Erklärungen</h3>
            <div className="flex-1 h-px bg-[#3E4A59]/20" />
          </div>

          <div className="border border-[#a8bed3] rounded-lg mb-6 print-break-avoid">
            <div className="px-5 pt-4 pb-2">
              <h4 className="text-[13px] font-bold text-[#3E4A59]">Empfangs- und Kenntnisnahmebestätigung</h4>
            </div>
            <div className="px-5 pb-1">
              <p className="text-[11px] text-gray-400 mb-3">Bitte Zutreffendes ankreuzen:</p>
            </div>
            <div className="divide-y divide-[#e2e8f0]">
              {[
                { key: 'withdrawalRightAccepted', text: 'Ich bestätige den Erhalt und die Kenntnisnahme der Widerrufsbelehrung.' },
                { key: 'depositProtectionAccepted', text: 'Ich bestätige den Erhalt und die Kenntnisnahme der Informationen zur Einlagensicherung.' },
                { key: 'productInfoAccepted', text: 'Ich bestätige den Erhalt und die Kenntnisnahme der Produktinformationen.' },
                { key: 'agbAccepted', text: 'Ich bestätige den Erhalt und die Kenntnisnahme der Allgemeinen Geschäftsbedingungen (AGB).' },
              ].map((item) => (
                <div
                  key={item.key}
                  role="checkbox"
                  aria-checked={formData[item.key]}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleCheckboxChange(item.key)}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleCheckboxChange(item.key); } }}
                  tabIndex={0}
                >
                  <Checkbox
                    checked={formData[item.key]}
                    className="mt-0.5 pointer-events-none"
                    tabIndex={-1}
                    data-testid={`checkbox-${item.key}`}
                  />
                  <span className="text-[12px] text-gray-700 leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#a8bed3] rounded-lg mb-6 print-break-avoid">
            <div className="px-5 pt-4 pb-2">
              <h4 className="text-[13px] font-bold text-[#3E4A59]">Datenschutz, Datenverarbeitungsklausel</h4>
            </div>
            <div
              role="checkbox"
              aria-checked={formData.privacyAccepted}
              className="flex items-start gap-3 px-5 pb-5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleCheckboxChange('privacyAccepted')}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleCheckboxChange('privacyAccepted'); } }}
              tabIndex={0}
            >
              <Checkbox
                checked={formData.privacyAccepted}
                className="mt-1 flex-shrink-0 pointer-events-none"
                tabIndex={-1}
                data-testid="checkbox-privacyAccepted"
              />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Ich bestätige, die Datenschutzhinweise der Bank (abrufbar unter www.knab.nl/datenschutz) zur Kenntnis genommen zu haben und willige ein, dass meine personenbezogenen Daten im Einklang mit den Bestimmungen der Datenschutz-Grundverordnung (DSGVO) sowie des Bundesdatenschutzgesetzes (BDSG) zum Zwecke der Durchführung und Abwicklung der Geschäftsbeziehung, insbesondere der Kontoführung, sowie zur Erfüllung gesetzlicher Verpflichtungen, insbesondere nach geldwäscherechtlichen Vorschriften, verarbeitet werden. Mir ist bekannt, dass eine Übermittlung meiner personenbezogenen Daten an Dritte nur erfolgt, soweit dies zur Durchführung dieses Vertrages erforderlich ist, eine gesetzliche Verpflichtung besteht oder ich ausdrücklich eingewilligt habe.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Unterschriften */}
        <section className="mb-10 print-signatures-section">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-7 h-7 bg-[#3E4A59] text-white rounded flex items-center justify-center font-bold text-xs">6</span>
            <h3 className="text-[15px] font-bold text-[#3E4A59] uppercase tracking-wide">Unterschriften</h3>
            <div className="flex-1 h-px bg-[#3E4A59]/20" />
          </div>

          {/* Erster Anleger */}
          <div className="mb-8 print-signature-block print-break-avoid">
            <h4 className="text-[13px] font-bold text-[#3E4A59] mb-3">Erster Anleger</h4>
            <div className="border border-[#a8bed3] rounded bg-[#f6f9fc] p-5 md:p-6">
              <p className="text-[12px] text-[#2c4a6e] leading-relaxed mb-4">
                Mit seiner Unterschrift bestätigt der Kunde die Richtigkeit und Vollständigkeit der gemachten Angaben sowie die Kenntnisnahme und rechtsverbindliche Anerkennung sämtlicher vorstehender Vertragsbedingungen.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div>
                  <Input
                    value={formData.sig1_date}
                    onChange={(e) => handleInputChange('sig1_date', e.target.value)}
                    className="border-0 border-b border-[#2c4a6e] rounded-none bg-transparent px-0 h-8 text-[13px] text-[#3E4A59] focus-visible:ring-0 focus-visible:border-[#3E4A59]"
                  />
                  <p className="text-[11px] text-[#7a8da6] mt-1.5 tracking-wide">Ort, Datum</p>
                </div>
                <div>
                  <SignaturePad
                    label="Unterschrift | Erster Anleger"
                    value={formData.sig1_image}
                    onChange={(value) => handleInputChange('sig1_image', value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Zweiter Anleger */}
          <div className="mb-8 print-signature-block print-break-avoid">
            <h4 className="text-[13px] font-bold text-[#3E4A59] mb-3">Zweiter Anleger bzw. Bevollmächtigte Person</h4>
            <div className="border border-[#a8bed3] rounded bg-[#f6f9fc] p-5 md:p-6">
              <p className="text-[12px] text-[#2c4a6e] leading-relaxed mb-1">
                Mit seiner Unterschrift bestätigt der Kunde bzw. der Bevollmächtigte die Richtigkeit und Vollständigkeit der gemachten Angaben sowie die Kenntnisnahme und rechtsverbindliche Anerkennung sämtlicher vorstehender Vertragsbedingungen.
              </p>
              <p className="text-[12px] text-[#2c4a6e] leading-relaxed mb-4">
                Im Falle einer Vertretung erfolgt die Unterzeichnung im Rahmen der erteilten Vertretungsbefugnis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div>
                  <Input
                    value={formData.sig2_date}
                    onChange={(e) => handleInputChange('sig2_date', e.target.value)}
                    className="border-0 border-b border-[#2c4a6e] rounded-none bg-transparent px-0 h-8 text-[13px] text-[#3E4A59] focus-visible:ring-0 focus-visible:border-[#3E4A59]"
                  />
                  <p className="text-[11px] text-[#7a8da6] mt-1.5 tracking-wide">Ort, Datum</p>
                </div>
                <div>
                  <SignaturePad
                    label="Unterschrift | Zweiter Anleger bzw. Bevollmächtigte Person"
                    value={formData.sig2_image}
                    onChange={(value) => handleInputChange('sig2_image', value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Aufnahmebestätigung Knab B.V. */}
          <div className="print-signature-block print-break-avoid">
          <h4 className="text-[15px] font-bold text-[#3E4A59] mb-3">Aufnahmebestätigung der Knab B.V.</h4>
          <div className="border border-[#a8bed3] rounded bg-[#f6f9fc] p-5 md:p-6">
              <p className="text-[12px] text-[#2c4a6e] leading-relaxed mb-4">
              Die Knab B.V. bestätigt hiermit die Annahme des Kundenantrags. Die Begründung der Geschäftsbeziehung erfolgt vorbehaltlich der abschließenden Prüfung sämtlicher erforderlicher Unterlagen sowie der Einhaltung gesetzlicher und aufsichtsrechtlicher Anforderungen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <div>
                <div className="h-8 border-b border-[#2c4a6e]" />
                <p className="text-[11px] text-[#7a8da6] mt-1.5 tracking-wide">Ort, Datum</p>
              </div>
              <div>
                <div className="h-8 border-b border-[#2c4a6e]" />
                <p className="text-[11px] text-[#7a8da6] mt-1.5 tracking-wide">Unterschrift | Knab B.V.</p>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 pt-4 border-t-2 border-[#3E4A59]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] text-[#7a8da6] leading-relaxed max-w-[500px]">
                Knab B.V. · Thomas R. Malthusstraat 1-3 · 1066 JR Amsterdam · Niederlande · KvK-Nr.: 30100799
              </p>
              <p className="text-[9px] text-[#3E4A59] font-semibold mt-1">Festgeldvertrag</p>
            </div>
            <p className="text-[9px] text-[#7a8da6]">BBV {new Date().toLocaleDateString('de-DE')}</p>
          </div>
        </footer>

        </div>{/* end px-6 wrapper */}

        {/* Action Buttons (no-print) */}
        <div className="no-print px-6 md:px-10 pb-8 pt-6 border-t bg-[#f8fafd]">
          <div className="bg-bank-bg p-5 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <Send className="w-5 h-5 text-bank-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-bank-primary">Online einreichen</p>
                <p className="text-xs text-gray-500 mt-1">
                  Nach dem Absenden wird Ihr Antrag an unser Team weitergeleitet. Sie erhalten keine automatische
                  E-Mail-Bestätigung — wir melden uns bei Ihnen, sobald die Prüfung abgeschlossen ist.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
              data-testid="btn-print"
              disabled={submitting}
            >
              <Printer className="w-4 h-4" />
              Formular drucken
            </Button>
            <Button
              disabled={!allConfirmationsAccepted || submitting}
              onClick={handleSubmit}
              className="bg-bank-ink hover:bg-bank-ink-hover flex items-center gap-2 text-white"
              data-testid="btn-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird versendet...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {allConfirmationsAccepted ? 'Antrag einreichen' : 'Bitte alle Bestätigungen ankreuzen'}
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      <div className="no-print">
      </div>
    </div>
  );
};

export default KnabFestgeldVertrag;
