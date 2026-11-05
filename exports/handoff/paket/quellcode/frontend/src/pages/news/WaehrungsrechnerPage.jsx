import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta';
import PublicNewsLayout from '@/components/news/PublicNewsLayout';
import CurrencyConverterCard from '@/components/news/CurrencyConverterCard';

const WaehrungsrechnerPage = () => (
  <PublicNewsLayout showSidebar={false}>
    <PageMeta
      title="Währungsrechner"
      description="Euro, Dollar und weitere Währungen mit aktuellen Wechselkursen umrechnen."
      path="/news/waehrungsrechner"
      noIndex
    />

    <nav className="mb-6 text-[12px] text-bank-text-muted">
      <Link to="/news" className="hover:text-bank-accent">
        News
      </Link>
      <span aria-hidden className="mx-2">
        /
      </span>
      <span className="text-bank-text">Währungsrechner</span>
    </nav>

    <CurrencyConverterCard />
  </PublicNewsLayout>
);

export default WaehrungsrechnerPage;
