import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Users, Mail, Phone, Clock, MapPin as MapPinIcon, ExternalLink, Play } from 'lucide-react';
import { SocialVerifiedBadge } from '@/components/social/SocialVerifiedBadge';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';
import SocialAvatarImage from '@/components/social/SocialAvatarImage';
import { cn } from '@/lib/utils';
import linkedinProfile from '@/data/social/linkedinProfile';
import { formatCount } from '@/data/social/formatCount';
import SocialProfileGateModal from '@/components/social/SocialProfileGateModal';
import SocialSearchGateModal from '@/components/social/SocialSearchGateModal';
import SocialLocalLoginModal from '@/components/social/SocialLocalLoginModal';
import SocialAnlagenprofisMessageModal from '@/components/social/SocialAnlagenprofisMessageModal';
import { toast } from 'sonner';
import LinkedInPostCard from '@/components/social/linkedin/LinkedInPostCard';
import LinkedInMediaLightbox from '@/components/social/linkedin/LinkedInMediaLightbox';
import LinkedInPostComposerStub from '@/components/social/linkedin/LinkedInPostComposerStub';
import { useLinkedInEngagement } from '@/hooks/useLinkedInEngagement';
import LinkedInTopNav from '@/components/social/linkedin/LinkedInTopNav';
import { TABS, cardClass } from '@/components/social/linkedin/linkedinShared';

const HeaderLogo = () => (
  <div
    className="absolute bottom-0 left-4 z-10 flex h-[72px] w-[72px] translate-y-1/2 items-center justify-center overflow-hidden rounded-md border-4 border-white bg-white px-1.5 py-2 shadow-md sm:left-6 sm:h-[96px] sm:w-[96px] sm:px-2 sm:py-2.5"
    aria-hidden
  >
    <SocialBrandLogo src={linkedinProfile.assets.logo} fit="wide" alt="" />
  </div>
);

const FeedColumn = ({ onOpenComposer, children }) => (
  <div className="space-y-4">
    <LinkedInPostComposerStub onOpenGate={onOpenComposer} />
    {children}
  </div>
);

const PostFeed = ({ posts, onProfileClick, onProfileGate, engagement, pinnedId }) => (
  <div className="space-y-4">
    {posts.map((post) => (
      <LinkedInPostCard
        key={post.id}
        post={post}
        pinned={post.id === pinnedId}
        onProfileClick={onProfileClick}
        onProfileGate={onProfileGate}
        engagement={engagement}
      />
    ))}
  </div>
);

