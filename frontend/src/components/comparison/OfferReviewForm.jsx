import React, { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InteractiveStarRating from '@/components/comparison/InteractiveStarRating';
import { getDisplayProductType } from '@/lib/productDisplay';
import { submitOfferReview, submitGuestOfferReview, normalizeOfferReviewRow } from '@/lib/offerReviews';
import { getGuestReviewSessionToken } from '@/lib/guestReviewSession';
import { logEvent, EVENTS } from '@/lib/activityLogger';
import { roundToQuarter } from '@/lib/starRating';
import { sanitizePersonName } from '@/lib/personName';

const MIN_LEN = 15;
const MAX_LEN = 2000;
const MIN_NAME_LEN = 2;
const MAX_NAME_LEN = 60;

const nameInputClass =
  'mt-2 w-full border border-bank-border bg-bank-bg/30 px-3 py-2 text-sm text-bank-text focus:border-bank-primary/40 focus:outline-none focus:ring-2 focus:ring-bank-accent/30';

function ReviewStatusMessage({ myReview }) {
  if (myReview?.status === 'approved') {
    return (
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Ihre Bewertung ist veröffentlicht. Vielen Dank für Ihr Feedback.
      </div>
    );
  }

  if (myReview?.status === 'pending') {
    return (
      <div className="mt-6 rounded-lg border border-bank-border bg-bank-bg/50 p-4 text-sm text-bank-text-muted">
        <p className="font-medium text-bank-text">Bewertung in Prüfung</p>
        <p className="mt-2">
          Ihre Bewertung wird von unserem Team geprüft und anschließend veröffentlicht.
        </p>
      </div>
    );
  }

  return null;
}

function NameFields({ firstName, lastName, onFirstNameChange, onLastNameChange, readOnly }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-bank-text-muted">
          Vorname
        </label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => onFirstNameChange(sanitizePersonName(e.target.value))}
          maxLength={MAX_NAME_LEN}
          autoComplete="given-name"
          required
          readOnly={readOnly}
          className={nameInputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-bank-text-muted">
          Nachname
        </label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => onLastNameChange(sanitizePersonName(e.target.value))}
          maxLength={MAX_NAME_LEN}
          autoComplete="family-name"
          required
          readOnly={readOnly}
          className={nameInputClass}
        />
      </div>
    </div>
  );
}

