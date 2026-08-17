import React, { useState } from 'react';
import { ThumbsUp, MessageCircle, Share2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import facebookProfile from '@/data/social/facebookProfile';
import { countPostComments, formatCount } from '@/data/social/formatCount';
import {
  FB_REACTION_META,
  FB_BLUE,
  PageAvatar,
  LocalUserAvatar,
  cardClass,
} from '@/components/social/facebook/facebookShared';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';
import SocialAvatarImage from '@/components/social/SocialAvatarImage';

const TEXT_CLAMP = 240;
const VISIBLE_COMMENTS = 2;

const ReactionPile = ({ post, getPostReaction }) => {
  const types = ['like', 'love', 'haha'];
  const userReaction = getPostReaction(post.id);
  const pile = userReaction && !types.includes(userReaction) ? [userReaction, ...types.slice(0, 2)] : types;
  return (
    <span className="inline-flex -space-x-1" aria-hidden>
      {pile.map((t) => (
        <span
          key={t}
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white text-[10px]"
          style={{ backgroundColor: FB_REACTION_META[t]?.bg ?? FB_BLUE }}
        >
          {FB_REACTION_META[t]?.emoji ?? '👍'}
        </span>
      ))}
    </span>
  );
};

const PostText = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const needsClamp = text.length > TEXT_CLAMP;
  const display = needsClamp && !expanded ? `${text.slice(0, TEXT_CLAMP).trim()}…` : text;

  return (
    <div className="px-4 pt-3">
      <p className="whitespace-pre-line text-[15px] leading-snug text-[#050505]">{display}</p>
      {needsClamp && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-[15px] font-semibold text-[#65676b] hover:text-[#1877F2]"
        >
          {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
        </button>
      )}
    </div>
  );
};

const CommentAvatar = ({ comment, onProfileClick, size = 32 }) => {
  if (comment.isLocal) return <LocalUserAvatar />;
  if (comment.isCompany) {
    return (
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#dddfe2] bg-white px-0.5 py-1"
        style={{ width: size, height: size }}
      >
        <SocialBrandLogo src={comment.avatar} fit="wide" />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onProfileClick(comment.author)}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
      aria-label={`Profil von ${comment.author} anzeigen`}
    >
      <SocialAvatarImage
        src={comment.avatar}
        className="rounded-full border border-[#dddfe2] object-cover"
        style={{ width: size, height: size }}
      />
    </button>
  );
};

const CommentRow = ({ comment, postId, onProfileClick, isCommentLiked, onToggleCommentLike, nested }) => {
  const liked = isCommentLiked(postId, comment.id);
  const isLocal = comment.isLocal;
  const isCompany = comment.isCompany;

  const bubble = (
    <div className="inline-block max-w-full rounded-[18px] bg-[#f0f2f5] px-3 py-2 text-left">
      {isLocal || isCompany ? (
        <p className="text-[13px] font-semibold text-[#050505]">{comment.author}</p>
      ) : (
        <button
          type="button"
          onClick={() => onProfileClick(comment.author)}
          className="text-[13px] font-semibold text-[#050505] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]"
        >
          {comment.author}
        </button>
      )}
      <p className="text-[15px] leading-snug text-[#050505]">{comment.text}</p>
    </div>
  );

  if (nested) {
    return (
      <li className="ml-10 mt-2 flex gap-2">
        <CommentAvatar comment={comment} onProfileClick={onProfileClick} />
        <div>
          {bubble}
          <p className="mt-1 flex gap-2 px-3 text-[12px] font-semibold text-[#65676b]">
            <span>{comment.publishedAt}</span>
            <button
              type="button"
              onClick={() => onToggleCommentLike(postId, comment.id)}
              className={cn('hover:underline', liked && 'text-[#1877F2]')}
            >
              Gefällt mir
            </button>
          </p>
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-2">
      <CommentAvatar comment={comment} onProfileClick={onProfileClick} />
      <div className="min-w-0">
        {bubble}
        <p className="mt-1 flex flex-wrap gap-2 px-3 text-[12px] font-semibold text-[#65676b]">
          <span>{comment.publishedAt}</span>
          <button
            type="button"
            onClick={() => onToggleCommentLike(postId, comment.id)}
            className={cn('hover:underline', liked && 'text-[#1877F2]')}
          >
            Gefällt mir
          </button>
          {!isLocal && !isCompany && (
            <button type="button" className="hover:underline" onClick={() => onProfileClick(comment.author)}>
              Antworten
            </button>
          )}
        </p>
        {comment.replies?.map((reply) => (
          <ul key={reply.id} className="list-none p-0">
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

const FacebookPostCard = ({ post, pinned, onProfileClick, onProfileGate, engagement }) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const userReaction = engagement.getPostReaction(post.id);
  const shared = engagement.isPostShared(post.id);
  const userComments = engagement.getUserComments(post.id);
  const allComments = [...post.comments, ...userComments];
  const expanded = engagement.isCommentsExpanded(post.id);
  const hasHidden = post.comments.length > VISIBLE_COMMENTS;
  const visibleComments = expanded ? allComments : allComments.slice(0, VISIBLE_COMMENTS);
  const hiddenCount = allComments.length - VISIBLE_COMMENTS;
  const reactionCount = post.reactions + (userReaction ? 1 : 0);
  const shareCount = post.shares + (shared ? 1 : 0);
  const commentTotal = countPostComments(allComments);

  const submitComment = () => {
    if (!draft.trim()) return;
    engagement.onAddComment(post.id, draft);
    setDraft('');
    setComposerOpen(false);
  };

  return (
    <article className={cardClass}>
      {pinned && (
        <p className="flex items-center gap-1 border-b border-[#dddfe2] bg-[#f0f2f5] px-4 py-1.5 text-[12px] font-semibold text-[#65676b]">
          <span aria-hidden>📌</span> Angeheftet
        </p>
      )}
      <header className="flex items-center gap-2 px-4 pt-3">
        <button type="button" onClick={() => onProfileClick(facebookProfile.pageName)} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]" aria-label="Profil anzeigen">
          <PageAvatar size={40} />
        </button>
        <div>
          <p className="text-[15px] font-semibold text-[#050505]">{facebookProfile.pageName}</p>
          <p className="text-[13px] text-[#65676b]">{post.publishedAt}</p>
        </div>
      </header>
      <PostText text={post.text} />
      {post.image && (
        <div className="mt-3 px-4">
          <img
            src={post.image}
            alt={post.imageAlt ?? ''}
            className="aspect-[4/5] w-full rounded-lg border border-[#dddfe2] bg-[#f0f2f5] object-cover"
            loading="lazy"
          />
        </div>
      )}
      {post.linkPreview && (
        <a
          href={post.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 mt-3 block overflow-hidden rounded-lg border border-[#dddfe2] hover:bg-[#f0f2f5]"
        >
          <img src={post.linkPreview.image} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          <div className="border-t border-[#dddfe2] bg-[#f0f2f5] px-3 py-2">
            <p className="text-[12px] uppercase text-[#65676b]">{post.linkPreview.url.replace(/^https?:\/\//, '')}</p>
            <p className="text-[15px] font-semibold text-[#050505]">{post.linkPreview.title}</p>
            <p className="text-[13px] text-[#65676b]">{post.linkPreview.description}</p>
          </div>
        </a>
      )}
      <div className="flex items-center justify-between px-4 py-2.5 text-[13px] text-[#65676b]">
        <span className="inline-flex items-center gap-2">
          <ReactionPile post={post} getPostReaction={engagement.getPostReaction} />
          {formatCount(reactionCount)}
        </span>
        <span>
          {formatCount(commentTotal)} Kommentare · {formatCount(shareCount)} mal geteilt
        </span>
      </div>
      <div className="relative grid grid-cols-3 border-t border-b border-[#dddfe2] px-2 py-1 text-[#65676b]">
        <button
          type="button"
          onClick={onProfileGate}
          className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium transition-colors hover:bg-[#f0f2f5]"
        >
          <ThumbsUp className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Gefällt mir
        </button>
        <button
          type="button"
          onClick={onProfileGate}
          className="flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium transition-colors hover:bg-[#f0f2f5]"
        >
          <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Kommentieren
        </button>
        <button
          type="button"
          onClick={onProfileGate}
          className="flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-medium transition-colors hover:bg-[#f0f2f5]"
        >
          <Share2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
          Teilen
        </button>
      </div>
      {composerOpen && (
        <div className="flex gap-2 border-b border-[#dddfe2] px-4 py-3">
          <LocalUserAvatar />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Schreiben Sie einen Kommentar …"
              className="w-full rounded-full border border-[#ccd0d5] bg-[#f0f2f5] px-4 py-2 text-[15px] text-[#050505] outline-none focus:border-[#1877F2] focus:bg-white focus:ring-1 focus:ring-[#1877F2]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitComment}
                disabled={!draft.trim()}
                className="rounded-md bg-[#1877F2] px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Kommentieren
              </button>
            </div>
          </div>
        </div>
      )}
      {allComments.length > 0 && (
        <div className="px-4 py-3">
          {hasHidden && !expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => engagement.onToggleExpandedComments(post.id)}
              className="mb-3 flex items-center gap-1 text-[13px] font-semibold text-[#65676b] hover:text-[#1877F2]"
            >
              <ChevronDown className="h-4 w-4" />
              Weitere Kommentare anzeigen ({hiddenCount})
            </button>
          )}
          <ul className="space-y-3">
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
        </div>
      )}
    </article>
  );
};

export default FacebookPostCard;
