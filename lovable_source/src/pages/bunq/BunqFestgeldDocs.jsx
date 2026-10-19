import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, FileCheck, Info, ArrowLeft } from 'lucide-react';

const docs = [
  {
    title: 'Festgeldvertrag',
    subtitle: 'Ausfüllbares Vertragsformular',
    description: 'Festgeldanlage mit garantierter Verzinsung — online ausfüllen, drucken und per E-Mail versenden.',
    icon: FileText,
    path: '/banks/bunq/festgeld/vertrag',
    accent: true,
  },
  {
    title: 'Bedingungen für das Festgeldkonto',
    subtitle: 'Vertragsbedingungen',
    description: 'Allgemeine Bedingungen für die Eröffnung und Führung eines Festgeldkontos bei der bunq.',
    icon: FileCheck,
    path: '/banks/bunq/festgeld/bedingungen',
  },
  {
    title: 'Produktinformationsblatt',
    subtitle: 'Festgeld — Produktdetails',
    description: 'Zusammenfassende Darstellung der wichtigsten Produktmerkmale der Festgeldanlage.',
    icon: Info,
    path: '/banks/bunq/festgeld/produktinfo',
  },
];

const BunqFestgeldDocs = () => {
  return (
    <div className="min-h-screen bg-bank-bg">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/banks"
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-bank-text-muted/70 transition-colors hover:text-bank-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück zur Bankauswahl
        </Link>

        <div className="mb-10 overflow-hidden rounded-xl border border-bank-border bg-white shadow-bank-card">
          <div className="flex items-center gap-5 border-b-4 border-[#FF7819] bg-white px-8 py-6">
            <img src="/assets/bank-logos/bunq-logo.png" alt="bunq" className="h-9 w-auto object-contain" />
            <div className="h-8 w-px bg-[#0B4F6C]/15" />
            <div>
              <h1 className="text-lg font-medium tracking-[0.02em] text-[#0B4F6C]">Festgeld</h1>
              <p className="text-[11px] tracking-wide text-[#0B4F6C]/60">bunq NL · Dokumente und Vertragsformulare</p>
            </div>
          </div>
          <div className="px-8 py-2">
            <p className="text-[13px] text-bank-text-muted">
              Wählen Sie ein Dokument aus
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {docs.map((doc) => {
            const Icon = doc.icon;
            return (
              <Link
                key={doc.path}
                to={doc.path}
                className={`group flex items-start gap-5 rounded-lg border bg-white p-6 transition-all duration-200 hover:shadow-md ${
                  doc.accent
                    ? 'border-[#FF7819]/35 hover:border-[#FF7819]/55'
                    : 'border-bank-border hover:border-bank-border/80'
                }`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                  doc.accent ? 'bg-[#FF7819]/12' : 'bg-bank-bg'
                }`}>
                  <Icon className={`h-5 w-5 ${doc.accent ? 'text-[#0B4F6C]' : 'text-bank-text-muted'}`} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-medium text-bank-text transition-colors group-hover:text-[#FF7819]">
                    {doc.title}
                  </h3>
                  <p className="mt-0.5 text-xs tracking-wide text-bank-text-muted/60">{doc.subtitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-bank-text-muted">{doc.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BunqFestgeldDocs;
