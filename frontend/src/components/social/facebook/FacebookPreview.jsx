import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  MapPin,
  Clock,
  Phone,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { SocialVerifiedBadge } from '@/components/social/SocialVerifiedBadge';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';
import { cn } from '@/lib/utils';
import facebookProfile, { formatCount } from '@/data/social/facebookProfile';
import SocialProfileGateModal from '@/components/social/SocialProfileGateModal';
import SocialSearchGateModal from '@/components/social/SocialSearchGateModal';
import SocialLocalLoginModal from '@/components/social/SocialLocalLoginModal';
import SocialAnlagenprofisMessageModal from '@/components/social/SocialAnlagenprofisMessageModal';
import { toast } from 'sonner';
import FacebookPostCard from '@/components/social/facebook/FacebookPostCard';
import FacebookMediaLightbox from '@/components/social/facebook/FacebookMediaLightbox';
import FacebookPostComposerStub from '@/components/social/facebook/FacebookPostComposerStub';
import FacebookTopNav from '@/components/social/facebook/FacebookTopNav';
import { useFacebookEngagement } from '@/hooks/useFacebookEngagement';
import { TABS, cardClass, PageAvatar } from '@/components/social/facebook/facebookShared';
import SocialProfilePhotoPreview from '@/components/social/SocialProfilePhotoPreview';

const ProfilePageAvatar = ({ onPreview }) => (
  <button
    type="button"
    onClick={onPreview}
    className="absolute bottom-0 left-3 z-10 flex h-[88px] w-[88px] translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white px-2 py-3 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2] focus-visible:ring-offset-2 sm:left-4 sm:h-[112px] sm:w-[112px] sm:px-2.5 sm:py-3.5 md:left-6 md:h-[168px] md:w-[168px] md:px-3 md:py-5"
    aria-label="Profilbild vergrößern"
  >
    <SocialBrandLogo src={facebookProfile.assets.avatar} fit="wide" alt="Kapitalmitte" />
  </button>
);

