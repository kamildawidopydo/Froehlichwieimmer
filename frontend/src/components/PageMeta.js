import React from 'react';
import { Helmet } from 'react-helmet-async';

const DEFAULT_TITLE = 'Kapitalmitte | Ihre Investments. Alle Banken. Eine Plattform.';
const DEFAULT_DESCRIPTION =
  'Tagesgeld, Festgeld & mehr bei über 100 europäischen Banken – auf einer Plattform vergleichen und verwalten. Sicher, übersichtlich und unverbindlich mit Kapitalmitte.';
const DEFAULT_IMAGE = '/assets/logo/frohlich-logo.png?v=1';

const PageMeta = ({ title, description, path = '/', image = DEFAULT_IMAGE, noIndex = false }) => {
  const resolvedTitle = title
    ? title.includes('Kapitalmitte')
      ? title
      : `Kapitalmitte | ${title}`
    : DEFAULT_TITLE;
  const resolvedDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = `https://www.kapitalmitte.com${path}`;

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Kapitalmitte" />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={image} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}
    </Helmet>
  );
};

export default PageMeta;
