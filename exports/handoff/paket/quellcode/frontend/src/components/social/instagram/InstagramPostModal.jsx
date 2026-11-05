import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Heart, MessageCircle, Send, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';
import instagramProfile from '@/data/social/instagramProfile';
import { countPostComments, formatCount } from '@/data/social/formatCount';
import {
  LocalUserAvatar,
  ProfileAvatar,
  VerifiedBadge,
} from '@/components/social/instagram/instagramShared';
import SocialAvatarImage from '@/components/social/SocialAvatarImage';
const CAPTION_CLAMP = 180;

const avatarFallbackSrc = (src) => src.replace(/\.(png|jpg)(\?.*)?$/i, '.svg$2');

const CommentAvatarImage = ({ src, size, className }) => {
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <SocialAvatarImage
      src={imgSrc}
      className={className}
      style={{ width: size, height: size }}
      onError={() => {
        const fallback = avatarFallbackSrc(imgSrc);
        if (fallback !== imgSrc) setImgSrc(fallback);
      }}
    />
  );
};

const CommentAvatar = ({ comment, onProfileClick, size = 32 }) => {
  if (comment.isLocal) return <LocalUserAvatar />;
  if (comment.isCompany) {
    return (
      <span
        className="flex shrink-0 overflow-hidden rounded-full border border-[#dbdbdb] bg-white"
        style={{ width: size, height: size }}
      >
        <CommentAvatarImage
          src={comment.avatar}
          size={size}
          className="h-full w-full bg-white object-contain object-center p-0.5"
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onProfileClick(comment.author)}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0095F6]"
      aria-label={`Profil von ${comment.author}`}
    >
      <CommentAvatarImage src={comment.avatar} size={size} className="rounded-full object-cover" />
    </button>
  );
};

const CommentRow = ({ comment, postId, onProfileClick, isCommentLiked, onToggleCommentLike, nested }) => {
  const liked = isCommentLiked(postId, comment.id);

  return (
    <li className={cn('flex gap-3 text-[14px]', nested && 'ml-10 mt-2')}>
      <CommentAvatar comment={comment} onProfileClick={onProfileClick} size={nested ? 28 : 32} />
      <div className="min-w-0 flex-1">
        <p className="leading-snug text-[#262626]">
          {comment.isLocal || comment.isCompany ? (
            <span className="mr-1 font-semibold">{comment.author}</span>
          ) : (
            <button
              type="button"
              onClick={() => onProfileClick(comment.author)}
              className="mr-1 font-semibold hover:underline"
            >
              {comment.author}
            </button>
          )}
          <span>{comment.text}</span>
        </p>
        <p className="mt-1 flex gap-3 text-[12px] text-[#8e8e8e]">
          <span>{comment.publishedAt}</span>
          <button
            type="button"
            onClick={() => onToggleCommentLike(postId, comment.id)}
            className={cn('font-semibold', liked && 'text-[#262626]')}
          >
            {liked ? 'Gefällt dir' : 'Gefällt mir'}
          </button>
        </p>
        {comment.replies?.map((reply) => (
          <ul key={reply.id} className="mt-2 list-none p-0">
            <CommentRow
              comment={reply}
              postId={postId}
              onProfileClick={onProfileClick}
              isCommentLiked={isCommentLiked}
              onToggleCommentLike={onToggleCommentLike}
              nested
            />
          </ul>
        ))}
      </div>
    </li>
  );
};

