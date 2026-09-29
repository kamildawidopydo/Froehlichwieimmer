/**
 * Session 94 · Site-weite Organization-JSON-LD (schema.org).
 * Wird im App-Root via <StructuredData /> einmal gemountet und via Helmet in
 * den <head> injiziert. React verwaltet die Nodes → kein removeChild-Konflikt
 * mit statischen index.html-Scripts.
 *
 * Zweck: eindeutige Google-Zuordnung essenceinvest.com ↔
 * Fröhlich Vermögensberatung GmbH (Anbieterkennung, Adresse, HRB, Logo).
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'FinancialService',
  '@id': 'https://essenceinvest.com/#organization',
  name: 'Fröhlich Vermögensberatung GmbH',
  legalName: 'Fröhlich Vermögensberatung GmbH',
  alternateName: 'EssenceInvest',
  url: 'https://essenceinvest.com/',
  logo: 'https://essenceinvest.com/assets/logo/frohlich-logo.png?v=4',
  image: 'https://essenceinvest.com/assets/logo/frohlich-logo.png?v=4',
  email: 'kundenservice@essenceinvest.com',
  telephone: '+4969667785941',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Bösgrunder Weg 62',
    postalCode: '55543',
    addressLocality: 'Bad Kreuznach',
    addressCountry: 'DE',
  },
  identifier: [
    { '@type': 'PropertyValue', propertyID: 'HRB', value: 'HRB 23436' },
    { '@type': 'PropertyValue', propertyID: 'Registergericht', value: 'Amtsgericht Bad Kreuznach' },
    { '@type': 'PropertyValue', propertyID: 'Crefo-Nr.', value: '6010244899' },
  ],
  founder: { '@type': 'Person', name: 'Manfred Franz Fröhlich' },
  areaServed: 'DE',
  sameAs: ['https://essenceinvest.com/legal/impressum'],
};

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://essenceinvest.com/#website',
  url: 'https://essenceinvest.com/',
  name: 'EssenceInvest',
  publisher: { '@id': 'https://essenceinvest.com/#organization' },
  inLanguage: 'de-DE',
};

const StructuredData = () => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify(ORGANIZATION)}</script>
    <script type="application/ld+json">{JSON.stringify(WEBSITE)}</script>
  </Helmet>
);

export default StructuredData;
