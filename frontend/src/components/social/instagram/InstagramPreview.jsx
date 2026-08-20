import React, { useState } from 'react';
import { ChevronDown, Clapperboard, Grid3X3, Home, Link2, MoreHorizontal, Plus, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import instagramProfile from '@/data/social/instagramProfile';
import { formatCount } from '@/data/social/formatCount';
import { useInstagramEngagement } from '@/hooks/useInstagramEngagement';
import {
  IG_GRADIENT,
  ProfileAvatar,
  VerifiedBadge,
} from '@/components/social/instagram/instagramShared';
import InstagramStoryViewer from '@/components/social/instagram/InstagramStoryViewer';
import InstagramPostModal from '@/components/social/instagram/InstagramPostModal';
import InstagramPostGrid from '@/components/social/instagram/InstagramPostGrid';
import InstagramReelsGrid from '@/components/social/instagram/InstagramReelsGrid';
import InstagramReelViewer from '@/components/social/instagram/InstagramReelViewer';
import SocialProfileGateModal from '@/components/social/SocialProfileGateModal';
import SocialSearchGateModal from '@/components/social/SocialSearchGateModal';
import { SocialPlatformIcon } from '@/components/social/SocialPlatformIcon';
import SocialLocalLoginModal from '@/components/social/SocialLocalLoginModal';
import SocialAnlagenprofisMessageModal from '@/components/social/SocialAnlagenprofisMessageModal';
import SocialProfilePhotoPreview from '@/components/social/SocialProfilePhotoPreview';
import { toast } from 'sonner';

const InstagramPreview = () => {
  const engagement = useInstagramEngagement();
  const [activePost, setActivePost] = useState(null);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [profileGateOpen, setProfileGateOpen] = useState(false);
  const [searchGateOpen, setSearchGateOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeReel, setActiveReel] = useState(null);
  const [gridTab, setGridTab] = useState('posts');
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  const { username, displayName, verified, category, stats, bio, linkInBio, highlights, posts, reels, assets } =
    instagramProfile;

  const bioLines = bio.split('\n');
  const bioPreview = bioExpanded ? bio : bioLines.slice(0, 2).join('\n');
  const bioNeedsMore = bioLines.length > 2 || bio.length > 120;

  const openProfileGate = () => setProfileGateOpen(true);
  const closeProfileGate = () => setProfileGateOpen(false);
  const openSearchGate = () => setSearchGateOpen(true);
  const closeSearchGate = () => setSearchGateOpen(false);
  const openLoginModal = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);
  const openMessageModal = () => setMessageModalOpen(true);
  const closeMessageModal = () => setMessageModalOpen(false);
  const onProfileClick = () => openProfileGate();
  const openAvatarPreview = () => setAvatarPreviewOpen(true);
  const closeAvatarPreview = () => setAvatarPreviewOpen(false);

  return (
    <div className="mx-auto w-full max-w-[430px] bg-white pb-6">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dbdbdb] bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <SocialPlatformIcon platform="instagram" className="h-7 w-7 shrink-0" alt="Instagram" />
          <button type="button" className="flex min-w-0 items-center gap-1 text-[16px] font-semibold text-[#262626]">
            {username}
            <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openProfileGate}
            aria-label="Beitrag erstellen"
            className="text-[#262626]"
          >
            <Plus className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <button type="button" onClick={openProfileGate} aria-label="Menü" className="text-[#262626]">
            <MoreHorizontal className="h-6 w-6" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <header className="flex gap-4 px-4 pt-5">
        <button
          type="button"
          onClick={openAvatarPreview}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0095F6] focus-visible:ring-offset-2"
          aria-label="Profilbild vergrößern"
        >
          <ProfileAvatar size={88} />
        </button>
        <div className="flex flex-1 flex-col justify-center">
          <ul className="flex justify-around text-center">
            <li>
              <p className="text-[16px] font-semibold text-[#262626]">{formatCount(stats.posts)}</p>
              <p className="text-[13px] text-[#262626]">Beiträge</p>
            </li>
            <li>
              <p className="text-[16px] font-semibold text-[#262626]">{formatCount(stats.followers)}</p>
              <p className="text-[13px] text-[#262626]">Follower</p>
            </li>
            <li>
              <p className="text-[16px] font-semibold text-[#262626]">{formatCount(stats.following)}</p>
              <p className="text-[13px] text-[#262626]">Gefolgt</p>
            </li>
          </ul>
        </div>
      </header>

      <div className="px-4 pt-3">
        <p className="flex items-center gap-1 text-[14px] font-semibold text-[#262626]">
          {displayName}
          {verified && <VerifiedBadge />}
        </p>
        <p className="text-[13px] text-[#8e8e8e]">{category}</p>
        <p className="mt-1 whitespace-pre-line text-[14px] leading-snug text-[#262626]">{bioPreview}</p>
        {bioNeedsMore && (
          <button
            type="button"
            onClick={() => setBioExpanded((e) => !e)}
            className="text-[14px] text-[#8e8e8e]"
          >
            {bioExpanded ? 'weniger' : 'mehr'}
          </button>
        )}
        <a
          href={linkInBio.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[14px] font-semibold text-[#00376b]"
        >
          <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
          {linkInBio.label}
        </a>
      </div>

      <div className="mt-4 flex gap-2 px-4">
        <button
          type="button"
          onClick={openLoginModal}
          className="flex-1 rounded-lg py-1.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: IG_GRADIENT }}
        >
          Folgen
        </button>
        <button
          type="button"
          onClick={openMessageModal}
          className="flex-1 rounded-lg border border-[#dbdbdb] bg-[#efefef] py-1.5 text-[14px] font-semibold text-[#262626] transition-colors hover:bg-[#e4e4e4]"
        >
          Nachricht
        </button>
        <button
          type="button"
          onClick={openProfileGate}
          className="rounded-lg border border-[#dbdbdb] bg-[#efefef] px-3 py-1.5 transition-colors hover:bg-[#e4e4e4]"
          aria-label="Kontaktoptionen"
        >
          <ChevronDown className="h-5 w-5 text-[#262626]" />
        </button>
      </div>

      <div className="mt-5 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-4">
          {highlights.map((h) => (
            <li key={h.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveHighlight(h)}
                className="flex w-[64px] flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0095F6] focus-visible:ring-offset-2"
              >
                <span
                  className="flex h-[64px] w-[64px] items-center justify-center rounded-full p-[2px]"
                  style={{ background: IG_GRADIENT }}
                >
                  <img
                    src={h.cover}
                    alt=""
                    className="h-full w-full rounded-full border-2 border-white object-cover"
                    loading="lazy"
                  />
                </span>
                <span className="max-w-[64px] truncate text-[12px] text-[#262626]">{h.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2 flex border-t border-[#dbdbdb]">
        <button
          type="button"
          onClick={() => setGridTab('posts')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 py-2.5',
            gridTab === 'posts' ? 'border-t border-[#262626] text-[#262626]' : 'text-[#8e8e8e]',
          )}
          aria-current={gridTab === 'posts' ? 'page' : undefined}
        >
          <Grid3X3 className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => setGridTab('reels')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1 py-2.5',
            gridTab === 'reels' ? 'border-t border-[#262626] text-[#262626]' : 'text-[#8e8e8e]',
          )}
          aria-label="Reels"
        >
          <Clapperboard className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          disabled
          className="flex flex-1 items-center justify-center gap-1 py-2.5 text-[#dbdbdb]"
          aria-label="Markiert"
        >
          <User className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {gridTab === 'posts' ? (
        <InstagramPostGrid posts={posts} onOpenPost={setActivePost} isPostLiked={engagement.isPostLiked} />
      ) : (
        <InstagramReelsGrid reels={reels} onOpenReel={(reel) => setActiveReel(reel)} />
      )}

      <nav
        className="sticky bottom-0 mt-4 flex border-t border-[#dbdbdb] bg-white py-2"
        aria-label="Instagram Navigation"
      >
        {[
          { Icon: Home, label: 'Startseite', active: false },
          { Icon: Search, label: 'Suche', active: false },
          { Icon: Plus, label: 'Erstellen', active: false },
          { Icon: ShoppingBag, label: 'Shop', active: false },
          { Icon: User, label: 'Profil', active: true },
        ].map(({ Icon, label, active }) => (
          <button
            key={label}
            type="button"
            onClick={label === 'Suche' ? openSearchGate : openProfileGate}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center gap-0.5', active ? 'text-[#262626]' : 'text-[#262626]/70')}
          >
            <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.75} fill={active ? 'currentColor' : 'none'} />
          </button>
        ))}
      </nav>

      <p className="mt-4 px-4 text-center text-[12px] text-[#8e8e8e]">
        @{username} · Vorschau · nicht mit Instagram verbunden
      </p>

      {activePost && (
        <InstagramPostModal
          post={activePost}
          onClose={() => setActivePost(null)}
          onProfileClick={onProfileClick}
          onProfileGate={openProfileGate}
          engagement={engagement}
        />
      )}

      {activeHighlight && (
        <InstagramStoryViewer
          highlight={activeHighlight}
          onClose={() => setActiveHighlight(null)}
          onProfileGate={openProfileGate}
        />
      )}

      {activeReel && (
        <InstagramReelViewer reel={activeReel} onClose={() => setActiveReel(null)} onProfileGate={openProfileGate} />
      )}

      <SocialProfileGateModal open={profileGateOpen} onClose={closeProfileGate} />
      <SocialSearchGateModal open={searchGateOpen} onClose={closeSearchGate} platform="instagram" />
      <SocialLocalLoginModal
        open={loginModalOpen}
        platform="instagram"
        onClose={closeLoginModal}
        onContinue={() => toast.success('Lokal bei Instagram angemeldet (Vorschau).')}
      />
      <SocialAnlagenprofisMessageModal open={messageModalOpen} platform="instagram" onClose={closeMessageModal} />
      <SocialProfilePhotoPreview
        open={avatarPreviewOpen}
        onClose={closeAvatarPreview}
        platform="instagram"
        src={assets.avatar}
        alt="Fröhlich Vermögensberatung"
        title={displayName}
        verified={verified}
      />
    </div>
  );
};

export default InstagramPreview;