const InstagramPostModal = ({ post, onClose, onProfileClick, onProfileGate, engagement }) => {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);

  const liked = engagement.isPostLiked(post.id);
  const userComments = engagement.getUserComments(post.id);
  const allComments = [...post.comments, ...userComments];
  const commentTotal = countPostComments(allComments);
  const expanded = engagement.isCommentsExpanded(post.id);
  const visibleComments = expanded ? allComments : [];
  const showCommentsPrompt = commentTotal > 0 && !expanded;
  const likeCount = post.likes + (liked ? 1 : 0);
  const needsCaptionClamp = post.caption.length > CAPTION_CLAMP;

  const toggleComments = () => engagement.onToggleExpandedComments(post.id);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submitComment = () => {
    if (!draft.trim()) return;
    engagement.onAddComment(post.id, draft);
    setDraft('');
    setComposerOpen(false);
  };

  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (!liked) engagement.onTogglePostLike(post.id);
      setHeartBurst(true);
      window.setTimeout(() => setHeartBurst(false), 900);
    }
    lastTapRef.current = now;
  };

  if (!post) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-2 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Schließen" className="absolute inset-0" onClick={onClose} />

      <div
        className={cn(SOCIAL_PREVIEW_LIGHT, 'relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-[935px] flex-col overflow-hidden rounded-lg bg-white sm:flex-row')}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-20 rounded p-1 text-[#262626] hover:bg-black/5 sm:hidden"
          aria-label="Schließen"
        >
          <X className="h-6 w-6" />
        </button>

        <div
          className="relative flex min-h-[240px] flex-1 cursor-pointer items-center justify-center bg-black sm:max-w-[58%]"
          onClick={onImageTap}
          onKeyDown={(e) => e.key === 'Enter' && onImageTap()}
          role="button"
          tabIndex={0}
          aria-label="Doppeltippen zum Liken"
        >
          <img src={post.image} alt={post.imageAlt ?? ''} className="max-h-[min(70vh,700px)] w-full object-contain" />
          {heartBurst && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="h-24 w-24 animate-ping fill-white text-white/90" strokeWidth={0} />
            </span>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col sm:max-w-[42%]">
          <header className="flex items-center gap-3 border-b border-[#efefef] px-4 py-3">
            <ProfileAvatar size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[14px] font-semibold text-[#262626]">
                {instagramProfile.username}
                {instagramProfile.verified && <VerifiedBadge />}
              </p>
            </div>
            <button type="button" onClick={onClose} className="hidden rounded p-1 sm:block" aria-label="Schließen">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mb-3 flex gap-3">
              <ProfileAvatar size={36} />
              <p className="text-[14px] leading-snug text-[#262626]">
                <span className="mr-1 font-semibold">{instagramProfile.username}</span>
                {needsCaptionClamp && !captionExpanded
                  ? `${post.caption.slice(0, CAPTION_CLAMP).trim()}… `
                  : `${post.caption} `}
                {needsCaptionClamp && (
                  <button
                    type="button"
                    onClick={() => setCaptionExpanded((e) => !e)}
                    className="text-[#8e8e8e]"
                  >
                    {captionExpanded ? 'weniger' : 'mehr'}
                  </button>
                )}
              </p>
            </div>

            {(showCommentsPrompt || visibleComments.length > 0) && (
              <ul className="space-y-3">
                {showCommentsPrompt && (
                  <li>
                    <button
                      type="button"
                      onClick={toggleComments}
                      className="flex items-center gap-1 text-[14px] font-normal text-[#8e8e8e] hover:text-[#262626]"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Alle {formatCount(commentTotal)} Kommentare anzeigen
                    </button>
                  </li>
                )}
                {visibleComments.map((c) => (
                  <CommentRow
                    key={c.id}
                    comment={c}
                    postId={post.id}
                    onProfileClick={onProfileClick}
                    isCommentLiked={engagement.isCommentLiked}
                    onToggleCommentLike={engagement.onToggleCommentLike}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-[#efefef] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button type="button" onClick={onProfileGate} aria-label="Gefällt mir">
                  <Heart className="h-6 w-6 text-[#262626]" strokeWidth={1.75} />
                </button>
                <button type="button" onClick={onProfileGate} aria-label="Kommentieren">
                  <MessageCircle className="h-6 w-6 text-[#262626]" strokeWidth={1.75} />
                </button>
                <button type="button" onClick={onProfileGate} aria-label="Teilen">
                  <Send className="h-6 w-6 text-[#262626]" strokeWidth={1.75} />
                </button>
              </div>
              <button type="button" onClick={onProfileGate} aria-label="Speichern">
                <Bookmark className="h-6 w-6 text-[#262626]" strokeWidth={1.75} />
              </button>
            </div>

            <p className="mt-2 text-[14px] font-semibold text-[#262626]">
              {liked ? (
                <>
                  Gefällt <span className="font-normal text-[#262626]">dir</span>
                  {likeCount > 1 && (
                    <>
                      {' '}
                      und <span className="font-normal">{formatCount(likeCount - 1)} anderen</span>
                    </>
                  )}
                </>
              ) : (
                <>{formatCount(likeCount)} Likes</>
              )}
            </p>
            {showCommentsPrompt && (
              <button
                type="button"
                onClick={toggleComments}
                className="mt-1 text-[14px] text-[#8e8e8e] hover:text-[#262626]"
              >
                Alle {formatCount(commentTotal)} Kommentare anzeigen
              </button>
            )}
            <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8e8e8e]">{post.publishedAt}</p>

            {composerOpen && (
              <div className="mt-3 flex gap-2 border-t border-[#efefef] pt-3">
                <LocalUserAvatar />
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  placeholder="Kommentar hinzufügen …"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none placeholder:text-[#8e8e8e]"
                />
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!draft.trim()}
                  className="text-[14px] font-semibold text-[#0095F6] disabled:opacity-40"
                >
                  Posten
                </button>
              </div>
            )}
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default InstagramPostModal;
