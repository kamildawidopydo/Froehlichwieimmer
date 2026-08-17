import React, { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

const BankLogo = ({ logo, bankName, size = 'md', className = '', imageClassName = '', localLogoFallback = '' }) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const normalizeName = (value) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const normalizedBankName = normalizeName(bankName);
  const fallbackLogosByBankName = {
    ing: ['/assets/bank-logos/ing-logo.png', '/assets/bank-logos/ing-logo.jpg', '/assets/bank-logos/ing.svg'],
    'ing nederland': ['/assets/bank-logos/ing-logo.png', '/assets/bank-logos/ing-logo.jpg', '/assets/bank-logos/ing.svg'],
    bunq: ['/assets/bank-logos/bunq-logo.png', '/assets/bank-logos/bunq-logo.svg', '/assets/bank-logos/bunq.svg'],
    'bunq nederland': ['/assets/bank-logos/bunq-logo.png', '/assets/bank-logos/bunq-logo.svg', '/assets/bank-logos/bunq.svg'],
    bbva: ['/assets/bank-logos/bbva-official.svg', '/assets/bank-logos/bbva-wordmark.svg'],
    postbank: ['/assets/bank-logos/postbank-official.svg', '/assets/bank-logos/postbank.svg'],
    'deutsche postbank ag': ['/assets/bank-logos/postbank-official.svg', '/assets/bank-logos/postbank.svg'],
    'deutsche bank': ['/assets/bank-logos/deutsche-bank-mark.svg', '/assets/bank-logos/deutsche-bank.svg'],
    'ebn banco': ['/assets/bank-logos/ebn-banco.svg', '/assets/bank-logos/ebn-banco.png'],
    'ing belgium': ['/assets/logo/ing-belgium.png', '/assets/logo/ing-belgium.svg', 'https://logo.clearbit.com/ing.be'],
    'ing belgium nv': ['/assets/logo/ing-belgium.png', '/assets/logo/ing-belgium.svg', 'https://logo.clearbit.com/ing.be'],
    'ing belgium sa': ['/assets/logo/ing-belgium.png', '/assets/logo/ing-belgium.svg', 'https://logo.clearbit.com/ing.be'],
  };
  const fallbackCandidates = useMemo(() => {
    if (fallbackLogosByBankName[normalizedBankName]) {
      return fallbackLogosByBankName[normalizedBankName];
    }
    if (normalizedBankName.includes('ing belgium')) {
      return ['/assets/logo/ing-belgium.png', '/assets/logo/ing-belgium.svg', 'https://logo.clearbit.com/ing.be'];
    }
    return [];
  }, [normalizedBankName]);

  const sourceCandidates = useMemo(() => {
    const candidates = [];
    if (logo) candidates.push(logo);
    const local = typeof localLogoFallback === 'string' && localLogoFallback.trim();
    if (local && !candidates.includes(local)) candidates.push(local);
    fallbackCandidates.forEach((item) => {
      if (!candidates.includes(item)) candidates.push(item);
    });
    return candidates;
  }, [logo, localLogoFallback, fallbackCandidates]);

  const resolvedLogo = sourceCandidates[sourceIndex] || null;

  useEffect(() => {
    setSourceIndex(0);
  }, [logo, normalizedBankName, localLogoFallback]);

  const sizeConfig = {
    sm: { container: 'w-10 h-10', icon: 18 },
    md: { container: 'w-12 h-12', icon: 22 },
    lg: { container: 'w-14 h-14', icon: 26 },
    xl: { container: 'w-16 h-16', icon: 30 },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  const isWideLogo =
    normalizedBankName.includes('postbank') ||
    (resolvedLogo && /postbank/i.test(String(resolvedLogo)));

  const imagePadding = isWideLogo ? 'p-0.5' : 'p-1.5';
  const imageScale = isWideLogo ? 'scale-[1.12]' : '';

  const handleImageError = () => {
    if (sourceIndex < sourceCandidates.length - 1) {
      setSourceIndex((prev) => prev + 1);
      return;
    }
    setSourceIndex(sourceCandidates.length);
  };

  // Show neutral bank icon placeholder if no logo or image error
  // Uses a professional, neutral design - NOT colored letter boxes
  if (!resolvedLogo) {
    return (
      <div 
        className={`${config.container} rounded-xl bg-gradient-to-br from-bank-bg to-bank-border/20 flex items-center justify-center flex-shrink-0 border border-bank-border shadow-sm ${className}`}
        data-testid={`bank-logo-${bankName?.toLowerCase().replace(/\s+/g, '-')}`}
        title={bankName}
      >
        <Building2 size={config.icon} className="text-bank-text-muted/70" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div 
      className={`${config.container} rounded-xl bg-white border border-bank-border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm ${className}`}
      title={bankName}
    >
      <img
        src={resolvedLogo}
        alt={`${bankName} logo`}
        className={`h-full w-full object-contain ${imagePadding} ${imageScale} ${imageClassName}`.trim()}
        onError={handleImageError}
        loading="lazy"
        data-testid={`bank-logo-${bankName?.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  );
};

export default BankLogo;
