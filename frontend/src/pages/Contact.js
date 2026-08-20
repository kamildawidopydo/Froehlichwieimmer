import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Mail, MapPin, Phone, Send, ArrowUpRight } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import siteContact from '../data/siteContact';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

const Contact = () => {
  const reduce = useReducedMotion();
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('contact_messages').insert([form]);
      if (error) throw error;

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `Neue Kontaktanfrage: ${form.subject}`,
            html: `<h2>Neue Kontaktanfrage eingegangen</h2>
                   <p><strong>Name:</strong> ${form.name}</p>
                   <p><strong>E-Mail:</strong> ${form.email}</p>
                   <p><strong>Betreff:</strong> ${form.subject}</p>
                   <p><strong>Nachricht:</strong><br/>${form.message.replace(/\n/g, '<br/>')}</p>`,
          }),
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
      }

      toast.success('Nachricht erfolgreich gesendet! Wir melden uns in Kürze.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error('Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const FieldLabel = ({ children, num }) => (
    <span className="mb-3 flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
      <span className="text-bank-gold">{num}</span>
      <span>{children}</span>
    </span>
  );

  return (
    <div className="min-h-screen bg-bank-bg">
      <PageMeta
        title="Kontakt"
        description="Kontaktieren Sie Fröhlich Vermögensberatung bei Fragen zu Sparangeboten, Konto, Onboarding oder Support rund um die Plattform."
        path="/contact"
      />

      <div className="grid min-h-screen lg:grid-cols-12">
        {/* LEFT — editorial dark column */}
        <motion.aside
          initial={reduce ? false : { opacity: 0, x: -16 }}
          animate={reduce ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 bg-bank-ink px-7 py-16 text-white sm:px-12 sm:py-20 lg:col-span-5 lg:border-b-0 lg:border-r lg:py-28"
        >
          <div className="topo-pattern absolute inset-0 opacity-[0.06]" aria-hidden />
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
          <div className="pointer-events-none absolute -bottom-32 right-[-15%] h-[420px] w-[420px] rounded-full bg-bank-gold/10 blur-3xl" aria-hidden />

          <div className="relative">
            <Eyebrow tone="gold">Kontakt · Fröhlich Vermögensberatung</Eyebrow>
            <h1
              className="mt-6 font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] sm:text-display-lg"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Wir hören
              <span className="block italic text-bank-gold-soft"> Ihnen zu.</span>
            </h1>
            <div className="mt-7 h-px w-24 bg-bank-gold/70" aria-hidden />
            <p className="mt-7 max-w-md font-sans text-[15px] leading-[1.8] text-white/75">
              Bei Fragen zur Plattform, zu unseren Angeboten oder zur Kontoeröffnung — schreiben Sie uns. Wir antworten
              meist innerhalb von 24 Stunden.
            </p>
          </div>

          <ul className="relative mt-16 space-y-7 lg:mt-0">
            <li className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-bank-gold/45 text-bank-gold">
                <Mail className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">E-Mail</p>
                <a
                  href={`mailto:${siteContact.email}`}
                  className="mt-1.5 block font-display text-[1.1rem] italic text-white underline-offset-4 hover:underline"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  {siteContact.email}
                </a>
              </div>
            </li>
            <li className="flex gap-5 border-t border-white/10 pt-7">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/15 text-white/85">
                <Phone className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">Telefon</p>
                <a
                  href={`tel:${siteContact.phoneTel}`}
                  className="mt-1.5 block font-mono text-[15px] tabular-nums text-white hover:text-white/90"
                >
                  {siteContact.phoneDisplay}
                </a>
              </div>
            </li>
            <li className="flex gap-5 border-t border-white/10 pt-7">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/15 text-white/85">
                <MapPin className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">Adresse</p>
                <p className="mt-1.5 text-sm leading-[1.7] text-white/85">
                  {siteContact.companyName}
                  <br />
                  {siteContact.street}
                  <br />
                  {siteContact.postalCityDe}
                </p>
              </div>
            </li>
          </ul>

          <div className="relative mt-12 border-t border-white/10 pt-5 font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/55">
            <span>{siteContact.businessHoursLine}</span>
          </div>
        </motion.aside>

        {/* RIGHT — form */}
        <motion.div
          initial={reduce ? false : { opacity: 0, x: 16 }}
          animate={reduce ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-white px-6 py-16 sm:px-12 lg:col-span-7 lg:flex lg:items-center lg:px-20 lg:py-28"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent lg:hidden" />
          <div className="w-full max-w-xl">
            <Eyebrow>Nachricht senden</Eyebrow>
            <h2
              className="mt-5 font-display text-[2rem] font-light leading-tight text-bank-text sm:text-[2.4rem]"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Schreiben Sie uns —
              <span className="block italic text-bank-text-muted"> wir antworten persönlich.</span>
            </h2>
            <div className="mt-5 h-px w-16 bg-bank-gold/55" aria-hidden />
            <p className="mt-5 font-sans text-[14.5px] leading-[1.75] text-bank-text-muted">
              Pflichtfelder sind entsprechend gekennzeichnet. Ihre Daten werden ausschließlich zur Bearbeitung Ihres
              Anliegens verwendet.
            </p>

            <form onSubmit={handleSubmit} className="mt-12 space-y-7">
              <label className="block">
                <FieldLabel num="01">Name</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ihr Name"
                  required
                  data-testid="contact-name"
                  className="h-12 rounded-none border-bank-border focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                />
              </label>

              <label className="block">
                <FieldLabel num="02">E-Mail</FieldLabel>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ihre@email.de"
                  required
                  data-testid="contact-email"
                  className="h-12 rounded-none border-bank-border focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                />
              </label>

              <label className="block">
                <FieldLabel num="03">Betreff</FieldLabel>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Worum geht es?"
                  required
                  data-testid="contact-subject"
                  className="h-12 rounded-none border-bank-border focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                />
              </label>

              <label className="block">
                <FieldLabel num="04">Nachricht</FieldLabel>
                <textarea
                  className="flex min-h-[180px] w-full border border-bank-border bg-white px-3 py-3 font-sans text-[15px] leading-[1.7] text-bank-text placeholder:text-bank-text-muted/55 focus-visible:border-bank-gold/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30"
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Wie können wir helfen?"
                  required
                  data-testid="contact-message"
                />
              </label>

              <div className="flex flex-col-reverse gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Ihre Daten · DSGVO-konform
                </p>
                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  disabled={loading}
                  data-testid="contact-submit-btn"
                  className="min-w-[200px]"
                >
                  {loading ? (
                    'Wird gesendet…'
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                      Senden
                      <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
