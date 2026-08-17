import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import OfferComparisonDetail from '@/components/comparison/OfferComparisonDetail';

const OfferDetailModal = ({ offer, rateHistory = [], isOpen, onClose, onInterestClick, onInterest }) => {
  if (!offer) return null;

  const handleInterestClick =
    typeof onInterestClick === 'function'
      ? onInterestClick
      : typeof onInterest === 'function'
        ? onInterest
        : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent hideClose className="grid max-h-[min(96dvh,920px)] max-w-5xl gap-0 overflow-hidden border-bank-border bg-transparent p-0 shadow-2xl sm:max-h-[92vh] sm:max-w-5xl">
        <DialogTitle className="sr-only">Vergleich — {offer.bank_name}</DialogTitle>
        <OfferComparisonDetail
          offer={offer}
          rateHistory={rateHistory}
          onClose={onClose}
          onInterestClick={handleInterestClick}
        />
      </DialogContent>
    </Dialog>
  );
};

export default OfferDetailModal;