const PostFeed = ({ posts, pinnedId, onProfileClick, onProfileGate, engagement }) => (
  <div className="space-y-4">
    {posts.map((post) => (
      <FacebookPostCard
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

const FeedColumn = ({ onOpenComposer, children }) => (
  <div className="space-y-4">
    <FacebookPostComposerStub onOpenGate={onOpenComposer} />
    {children}
  </div>
);

const FacebookSidebar = ({ onNavigate, onProfileClick, onOpenPhoto }) => {
  const { contact, photos, suggestedPages } = facebookProfile;

  return (
    <aside className="space-y-4">
      <section className={cn(cardClass, 'p-4')}>
        <h3 className="text-[20px] font-bold text-[#050505]">Intro</h3>
        <p className="mt-2 text-[15px] leading-snug text-[#050505]">{facebookProfile.intro}</p>
        <button
          type="button"
          onClick={() => onNavigate('info')}
          className="mt-3 w-full rounded-md bg-[#e4e6eb] py-2 text-[15px] font-semibold text-[#050505] transition-colors hover:bg-[#d8dadf]"
        >
          Seitendetails ansehen
        </button>
      </section>

      <section className={cn(cardClass, 'p-4')}>
        <h3 className="text-[14px] font-semibold text-[#050505]">Kontakt</h3>
        <ul className="mt-3 space-y-2 text-[13px] text-[#65676b]">
          <li>
            <a href={`mailto:${contact.email}`} className="text-[#1877F2] hover:underline">
              {contact.email}
            </a>
          </li>
          <li>
            <a href={`tel:${contact.phoneTel}`} className="text-[#1877F2] hover:underline">
              {contact.phone}
            </a>
          </li>
          <li>
            {contact.street}, {contact.city}
          </li>
        </ul>
        <a
          href={contact.websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#1877F2] hover:underline"
        >
          Website <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="text-[20px] font-bold text-[#050505]">Fotos</h3>
          <button type="button" onClick={() => onOpenPhoto(0)} className="text-[15px] font-semibold text-[#1877F2] hover:underline">
            Alle ansehen
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 px-4 pb-4">
          {photos.slice(0, 3).map((ph, i) => (
            <button
              key={ph.id}
              type="button"
              onClick={() => onOpenPhoto(i)}
              className="overflow-hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
            >
              <img src={ph.src} alt={ph.alt} className="aspect-square w-full object-cover hover:opacity-90" loading="lazy" />
            </button>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <h3 className="border-b border-[#dddfe2] px-4 py-3 text-[17px] font-bold text-[#050505]">
          Seiten, die diesem gefallen
        </h3>
        <ul className="divide-y divide-[#dddfe2]">
          {suggestedPages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onProfileClick(page.name)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f0f2f5]"
              >
                <img src={page.logo} alt="" className="h-10 w-10 shrink-0 rounded-md border border-[#dddfe2] object-cover bg-white" loading="lazy" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#050505]">{page.name}</p>
                  <p className="text-[13px] text-[#65676b]">{page.tagline}</p>
                  <p className="text-[13px] text-[#65676b]">{formatCount(page.followers)} Gefällt mir</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
};

const FacebookTabBeitraege = ({ onNavigate, onProfileClick, onProfileGate, onOpenComposer, onOpenPhoto, engagement }) => (
  <div className="mx-auto grid max-w-[1012px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[360px_1fr]">
    <FacebookSidebar onNavigate={onNavigate} onProfileClick={onProfileClick} onOpenPhoto={onOpenPhoto} />
    <FeedColumn onOpenComposer={onOpenComposer}>
      <PostFeed
        posts={facebookProfile.posts}
        pinnedId={facebookProfile.pinnedPostId}
        onProfileClick={onProfileClick}
        onProfileGate={onProfileGate}
        engagement={engagement}
      />
    </FeedColumn>
  </div>
);

const FacebookTabInfo = () => {
  const { about, specialties, stats, contact, category, locations } = facebookProfile;

  const grunddaten = [
    { label: 'Website', value: contact.website, href: contact.websiteHref },
    { label: 'Kategorie', value: category },
    { label: 'Gegründet', value: String(stats.activeSince) },
    { label: 'E-Mail', value: contact.email, href: `mailto:${contact.email}` },
    { label: 'Telefon', value: contact.phone, href: `tel:${contact.phoneTel}` },
    { label: 'Öffnungszeiten', value: contact.hours },
  ];

  return (
    <div className="mx-auto max-w-[680px] space-y-4 px-4 py-6">
      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[20px] font-bold text-[#050505]">Über uns</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-[#050505]">{about.mission}</p>
      </section>
      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[20px] font-bold text-[#050505]">Grunddaten</h3>
        <dl className="mt-4 space-y-3">
          {grunddaten.map(({ label, value, href }) => (
            <div key={label} className="grid grid-cols-[130px_1fr] gap-2 text-[15px]">
              <dt className="font-semibold text-[#65676b]">{label}</dt>
              <dd>
                {href ? (
                  <a href={href} className="text-[#1877F2] hover:underline" target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
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
        <h3 className="text-[20px] font-bold text-[#050505]">Spezialgebiete</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {specialties.map((s) => (
            <span key={s} className="rounded-md bg-[#e7f3ff] px-3 py-1 text-[13px] font-medium text-[#1877F2]">
              {s}
            </span>
          ))}
        </div>
      </section>
      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[20px] font-bold text-[#050505]">Standorte</h3>
        <ul className="mt-3 space-y-2 text-[15px] text-[#050505]">
          {locations.map((loc) => (
            <li key={loc.id}>
              <span className="font-semibold">{loc.label}:</span> {loc.address}
            </li>
          ))}
        </ul>
      </section>
      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[20px] font-bold text-[#050505]">Produkte & Services</h3>
        <ul className="mt-3 space-y-2">
          {about.products.map((l) => (
            <li key={l.href}>
              <Link to={l.href} className="text-[15px] font-semibold text-[#1877F2] hover:underline">
                {l.label} →
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[20px] font-bold text-[#050505]">Transparenz & Regulierung</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-[#050505]">{about.regulation}</p>
      </section>
      <p className="text-center text-[13px] text-[#65676b]">
        <Link to="/legal/impressum" className="font-semibold text-[#1877F2] hover:underline">
          Vollständiges Impressum
        </Link>
      </p>
    </div>
  );
};

const FacebookTabFotos = ({ onOpenPhoto }) => (
  <div className="mx-auto max-w-[900px] px-4 py-6">
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
      {facebookProfile.photos.map((ph, i) => (
        <button key={ph.id} type="button" onClick={() => onOpenPhoto(i)} className="overflow-hidden rounded-md bg-white focus-visible:ring-2 focus-visible:ring-[#1877F2]">
          <img src={ph.src} alt={ph.alt} className="aspect-square w-full object-cover hover:opacity-90" loading="lazy" />
        </button>
      ))}
    </div>
    <p className="mt-4 text-center text-[13px] italic text-[#65676b]">
      Ausgewählte Beitragsmedien der Fröhlich Vermögensberatung GmbH Seite.
    </p>
  </div>
);

const FacebookTabKontakt = () => {
  const { contact } = facebookProfile;
  const rows = [
    { Icon: Mail, label: contact.email, href: `mailto:${contact.email}` },
    { Icon: Globe, label: `Webseite · ${contact.website}`, href: contact.websiteHref },
    { Icon: MapPin, label: `${contact.street}, ${contact.city}`, href: null },
    { Icon: Clock, label: contact.hours, href: null },
    { Icon: Phone, label: contact.phone, href: `tel:${contact.phoneTel}` },
  ];
  return (
    <div className="mx-auto max-w-[560px] px-4 py-6">
      <section className={cn(cardClass, 'p-5')}>
        <h3 className="text-[20px] font-bold text-[#050505]">Kontaktinfos</h3>
        <ul className="mt-4 space-y-4">
          {rows.map(({ Icon, label, href }) => (
            <li key={label} className="flex items-start gap-3 text-[15px] text-[#050505]">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#65676b]" strokeWidth={1.75} />
              {href ? (
                <a href={href} className="text-[#1877F2] hover:underline" target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                  {label}
                </a>
              ) : (
                <span>{label}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const FacebookPageActions = ({ onFakeAction, onFollowLogin, onMessage }) => {
  const { contact } = facebookProfile;

  return (
    <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:items-end">
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={onFakeAction}
          className="rounded-md bg-[#1877F2] px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-[#166fe5]"
        >
          Gefällt mir
        </button>
        <button
          type="button"
          onClick={onFollowLogin}
          className="rounded-md bg-[#e4e6eb] px-4 py-2 text-[15px] font-semibold text-[#050505] transition-colors hover:bg-[#d8dadf]"
        >
          + Folgen
        </button>
        <a
          href={contact.websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-[#e4e6eb] px-4 py-2 text-[15px] font-semibold text-[#050505] transition-colors hover:bg-[#d8dadf]"
        >
          Website
        </a>
        <button
          type="button"
          onClick={onMessage}
          className="rounded-md bg-[#1877F2] px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-[#166fe5]"
        >
          Nachricht senden
        </button>
      </div>
    </div>
  );
};

const FacebookPreview = () => {
  const engagement = useFacebookEngagement();
  const [activeTab, setActiveTab] = useState('beitraege');
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [searchGateOpen, setSearchGateOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(null);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  const openProfileGate = useCallback(() => setProfileGateOpen(true), []);
  const closeProfileGate = useCallback(() => setProfileGateOpen(false), []);
  const openSearchGate = useCallback(() => setSearchGateOpen(true), []);
  const closeSearchGate = useCallback(() => setSearchGateOpen(false), []);
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);
  const openMessageModal = useCallback(() => setMessageModalOpen(true), []);
  const closeMessageModal = useCallback(() => setMessageModalOpen(false), []);
  const openPhoto = useCallback((i) => setPhotoIndex(i), []);
  const closePhoto = useCallback(() => setPhotoIndex(null), []);
  const openAvatarPreview = useCallback(() => setAvatarPreviewOpen(true), []);
  const closeAvatarPreview = useCallback(() => setAvatarPreviewOpen(false), []);

  const { stats, assets, pageName, category, verified } = facebookProfile;

  const renderTab = () => {
    switch (activeTab) {
      case 'info':
        return <FacebookTabInfo />;
      case 'fotos':
        return <FacebookTabFotos onOpenPhoto={openPhoto} />;
      case 'kontakt':
        return <FacebookTabKontakt />;
      default:
        return (
          <FacebookTabBeitraege
            onNavigate={setActiveTab}
            onProfileClick={openProfileGate}
            onProfileGate={openProfileGate}
            onOpenComposer={openProfileGate}
            onOpenPhoto={openPhoto}
            engagement={engagement}
          />
        );
    }
  };

  return (
    <>
      <div className="bg-[#f0f2f5] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif]">
        <FacebookTopNav
          onFakeAction={openProfileGate}
          onSearchClick={openSearchGate}
          onMessageClick={openMessageModal}
        />
        <header className="border-b border-[#dddfe2] bg-white pb-0">
          <div className="relative mx-auto max-w-[1012px]">
            <div className="relative">
              <div className="h-[160px] overflow-hidden bg-[#0a2540] sm:h-[240px] md:h-[300px]">
                <img src={assets.cover} alt="" className="h-full w-full object-cover" loading="eager" />
              </div>
              <ProfilePageAvatar onPreview={openAvatarPreview} />
            </div>
            <div className="bg-white px-3 pb-3 pt-12 sm:px-4 sm:pt-14 md:px-6 md:pt-[92px]">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 md:pl-[188px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1
                      className="font-display text-[24px] font-light leading-tight text-[#050505] sm:text-[28px] md:text-[32px]"
                      style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
                    >
                      {pageName}
                    </h1>
                    {verified && (
                      <SocialVerifiedBadge platform="facebook" size="lg" title="Verifiziert" />
                    )}
                  </div>
                  <p className="mt-1 text-[15px] text-[#65676b]">{category}</p>
                  <p className="mt-2 text-[15px] text-[#65676b]">
                    {formatCount(stats.followers)} Follower · {formatCount(stats.likes)} Personen gefällt das · Aktiv seit{' '}
                    {stats.activeSince}
                  </p>
                </div>
                <FacebookPageActions
                  onFakeAction={openProfileGate}
                  onFollowLogin={openLoginModal}
                  onMessage={openMessageModal}
                />
              </div>
            </div>
          </div>
          <nav
            className="sticky top-0 z-10 mx-auto flex max-w-[1012px] gap-1 overflow-x-auto border-t border-[#e4e6eb] bg-white px-3 shadow-sm sm:px-4 md:px-6"
            aria-label="Seitenbereiche"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative shrink-0 px-4 py-3 text-[15px] font-semibold transition-colors',
                  activeTab === tab.id ? 'text-[#1877F2]' : 'text-[#65676b] hover:bg-[#f0f2f5]',
                )}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-[#1877F2]" aria-hidden />}
              </button>
            ))}
          </nav>
        </header>
        {renderTab()}
      </div>

      <SocialProfileGateModal open={profileGateOpen} onClose={closeProfileGate} />
      <SocialSearchGateModal open={searchGateOpen} onClose={closeSearchGate} platform="facebook" />
      <SocialLocalLoginModal
        open={loginModalOpen}
        platform="facebook"
        onClose={closeLoginModal}
        onContinue={() => toast.success('Lokal bei Facebook angemeldet (Vorschau).')}
      />
      <SocialAnlagenprofisMessageModal open={messageModalOpen} platform="facebook" onClose={closeMessageModal} />
      <FacebookMediaLightbox items={facebookProfile.photos} index={photoIndex} onClose={closePhoto} onIndexChange={setPhotoIndex} />
      <SocialProfilePhotoPreview
        open={avatarPreviewOpen}
        onClose={closeAvatarPreview}
        platform="facebook"
        src={facebookProfile.assets.avatar}
        alt="Kapitalmitte"
        title={pageName}
        verified={verified}
      />
    </>
  );
};

export default FacebookPreview;
