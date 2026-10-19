import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const StrategieBreadcrumb = ({ items }) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      item: it.path ? `https://essenceinvest.com${it.path}` : undefined,
    })),
  };
  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className="text-[12px] text-bank-text-muted" data-testid="strategie-breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-bank-text-muted/60">›</span>}
              {it.path && i < items.length - 1 ? (
                <Link to={it.path} className="hover:text-bank-primary hover:underline underline-offset-4">
                  {it.label}
                </Link>
              ) : (
                <span className="text-bank-text/80">{it.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default StrategieBreadcrumb;
