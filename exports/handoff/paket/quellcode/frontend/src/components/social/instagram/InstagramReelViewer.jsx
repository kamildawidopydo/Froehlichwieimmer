import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, MessageCircle, MoreHorizontal, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import instagramProfile from '@/data/social/instagramProfile';
import { countPostComments, formatCount } from '@/data/social/formatCount';
import { ProfileAvatar } from '@/components/social/instagram/instagramShared';
import SocialAvatarImage from '@/components/social/SocialAvatarImage';
const ReelCommentAvatar = ({ comment, size = 32 }) => {
  if (comment.isCompany) {
    return (
      <span
        className="flex shrink-0 overflow-hidden rounded-full border border-white/20 bg-white"
        style={{ width: size, height: size }}
      >
        <SocialAvatarImage
          src={comment.avatar}
          className="h-full w-full bg-white object-contain object-center p-0.5"
        />
      </span>
    );
  }
  return (
    <SocialAvatarImage
      src={comment.avatar}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
};

const ReelCommentRow = ({ comment, nested }) => (
  <li className={cn('flex gap-3 text-[14px] text-white', nested && 'ml-9 mt-3')}>
    <ReelCommentAvatar comment={comment} size={nested ? 28 : 32} />
    <div className="min-w-0 flex-1">
      <p className="leading-snug">
        <span className="mr-1.5 font-semibold">{comment.author}</span>
        <span className="text-white/90">{comment.text}</span>
      </p>
      <p className="mt-1 text-[12px] text-white/45">{comment.publishedAt}</p>
      {comment.replies?.map((reply) => (
        <ul key={reply.id} className="mt-2 list-none p-0">
          <ReelCommentRow comment={reply} nested />
        </ul>
      ))}
    </div>
  </li>
);

const InstagramReelViewer = ({ reel, onClose, onProfileGate }) => {
  const [commentsOpen, setCommentsOpen] = useState(false);

  const previewComments = reel.commentThread ?? [];
  const commentTotal = countPostComments(previewComments);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (commentsOpen) setCommentsOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, commentsOpen]);

  const noop = useCallback((e) => e.stopPropagation(), []);

  if (!reel) return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/95 p-0 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Reel schließen" className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-black sm:h-[min(92vh,780px)] sm:rounded-xl"
        onClick={noop}
      >
        <header className="absolute left-0 right-0 top-3 z-20 flex items-center gap-2 px-3">
          <button type="button" onClick={onProfileGate} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label="Profil anzeigen">
            <ProfileAvatar size={32} />
          </button>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white drop-shadow-sm">
            {instagramProfile.username}
          </p>
          <button type="button" onClick={onProfileGate} className="rounded-full p-1 text-white hover:bg-white/10" aria-label="Optionen">
            <MoreHorizontal className="h-6 w-6" />
          </button>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-white hover:bg-white/10" aria-label="Schließen">
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="relative flex-1 overflow-hidden bg-black">
          <video
            src={reel.video}
            poster={reel.poster}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        </div>

        <aside className="absolute bottom-20 right-3 z-20 flex flex-col items-center gap-5 text-white">
          <button type="button" onClick={onProfileGate} className="flex flex-col items-center gap-0.5" aria-label="Gefällt mir">
            <Heart className="h-7 w-7 text-white" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold">{formatCount(reel.likes)}</span>
          </button>
          <button type="button" onClick={onProfileGate} className="flex flex-col items-center gap-0.5" aria-label="Kommentieren">
            <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold">{formatCount(commentTotal)}</span>
          </button>
          <button type="button" onClick={onProfileGate} className="flex flex-col items-center gap-0.5" aria-label="Teilen">
            <Send className="h-7 w-7" strokeWidth={1.75} />
          </button>
        </aside>

        <footer className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-12 pr-16">
          <p className="text-[13px] font-semibold text-white">{instagramProfile.username}</p>
          <p className="mt-1 line-clamp-2 text-[13px] text-white/90">{reel.caption}</p>
          <p className="mt-2 text-[11px] text-white/50">{formatCount(reel.views)} Aufrufe</p>
        </footer>

        {commentsOpen && (
          <div
            className="absolute inset-x-0 bottom-0 z-30 flex max-h-[55%] flex-col rounded-t-2xl bg-[#121212]"
            role="dialog"
            aria-label="Kommentare"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-[14px] font-semibold text-white">Kommentare</p>
              <button
                type="button"
                onClick={() => setCommentsOpen(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10"
                aria-label="Kommentare schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {previewComments.map((c) => (
                <ReelCommentRow key={c.id} comment={c} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default InstagramReelViewer;