const OfferReviewForm = memo(function OfferReviewForm({ offer, user, profileApproved, myReview: myReviewProp, onSubmitted }) {
  const myReview = normalizeOfferReviewRow(myReviewProp);
  const [stars, setStars] = useState(4.5);
  const [body, setBody] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isApprovedMember = Boolean(user) && (profileApproved === true || user?.role === 'admin');
  const useGuestSubmit = !isApprovedMember;
  const namesFromProfile =
    isApprovedMember &&
    Boolean((user?.first_name || '').trim()) &&
    Boolean((user?.last_name || '').trim());

  useEffect(() => {
    if (!user) return;
    setFirstName((user.first_name || '').trim());
    setLastName((user.last_name || '').trim());
  }, [user?.first_name, user?.last_name, user?.id]);

  const productType = getDisplayProductType(offer) === 'Flexgeld' ? 'Flexgeld' : 'Festgeld';
  const bodyLen = body.trim().length;
  const firstLen = firstName.trim().length;
  const lastLen = lastName.trim().length;

  const statusBlock = <ReviewStatusMessage myReview={myReview} />;
  if (myReview?.status === 'approved' || myReview?.status === 'pending') {
    return statusBlock;
  }

  const showForm = !myReview || myReview.status === 'rejected';
  if (!showForm) return statusBlock;

  const validateNames = () => {
    if (firstLen < MIN_NAME_LEN || lastLen < MIN_NAME_LEN) {
      toast.error('Bitte Vorname und Nachname eingeben.');
      return false;
    }
    if (firstLen > MAX_NAME_LEN || lastLen > MAX_NAME_LEN) {
      toast.error(`Name darf maximal ${MAX_NAME_LEN} Zeichen haben.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateNames()) return;
    if (bodyLen < MIN_LEN) {
      toast.error(`Bitte mindestens ${MIN_LEN} Zeichen eingeben.`);
      return;
    }

    setSubmitting(true);

    if (useGuestSubmit) {
      const token = getGuestReviewSessionToken();
      if (!token) {
        setSubmitting(false);
        toast.error('Bewertung konnte nicht gespeichert werden. Bitte Browser-Speicher erlauben.');
        return;
      }
      const { error } = await submitGuestOfferReview({
        offerId: offer.id,
        stars: roundToQuarter(stars),
        body: body.trim(),
        productType,
        guestSessionToken: token,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message || 'Einreichung fehlgeschlagen');
        return;
      }
      toast.success('Vielen Dank – Ihre Bewertung wird nach Prüfung veröffentlicht.');
      await logEvent(EVENTS.OFFER_REVIEW_GUEST_SUBMIT, {
        savings_offer_id: offer.id,
        bank_name: offer.bank_name,
        stars: roundToQuarter(stars),
      });
    } else {
      const { error } = await submitOfferReview({
        offerId: offer.id,
        stars: roundToQuarter(stars),
        body: body.trim(),
        productType,
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message || 'Einreichung fehlgeschlagen');
        return;
      }
      toast.success('Vielen Dank – Ihre Bewertung wird nach Prüfung veröffentlicht.');
      await logEvent(EVENTS.OFFER_REVIEW_SUBMIT, {
        savings_offer_id: offer.id,
        bank_name: offer.bank_name,
        stars: roundToQuarter(stars),
      });
    }

    setBody('');
    if (useGuestSubmit) {
      setFirstName('');
      setLastName('');
    }
    onSubmitted?.();
  };

  const subtitle = useGuestSubmit
    ? `${productType} · Kein Konto erforderlich · wird nach Freigabe durch unser Team veröffentlicht`
    : `${productType} · wird nach Freigabe durch unser Team veröffentlicht`;

  return (
    <>
      {myReview?.status === 'rejected' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Ihre letzte Bewertung wurde nicht freigegeben.
          {myReview.rejection_reason ? ` Grund: ${myReview.rejection_reason}` : ''}
        </div>
      )}
      <form onSubmit={handleSubmit} className="rounded-lg border border-bank-border bg-bank-bg/30 p-4 shadow-sm">
        <p className="text-sm font-semibold text-bank-text">Bewertung schreiben</p>
        <p className="mt-1 text-xs text-bank-text-muted">{subtitle}</p>

        <NameFields
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={setFirstName}
          onLastNameChange={setLastName}
          readOnly={namesFromProfile}
        />

        <div className="mt-4">
          <InteractiveStarRating value={stars} onChange={setStars} />
        </div>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-bank-text-muted">
          Ihr Erfahrungsbericht
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={MAX_LEN}
          placeholder="Beschreiben Sie Ihre Erfahrung mit diesem Angebot (mindestens 15 Zeichen)…"
          className="mt-2 w-full resize-y border border-bank-border bg-bank-bg/30 px-3 py-2 text-sm text-bank-text focus:border-bank-primary/40 focus:outline-none focus:ring-2 focus:ring-bank-accent/30"
        />
        <p className="mt-1 text-right text-xs text-bank-text-muted">
          {bodyLen} / {MAX_LEN}
        </p>
        <Button type="submit" variant="primary" className="mt-4 w-full sm:w-auto" disabled={submitting}>
          {submitting ? 'Wird gesendet…' : 'Bewertung einreichen'}
        </Button>
        {useGuestSubmit && (
          <p className="mt-3 text-xs text-bank-text-muted">
            Bereits Kunde?{' '}
            <Link to="/login" className="font-medium text-bank-primary underline-offset-2 hover:underline">
              Mit Konto anmelden
            </Link>
          </p>
        )}
      </form>
    </>
  );
});

export default OfferReviewForm;
