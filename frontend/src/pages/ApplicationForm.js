import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import {
  User, Building2, FileText, CheckCircle,
  ArrowLeft, ArrowRight, Loader2, Upload, Trash2, AlertCircle, Sparkles, X
} from 'lucide-react';
import { uploadDocumentToCloudinary } from '@/lib/cloudinary';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { logVisitorConversion } from '@/lib/logVisitorConversion';
// Session 82.101 · Supabase entfernt · Applications Persistenz + Mail-Dispatch
// nutzen ausschließlich das FastAPI-Backend. Legacy `supabase.from('applications')`
// und `supabase.functions.invoke('send-application-email')` sind blockiert, bis ein
// sicherer Backend-Endpoint verfügbar ist (BLOCKED_SAFE_BACKEND_MISSING).

import { useAuth } from '@/context/AuthContext';
import IdentityInterviewFlow from '@/components/liveness/IdentityInterviewFlow';
import AddressFields from '@/components/profile/AddressFields';
import NationalitySelect from '@/components/profile/NationalitySelect';
import PhoneNumberInput from '@/components/profile/PhoneNumberInput';
import { getDialCodeForCountry } from '@/constants/phoneDialCodes';
import { getCountryForNationality, getNationalityForCountry } from '@/constants/countries';
import {
  combinePhoneNumber,
  phoneFormFromProfile,
  validatePhoneLocal,
} from '@/lib/phoneNumber';
import { validatePersonName } from '@/lib/personName';
import { sanitizeFormField } from '@/lib/formInputSanitize';
import {
  addressFromProfile,
  buildFullAddress,
  validateAddressForm,
} from '@/lib/profileAddress';
import {
  isAtLeast18,
  maxBirthDateForMinimumAge,
  UNDER_AGE_MESSAGE,
} from '@/lib/ageValidation';
import TaxIdInput, { validateEuropeanTaxId } from '@/components/profile/TaxIdInput';

const steps = [
  { number: 1, title: 'Persönliche Daten', icon: User },
  { number: 2, title: 'Anlageinformationen', icon: Building2 },
  { number: 3, title: 'Dokumente', icon: FileText },
  { number: 4, title: 'Bestätigung', icon: CheckCircle },
];

const ApplicationForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const preselectedOffer = location.state?.offer || null;
  const statePrefill = location.state?.prefill || null;

  // URL query params fallback (bookmarkable / shareable deep links)
  //   /apply?amount=10000&term=12&rate=3.5&bank=BBVA
  const urlPrefill = useMemo(() => {
    const q = new URLSearchParams(location.search);
    const out = {};
    const amount = q.get('amount');
    const term = q.get('term');
    const rate = q.get('rate');
    const bank = q.get('bank');
    if (amount) out.investment_amount = Number(amount);
    if (term) out.term_months = Number(term);
    if (rate) out.interest_rate = Number(rate);
    if (bank) out.bank_name = bank;
    return Object.keys(out).length > 0 ? out : null;
  }, [location.search]);

  // Resolved investment prefill — precedence: state.prefill > offer > URL
  const investmentPrefill = {
    bank_name: statePrefill?.bank_name ?? preselectedOffer?.bank_name ?? urlPrefill?.bank_name ?? '',
    investment_amount:
      statePrefill?.investment_amount ?? urlPrefill?.investment_amount ?? '',
    term_months:
      statePrefill?.term_months ?? preselectedOffer?.deposit_term ?? urlPrefill?.term_months ?? '',
    interest_rate:
      statePrefill?.interest_rate ?? preselectedOffer?.interest_rate ?? urlPrefill?.interest_rate ?? '',
  };

  const prefillSource =
    statePrefill?.source ||
    (preselectedOffer ? 'offer' : null) ||
    (urlPrefill ? 'link' : null);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [prefilledBanner, setPrefilledBanner] = useState(!!prefillSource);
  const [isIdentityFlowOpen, setIsIdentityFlowOpen] = useState(false);
  const [isIdentityInterviewCompleted, setIsIdentityInterviewCompleted] = useState(false);
  const [isLivenessVerified, setIsLivenessVerified] = useState(false);
  const [identitySessionData, setIdentitySessionData] = useState(null);

  const [personalData, setPersonalData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    birth_date: '',
    email: user?.email || '',
    nationality: user?.country ? getNationalityForCountry(user.country) : '',
    ...phoneFormFromProfile(user),
    ...addressFromProfile(user),
  });

  // Keep personal fields in sync if user loads async (e.g. profile fetch finishes later)
  useEffect(() => {
    const phoneFields = phoneFormFromProfile(user);
    setPersonalData((prev) => ({
      ...prev,
      first_name: prev.first_name || user?.first_name || '',
      last_name: prev.last_name || user?.last_name || '',
      email: prev.email || user?.email || '',
      nationality: prev.nationality || (user?.country ? getNationalityForCountry(user.country) : ''),
      phone_dial_code: prev.phone_local ? prev.phone_dial_code : (prev.phone_dial_code || phoneFields.phone_dial_code),
      phone_local: prev.phone_local || phoneFields.phone_local,
      ...addressFromProfile(user),
    }));
  }, [user]);

  const [investmentData, setInvestmentData] = useState({
    bank_name: investmentPrefill.bank_name || '',
    investment_amount: investmentPrefill.investment_amount || '',
    term_months: investmentPrefill.term_months || '',
    interest_rate: investmentPrefill.interest_rate || '',
    tax_id: '',
    purpose: '',
  });

  const [documents, setDocuments] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const passportDocument = useMemo(
    () => documents.find((doc) => doc.type === 'id_document') || null,
    [documents],
  );

  const handlePersonalChange = (field, value) => {
    setPersonalData((prev) => ({ ...prev, [field]: sanitizeFormField(field, value) }));
  };

  const handleInvestmentChange = (field, value) => {
    setInvestmentData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = useCallback(async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Ungültiger Dateityp. Erlaubt: PDF, JPG, PNG');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Datei zu groß. Maximal 10MB erlaubt.');
      return;
    }

    setUploadingDoc(true);
    try {
      const result = await uploadDocumentToCloudinary(file, docType);
      setDocuments(prev => [...prev, {
        type: docType,
        url: result.url,
        name: result.name,
        uploaded_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Fehler beim Hochladen der Datei. Bitte versuchen Sie es erneut.');
    } finally {
      setUploadingDoc(false);
    }
  }, []);

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const isBirthDateValid = personalData.birth_date && isAtLeast18(personalData.birth_date);

  const validateStep1 = () => {
    const { first_name, last_name, birth_date, email, nationality } = personalData;
    const firstNameCheck = validatePersonName(first_name, { label: 'Vorname' });
    if (!firstNameCheck.ok) return false;
    const lastNameCheck = validatePersonName(last_name, { label: 'Nachname' });
    if (!lastNameCheck.ok) return false;
    const addressCheck = validateAddressForm(personalData);
    const phoneCheck = validatePhoneLocal(personalData.phone_local, { required: true });
    return (
      firstNameCheck.ok &&
      lastNameCheck.ok &&
      birth_date &&
      isAtLeast18(birth_date) &&
      phoneCheck.ok &&
      email &&
      nationality &&
      addressCheck.ok
    );
  };

  const validateStep2 = () => {
    const { bank_name, investment_amount, term_months, tax_id } = investmentData;
    const taxCheck = validateEuropeanTaxId(tax_id, getCountryForNationality(personalData.nationality), { required: true });
    return bank_name && investment_amount >= 1000 && term_months > 0 && taxCheck.ok;
  };

  const validateStep3 = () => documents.some(doc => doc.type === 'id_document');

  const validateStep4 = () => termsAccepted && privacyAccepted;

  const canProceed = () => {
    switch (currentStep) {
      case 1: return validateStep1();
      case 2: return validateStep2();
      case 3: return validateStep3();
      case 4: return validateStep4();
      default: return false;
    }
  };

  // Anfrage an /api/applications (nicht mehr direkter Supabase-Insert)
  // Früher: direktes supabase.from('applications').insert()
  // Dadurch wurde das Backend nicht ausgelöst und keine E-Mails versendet.
  const handleSubmit = async () => {
    if (!canProceed()) return;
    setIsSubmitting(true);
    setSubmitError('');

    const identityVerification = identitySessionData
      ? {
          success_title: identitySessionData.success_title || 'Ihre Identifizierung war erfolgreich',
          success_message: identitySessionData.success_message || 'Die Video-Identifizierung wurde lokal erfolgreich abgeschlossen.',
          completed_at: identitySessionData.completedAt,
          video_id: identitySessionData.video_id,
          ai_answers: identitySessionData.answers || {},
          liveness_verified: true,
          interview_completed: true,
        }
      : null;

    try {
      const taxCheck = validateEuropeanTaxId(investmentData.tax_id, getCountryForNationality(personalData.nationality), { required: true });
      // Session 82.101 · Applications-Insert bewusst blockiert bis sicherer FastAPI-Endpoint bereit steht.
      toast.error('Antragseinreichung ist aktuell deaktiviert (BLOCKED_SAFE_BACKEND_MISSING · 82.101). Bitte kontaktieren Sie den Kundenservice.');
      setSubmitError('Antragseinreichung ist aktuell deaktiviert.');
      setIsSubmitting(false);
      return;

      // eslint-disable-next-line no-unreachable
      const data = { id: null };
      // eslint-disable-next-line no-unreachable
      const error = null;

      if (error) throw new Error(error.message || 'Antrag konnte nicht eingereicht werden.');

      // Fire-and-observe mail dispatch. Do not fail application creation if email fails:
      // retry is handled by the outbox table in the edge function.
      try {
        // Session 82.101 · Edge-Function-Invoke entfernt; E-Mail-Dispatch würde
        // serverseitig nach persistenter Anlage triggern.
        const mailError = null;
        if (mailError) {
          console.warn('[send-application-email] disabled 82.101');
        }
      } catch (invokeErr) {
        console.warn('[send-application-email] invoke exception:', invokeErr);
        toast.warning('Antrag gespeichert. E-Mail-Versand wird im Hintergrund erneut versucht.');
      }

      setApplicationId(data.id);
      setSubmitSuccess(true);
      logEvent(EVENTS.APPLICATION_SUBMIT, {
        application_id: data.id,
        bank: investmentData?.selectedBank || null,
        amount: investmentData?.amount || null,
        product: investmentData?.productType || null,
      });
      logVisitorConversion('application_submit', {
        application_id: data.id,
        bank: investmentData?.selectedBank || null,
      });
      toast.success('Antrag erfolgreich eingereicht!');
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmitClick = () => {
    if (!canProceed() || isSubmitting) return;
    if (!passportDocument) {
      toast.error('Bitte laden Sie zuerst Ihren Reisepass oder Ausweis hoch.');
      return;
    }
    if (!isIdentityInterviewCompleted || !isLivenessVerified) {
      setIsIdentityFlowOpen(true);
      return;
    }
    handleSubmit();
  };

  useEffect(() => {
    setIdentitySessionData(null);
    setIsIdentityInterviewCompleted(false);
    setIsLivenessVerified(false);
  }, [passportDocument?.url]);

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-bank-bg">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-bank-border p-10">
            <div className="w-20 h-20 bg-bank-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-bank-success" />
            </div>
            <h2 className="text-2xl font-bold text-bank-text mb-3">Antrag erfolgreich eingereicht!</h2>
            <p className="text-bank-text-muted mb-4">
              Vielen Dank für Ihren Festgeldantrag. Wir haben Ihnen eine Bestätigung per E-Mail gesendet.
            </p>
            {applicationId && (
              <div className="bg-bank-bg rounded-xl px-6 py-4 mb-6 inline-block">
                <p className="text-sm text-bank-text-muted mb-1">Ihre Antragsnummer</p>
                <p className="text-lg font-mono font-bold text-bank-text">
                  {applicationId.slice(0, 8).toUpperCase()}
                </p>
              </div>
            )}
            <p className="text-sm text-bank-text-muted mb-8">
              Unser Team wird Ihren Antrag prüfen und sich innerhalb von 1–2 Werktagen bei Ihnen melden.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-bank-ink hover:bg-bank-ink-hover text-white rounded-xl"
              >
                Zum Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="rounded-xl"
              >
                Zur Startseite
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const docTypes = [
    { key: 'id_document', label: 'Personalausweis / Reisepass *', required: true },
    { key: 'address_proof', label: 'Adressnachweis', required: false },
    { key: 'income_proof', label: 'Einkommensnachweis', required: false },
  ];

  return (
    <div className="min-h-screen bg-bank-bg" translate="no">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;
            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-bank-success/100 text-white' :
                      isActive ? 'bg-bank-ink text-white' :
                        'bg-bank-border/25 text-bank-text-muted/70'}`}>
                    {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block
                    ${isActive ? 'text-bank-accent' : isCompleted ? 'text-bank-success' : 'text-bank-text-muted/70'}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all
                    ${currentStep > step.number ? 'bg-bank-success/70' : 'bg-bank-border/25'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-bank-border p-6 sm:p-8">
          {/* Step 1 — Persönliche Daten */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-bank-text mb-6">Persönliche Daten</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vorname *</Label>
                  <Input value={personalData.first_name} onChange={e => handlePersonalChange('first_name', e.target.value)} placeholder="z.B. Max" className="mt-1" />
                </div>
                <div>
                  <Label>Nachname *</Label>
                  <Input value={personalData.last_name} onChange={e => handlePersonalChange('last_name', e.target.value)} placeholder="z.B. Mustermann" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>E-Mail-Adresse *</Label>
                <Input type="email" value={personalData.email} onChange={e => handlePersonalChange('email', e.target.value)} placeholder="z.B. max@mustermann.de" className="mt-1" />
              </div>
              <div>
                <Label>Geburtsdatum *</Label>
                <DatePicker
                  date={personalData.birth_date}
                  setDate={(date) => handlePersonalChange('birth_date', date)}
                  maxDate={maxBirthDateForMinimumAge()}
                />
                {personalData.birth_date && !isBirthDateValid && (
                  <p className="mt-1.5 text-xs text-bank-error flex items-center gap-1">
                    <AlertCircle size={14} /> {UNDER_AGE_MESSAGE}
                  </p>
                )}
              </div>
              <div>
                <Label>Telefonnummer *</Label>
                <PhoneNumberInput
                  dialCode={personalData.phone_dial_code}
                  localNumber={personalData.phone_local}
                  onDialCodeChange={(value) => handlePersonalChange('phone_dial_code', value)}
                  onLocalNumberChange={(value) => handlePersonalChange('phone_local', value)}
                  className="mt-1"
                  selectClassName="h-10 w-[5.65rem] shrink-0 appearance-none rounded-md border border-bank-border bg-white pl-1.5 pr-5 text-sm tabular-nums text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                  inputClassName="h-10 min-w-0 flex-1 rounded-md border border-bank-border focus-visible:ring-2 focus-visible:ring-bank-primary/25"
                  localPlaceholder="30 123456"
                />
              </div>
              <div>
                <Label className="mb-2 block">Adresse *</Label>
                <AddressFields
                  value={personalData}
                  onChange={(next) => setPersonalData((prev) => ({ ...prev, ...next }))}
                  startNum={null}
                  showLine2
                  inputClassName="mt-1 h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-bank-primary/25"
                />
              </div>
              <div>
                <Label>Staatsangehörigkeit *</Label>
                <NationalitySelect
                  value={personalData.nationality}
                  onChange={(value) => {
                    setPersonalData((prev) => ({
                      ...prev,
                      nationality: value,
                      phone_dial_code: value ? getDialCodeForCountry(getCountryForNationality(value)) : prev.phone_dial_code,
                    }));
                  }}
                  required
                />
              </div>
            </div>
          )}

          {/* Step 2 — Anlageinformationen */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-bank-text mb-6">Anlageinformationen</h2>

              {prefilledBanner && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-bank-accent/30 bg-bank-accent/10 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles size={18} className="text-bank-accent mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-bank-text">
                        {prefillSource === 'calculator'
                          ? 'Werte aus dem Zinsrechner übernommen'
                          : prefillSource === 'offer'
                          ? 'Werte aus dem ausgewählten Angebot übernommen'
                          : 'Werte aus dem Link übernommen'}
                      </p>
                      <p className="mt-0.5 text-xs text-bank-text-muted">
                        Bitte prüfen und bei Bedarf anpassen.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrefilledBanner(false)}
                    aria-label="Hinweis schließen"
                    className="shrink-0 p-1 text-bank-text-muted/70 hover:text-bank-text"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div>
                <Label>Bank *</Label>
                <Input value={investmentData.bank_name} onChange={e => handleInvestmentChange('bank_name', e.target.value)} placeholder="z.B. BBVA Bank" className="mt-1" />
              </div>
              <div>
                <Label>Anlagebetrag (€) *</Label>
                <Input
                  type="number"
                  value={String(investmentData.investment_amount)}
                  onChange={e => handleInvestmentChange('investment_amount', e.target.value)}
                  placeholder="z.B. 10000"
                  min="1000"
                  className="mt-1"
                />
                <p className="text-xs text-bank-text-muted/70 mt-1">Mindestbetrag: 1000 €</p>
              </div>
              <div>
                <Label>Laufzeit (Monate) *</Label>
                <Input
                  type="number"
                  value={String(investmentData.term_months)}
                  onChange={e => handleInvestmentChange('term_months', e.target.value)}
                  placeholder="z.B. 12"
                  min="1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Zinssatz (%)</Label>
                <Input
                  type="number"
                  value={String(investmentData.interest_rate)}
                  onChange={e => handleInvestmentChange('interest_rate', e.target.value)}
                  placeholder="z.B. 3.50"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Steuer-ID *</Label>
                <TaxIdInput
                  value={investmentData.tax_id}
                  onChange={(value) => handleInvestmentChange('tax_id', value)}
                  country={getCountryForNationality(personalData.nationality)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Verwendungszweck</Label>
                <Input value={investmentData.purpose} onChange={e => handleInvestmentChange('purpose', e.target.value)} placeholder="z.B. Altersvorsorge, Vermögensaufbau..." className="mt-1" />
              </div>
            </div>
          )}

          {/* Step 3 — Dokumente */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-bank-text mb-2">Dokumente hochladen</h2>
              <p className="text-sm text-bank-text-muted mb-4">Bitte laden Sie die erforderlichen Dokumente hoch. Erlaubte Formate: PDF, JPG, PNG (max. 10 MB).</p>

              {docTypes.map(({ key, label, required }) => {
                const uploaded = documents.find(d => d.type === key);
                return (
                  <div key={key} className="border border-bank-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">{label}</Label>
                      {uploaded && (
                        <button onClick={() => removeDocument(documents.findIndex(d => d.type === key))} className="text-bank-error/70 hover:text-bank-error">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {uploaded ? (
                      <div className="flex items-center gap-2 text-sm text-bank-success bg-bank-success/10 rounded-lg px-3 py-2">
                        <CheckCircle size={14} />
                        <span className="truncate">{uploaded.name}</span>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-bank-border rounded-lg px-4 py-3 hover:border-bank-accent/50 hover:bg-bank-accent/10 transition-colors">
                        <Upload size={16} className="text-bank-text-muted/70" />
                        <span className="text-sm text-bank-text-muted">
                          {uploadingDoc ? 'Wird hochgeladen...' : 'Datei auswählen'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => handleDocumentUpload(e, key)}
                          disabled={uploadingDoc}
                        />
                      </label>
                    )}
                  </div>
                );
              })}

              {!validateStep3() && (
                <p className="text-xs text-bank-secondary flex items-center gap-1">
                  <AlertCircle size={14} /> Personalausweis oder Reisepass ist Pflicht.
                </p>
              )}
            </div>
          )}

          {/* Step 4 — Bestätigung */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-bank-text mb-4">Zusammenfassung & Bestätigung</h2>

              <div className="bg-bank-bg rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-bank-text-muted">Name</span>
                  <span className="font-medium">{personalData.first_name} {personalData.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bank-text-muted">E-Mail</span>
                  <span className="font-medium">{personalData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bank-text-muted">Bank</span>
                  <span className="font-medium">{investmentData.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bank-text-muted">Betrag</span>
                  <span className="font-medium">
                    {Number(investmentData.investment_amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bank-text-muted">Laufzeit</span>
                  <span className="font-medium">{investmentData.term_months} Monate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-bank-text-muted">Dokumente</span>
                  <span className="font-medium">{documents.length} Datei(en)</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-bank-border bg-white p-3 text-sm">
                  <p className="font-medium text-bank-text">AI-Identifizierung</p>
                  <p className="text-bank-text-muted mt-0.5">
                    Vor dem Absenden müssen Sie den vollständigen KI-Identifizierungsprozess inkl. Ausweis- und Liveness-Prüfung abschließen.
                  </p>
                  <p className={`mt-2 ${isIdentityInterviewCompleted ? 'text-bank-success' : 'text-bank-secondary'}`}>
                    {isIdentityInterviewCompleted
                      ? 'Interviewfragen erfolgreich abgeschlossen.'
                      : 'Interviewfragen noch offen.'}
                  </p>
                  <p className={`mt-1 ${isLivenessVerified ? 'text-bank-success' : 'text-bank-secondary'}`}>
                    {isLivenessVerified
                      ? 'Liveness inkl. Dokumentanzeige verifiziert.'
                      : 'Liveness-Prüfung noch offen.'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={setTermsAccepted} data-testid="checkbox-terms" />
                  <label htmlFor="terms" className="text-sm text-bank-text-muted cursor-pointer">
                    Ich stimme den <a href="/legal/terms" className="text-bank-accent hover:underline">Allgemeinen Geschäftsbedingungen</a> zu. *
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={setPrivacyAccepted} data-testid="checkbox-privacy" />
                  <label htmlFor="privacy" className="text-sm text-bank-text-muted cursor-pointer">
                    Ich stimme der <a href="/legal/privacy" className="text-bank-accent hover:underline">Datenschutzerklärung</a> zu. *
                  </label>
                </div>
              </div>

              {submitError && (
                <div className="bg-bank-error/10 border border-bank-error/25 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-bank-error flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-bank-error">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-bank-border">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} className="rounded-xl" data-testid="btn-back">
                <ArrowLeft size={18} className="mr-2" /> Zurück
              </Button>
            ) : <div />}

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="bg-bank-ink hover:bg-bank-ink-hover text-white rounded-xl"
                data-testid="btn-next"
              >
                Weiter <ArrowRight size={18} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalSubmitClick}
                disabled={!canProceed() || isSubmitting}
                className="bg-bank-success hover:bg-bank-success text-white rounded-xl"
                data-testid="btn-submit"
              >
                {isSubmitting
                  ? <><Loader2 size={18} className="mr-2 animate-spin" /> Wird gesendet...</>
                  : <>Antrag absenden <CheckCircle size={18} className="ml-2" /></>}
              </Button>
            )}
          </div>
        </div>
      </div>

      <IdentityInterviewFlow
        isOpen={isIdentityFlowOpen}
        onClose={() => setIsIdentityFlowOpen(false)}
        passportDocument={passportDocument}
        personalData={{
          ...personalData,
          phone: combinePhoneNumber(personalData.phone_dial_code, personalData.phone_local),
          address: buildFullAddress(personalData),
        }}
        onSuccess={(payload) => {
          setIdentitySessionData(payload);
          setIsIdentityInterviewCompleted(true);
          setIsLivenessVerified(true);
          setIsIdentityFlowOpen(false);
          toast.success('AI-Identifizierungsprozess erfolgreich abgeschlossen.');
        }}
      />

    </div>
  );
};

export default ApplicationForm;