const LinkedInSidebar = ({ onNavigate, onProfileClick, onOpenMedia }) => {
  const { contact, media, employees, similarPages } = linkedinProfile;

  return (
    <aside className="space-y-4">
      <section className={cardClass}>
        <h3 className="border-b border-[#E0E0E0] px-4 py-3 text-[16px] font-semibold text-[rgba(0,0,0,0.9)]">Überblick</h3>
        <p className="px-4 py-3 text-[14px] leading-relaxed text-[rgba(0,0,0,0.9)]">{linkedinProfile.intro}</p>
        <button
          type="button"
          onClick={() => onNavigate('info')}
          className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-full border border-[#0A66C2] py-2 text-[14px] font-semibold text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/10"
        >
          Mehr erfahren
        </button>
      </section>

      <section className={cn(cardClass, 'p-4')}>
        <h3 className="text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">Kontakt</h3>
        <ul className="mt-3 space-y-2 text-[13px] text-[#666]">
          <li className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <a href={`mailto:${contact.email}`} className="text-[#0A66C2] hover:underline">
              {contact.email}
            </a>
          </li>
          <li className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <a href={`tel:${contact.phoneTel}`} className="text-[#0A66C2] hover:underline">
              {contact.phone}
            </a>
          </li>
          <li className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {contact.street}, {contact.city}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{contact.hours}</span>
          </li>
        </ul>
        <a
          href={contact.websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0A66C2] hover:underline"
        >
          Website besuchen <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between border-b border-[#E0E0E0] px-4 py-3">
          <h3 className="text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">Medien</h3>
          <button
            type="button"
            onClick={() => onOpenMedia(0)}
            className="text-[13px] font-semibold text-[#0A66C2] hover:underline"
          >
            Alle anzeigen
          </button>
        </div>
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {media.slice(0, 6).map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOpenMedia(i)}
              className="relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2] focus-visible:ring-offset-1"
            >
              <img src={m.src} alt={m.alt} className="aspect-square w-full object-cover transition-opacity hover:opacity-90" loading="lazy" />
              {m.type === 'video' && (
                <span className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                  <Play className="h-3 w-3 fill-white" strokeWidth={0} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <h3 className="border-b border-[#E0E0E0] px-4 py-3 text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">
          Mitarbeiter im Blick
        </h3>
        <ul className="divide-y divide-[#E0E0E0]">
          {employees.slice(0, 4).map((emp) => (
            <li key={emp.id}>
              <button
                type="button"
                onClick={() => onProfileClick(emp.name)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#00000006]"
              >
                <SocialAvatarImage src={emp.avatar} className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">{emp.name}</p>
                  <p className="truncate text-[12px] text-[#666]">{emp.role}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onNavigate('mitarbeiter')}
          className="w-full border-t border-[#E0E0E0] py-2.5 text-[14px] font-semibold text-[#0A66C2] hover:bg-[#0A66C2]/5"
        >
          Alle Mitarbeiter anzeigen
        </button>
      </section>

      <section className={cardClass}>
        <h3 className="border-b border-[#E0E0E0] px-4 py-3 text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">
          Seiten, die auch angesehen wurden
        </h3>
        <ul className="divide-y divide-[#E0E0E0]">
          {similarPages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onProfileClick(page.name)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#00000006]"
              >
                <img
                  src={page.logo}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md border border-[#E0E0E0] object-cover bg-white"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">{page.name}</p>
                  <p className="text-[12px] text-[#666]">{page.tagline}</p>
                  <p className="text-[12px] text-[#666]">{formatCount(page.followers)} Follower</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
};

const LinkedInTabStartseite = ({ onNavigate, onProfileClick, onProfileGate, onOpenComposer, onOpenMedia, engagement }) => {
  const pinned = linkedinProfile.posts.find((p) => p.id === linkedinProfile.pinnedPostId);
  const rest = linkedinProfile.posts.filter((p) => p.id !== linkedinProfile.pinnedPostId).slice(0, 2);

  return (
    <div className="mx-auto grid max-w-[1128px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[300px_1fr]">
      <LinkedInSidebar onNavigate={onNavigate} onProfileClick={onProfileClick} onOpenMedia={onOpenMedia} />
      <FeedColumn onOpenComposer={onOpenComposer}>
        <PostFeed
          posts={pinned ? [pinned, ...rest] : rest}
          onProfileClick={onProfileClick}
          onProfileGate={onProfileGate}
          engagement={engagement}
          pinnedId={linkedinProfile.pinnedPostId}
        />
      </FeedColumn>
    </div>
  );
};

const LinkedInTabBeitraege = ({ onProfileClick, onProfileGate, onOpenComposer, engagement }) => (
  <div className="mx-auto max-w-[720px] space-y-4 px-3 py-4 sm:px-4">
    <div className={cn(cardClass, 'px-4 py-3')}>
      <p className="text-[14px] text-[#666]">
        Beiträge der <span className="font-semibold text-[rgba(0,0,0,0.9)]">{linkedinProfile.companyName}</span>
      </p>
    </div>
    <FeedColumn onOpenComposer={onOpenComposer}>
      <PostFeed
        posts={linkedinProfile.posts}
        onProfileClick={onProfileClick}
        onProfileGate={onProfileGate}
        engagement={engagement}
        pinnedId={linkedinProfile.pinnedPostId}
      />
    </FeedColumn>
  </div>
);

const LinkedInTabInfo = () => {
  const { contact, about, specialties, industry, companyType, locations } = linkedinProfile;

  const grunddaten = [
    { label: 'Website', value: contact.website, href: contact.websiteHref },
    { label: 'Branche', value: industry },
    { label: 'Unternehmenstyp', value: companyType },
    { label: 'Telefon', value: contact.phone, href: `tel:${contact.phoneTel}` },
    { label: 'E-Mail', value: contact.email, href: `mailto:${contact.email}` },
    { label: 'Öffnungszeiten', value: contact.hours },
  ];

  return (
    <div className="mx-auto max-w-[720px] space-y-4 px-4 py-6">
      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[18px] font-semibold text-[rgba(0,0,0,0.9)]">Übersicht</h3>
        <div className="mt-3 space-y-4 text-[14px] leading-relaxed text-[rgba(0,0,0,0.9)]">
          {about.overview.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <div>
            <p className="font-semibold">{about.overview.focus.title}</p>
            <ul className="mt-2 space-y-1 pl-1">
              {about.overview.focus.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p>{about.overview.bridge}</p>

          <div>
            <p className="font-semibold">{about.overview.services.title}</p>
            <ul className="mt-2 space-y-1 pl-1">
              {about.overview.services.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {about.overview.closing.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <div className="space-y-1 pt-1">
            {about.overview.tags.map((tag) => (
              <p key={tag}>{tag}</p>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[18px] font-semibold text-[rgba(0,0,0,0.9)]">Grunddaten</h3>
        <dl className="mt-4 space-y-3">
          {grunddaten.map(({ label, value, href }) => (
            <div key={label} className="grid grid-cols-[140px_1fr] gap-2 text-[14px]">
              <dt className="font-semibold text-[#666]">{label}</dt>
              <dd className="text-[rgba(0,0,0,0.9)]">
                {href ? (
                  <a href={href} className="text-[#0A66C2] hover:underline" target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[18px] font-semibold text-[rgba(0,0,0,0.9)]">Spezialgebiete</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {specialties.map((s) => (
            <span key={s} className="rounded-full bg-[#E8F4FC] px-3 py-1 text-[13px] font-medium text-[#0A66C2]">
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[18px] font-semibold text-[rgba(0,0,0,0.9)]">Standorte</h3>
        <ul className="mt-3 space-y-3">
          {locations.map((loc) => (
            <li key={loc.id} className="flex gap-2 text-[14px]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#666]" aria-hidden />
              <div>
                <p className="font-semibold text-[rgba(0,0,0,0.9)]">{loc.label}</p>
                <p className="text-[#666]">{loc.address}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[18px] font-semibold text-[rgba(0,0,0,0.9)]">Produkte & Services</h3>
        <ul className="mt-3 space-y-2">
          {about.products.map((l) => (
            <li key={l.href}>
              <Link to={l.href} className="text-[14px] font-semibold text-[#0A66C2] hover:underline">
                {l.label} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[18px] font-semibold text-[rgba(0,0,0,0.9)]">Transparenz & Regulierung</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[rgba(0,0,0,0.9)]">{about.regulation}</p>
      </section>

      <p className="text-center text-[13px] text-[#666]">
        <Link to="/legal/impressum" className="font-semibold text-[#0A66C2] hover:underline">
          Vollständiges Impressum
        </Link>
      </p>
    </div>
  );
};

const LinkedInTabMitarbeiter = ({ onProfileClick }) => (
  <div className="mx-auto max-w-[900px] px-4 py-6">
    <p className="mb-4 text-[14px] text-[#666]">
      {formatCount(linkedinProfile.employees.length)} Mitarbeiter:innen auf LinkedIn (Vorschau)
    </p>
    <div className="grid gap-3 sm:grid-cols-2">
      {linkedinProfile.employees.map((emp) => (
        <button
          key={emp.id}
          type="button"
          onClick={() => onProfileClick(emp.name)}
          className={cn(cardClass, 'flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[#00000004]')}
        >
          <SocialAvatarImage src={emp.avatar} className="h-16 w-16 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-[rgba(0,0,0,0.9)]">{emp.name}</p>
            <p className="text-[14px] text-[#666]">{emp.role}</p>
            <p className="mt-1 text-[13px] font-semibold text-[#0A66C2]">Profil anzeigen</p>
          </div>
        </button>
      ))}
    </div>
  </div>
);

const LinkedInTabProdukte = () => (
  <div className="mx-auto max-w-[900px] px-4 py-6">
    <p className="mb-4 text-[14px] text-[#666]">Produkte und Services von {linkedinProfile.companyName}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {linkedinProfile.products.map((prod) => (
        <article key={prod.id} className={cardClass}>
          <img src={prod.image} alt="" className="aspect-[1.91/1] w-full object-cover" loading="lazy" />
          <div className="p-4">
            <h3 className="text-[16px] font-semibold text-[rgba(0,0,0,0.9)]">{prod.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#666]">{prod.description}</p>
            <Link
              to={prod.href}
              className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-[#0A66C2] hover:underline"
            >
              Mehr erfahren <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </article>
      ))}
    </div>
  </div>
);

const LinkedInCompanyActions = ({ onFakeAction, onFollowLogin, onMessage }) => (
  <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:items-end">
    <div className="flex shrink-0 flex-wrap gap-2">
      <button
        type="button"
        onClick={onFollowLogin}
        className="rounded-full bg-[#0A66C2] px-5 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#004182]"
      >
        + Folgen
      </button>
      <a
        href={linkedinProfile.contact.websiteHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-[#0A66C2] px-5 py-2 text-[14px] font-semibold text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/10"
      >
        Website
      </a>
      <button
        type="button"
        onClick={onMessage}
        className="rounded-full border border-[#666] px-5 py-2 text-[14px] font-semibold text-[#666] transition-colors hover:bg-[#0000000a]"
      >
        Nachricht
      </button>
    </div>
  </div>
);

const LinkedInPreview = () => {
  const engagement = useLinkedInEngagement();
  const [activeTab, setActiveTab] = useState('startseite');
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [searchGateOpen, setSearchGateOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(null);

  const openProfileGate = useCallback(() => setProfileGateOpen(true), []);
  const closeProfileGate = useCallback(() => setProfileGateOpen(false), []);
  const openSearchGate = useCallback(() => setSearchGateOpen(true), []);
  const closeSearchGate = useCallback(() => setSearchGateOpen(false), []);
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);
  const openMessageModal = useCallback(() => setMessageModalOpen(true), []);
  const closeMessageModal = useCallback(() => setMessageModalOpen(false), []);
  const openMedia = useCallback((i) => setMediaIndex(i), []);
  const closeMedia = useCallback(() => setMediaIndex(null), []);

  const {
    stats,
    assets,
    companyName,
    tagline,
    industry,
    location,
    verified,
    companySize,
  } = linkedinProfile;

  const renderTab = () => {
    switch (activeTab) {
      case 'beitraege':
        return (
          <LinkedInTabBeitraege
            onProfileClick={openProfileGate}
            onProfileGate={openProfileGate}
            onOpenComposer={openProfileGate}
            engagement={engagement}
          />
        );
      case 'info':
        return <LinkedInTabInfo />;
      case 'mitarbeiter':
        return <LinkedInTabMitarbeiter onProfileClick={openProfileGate} />;
      case 'produkte':
        return <LinkedInTabProdukte />;
      default:
        return (
          <LinkedInTabStartseite
            onNavigate={setActiveTab}
            onProfileClick={openProfileGate}
            onProfileGate={openProfileGate}
            onOpenComposer={openProfileGate}
            onOpenMedia={openMedia}
            engagement={engagement}
          />
        );
    }
  };

  return (
    <>
      <div className="bg-[#F3F2EF] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]">
        <LinkedInTopNav
          onFakeAction={openProfileGate}
          onSearchClick={openSearchGate}
          onMessageClick={openMessageModal}
        />
        <header className="border-b border-[#E0E0E0] bg-white">
          <div className="relative mx-auto max-w-[1128px]">
            <div className="relative">
              <div className="h-[120px] overflow-hidden bg-[#0a2540] sm:h-[160px] md:h-[200px]">
                <img src={assets.cover} alt="" className="h-full w-full object-cover" loading="eager" />
              </div>
              <HeaderLogo />
            </div>
            <div className="bg-white px-4 pb-4 pt-10 sm:px-6 sm:pt-12 md:pl-[120px] md:pt-14">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-[22px] font-semibold leading-tight text-[rgba(0,0,0,0.9)] sm:text-[26px]">
                      {companyName}
                    </h1>
                    {verified && (
                      <span className="inline-flex items-center" title="Verifiziert (Vorschau)">
                        <SocialVerifiedBadge platform="linkedin" size="md" />
                        <span className="sr-only">Verifiziert</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[14px] text-[#666]">{tagline}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#666]">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-4 w-4" aria-hidden />
                      {industry}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {location}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0A66C2]">
                      <Users className="h-4 w-4" aria-hidden />
                      {formatCount(stats.followers)} Follower
                    </span>
                    <span className="text-[#666]">{formatCount(stats.pageViews)} Besucher (30 Tage)</span>
                    <span className="text-[#666]">{companySize}</span>
                    <span className="text-[#666]">· Gegründet {stats.founded}</span>
                  </div>
                </div>
                <LinkedInCompanyActions
                  onFakeAction={openProfileGate}
                  onFollowLogin={openLoginModal}
                  onMessage={openMessageModal}
                />
              </div>
            </div>
          </div>
          <nav
            className="sticky top-0 z-10 mx-auto flex max-w-[1128px] gap-0 overflow-x-auto border-t border-[#E0E0E0] bg-white px-4 shadow-sm sm:px-6"
            aria-label="Unternehmensbereiche"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative shrink-0 px-4 py-3 text-[14px] font-semibold transition-colors',
                  activeTab === tab.id ? 'text-[#0A66C2]' : 'text-[#666] hover:bg-[#0000000a]',
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] bg-[#0A66C2]" aria-hidden />
                )}
              </button>
            ))}
          </nav>
        </header>
        {renderTab()}
      </div>
      <SocialProfileGateModal open={profileGateOpen} onClose={closeProfileGate} />
      <SocialSearchGateModal open={searchGateOpen} onClose={closeSearchGate} platform="linkedin" />
      <SocialLocalLoginModal
        open={loginModalOpen}
        platform="linkedin"
        onClose={closeLoginModal}
        onContinue={() => toast.success('Lokal bei LinkedIn angemeldet (Vorschau).')}
      />
      <SocialAnlagenprofisMessageModal open={messageModalOpen} platform="linkedin" onClose={closeMessageModal} />
      <LinkedInMediaLightbox
        items={linkedinProfile.media}
        index={mediaIndex}
        onClose={closeMedia}
        onIndexChange={setMediaIndex}
      />
    </>
  );
};

export default LinkedInPreview;
