import React, { useState } from 'react';
import { ThumbsUp, MessageCircle, Repeat2, Send, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import linkedinProfile from '@/data/social/linkedinProfile';
import { countPostComments, formatCount } from '@/data/social/formatCount';
import { REACTION_META, CompanyLogo, LocalUserAvatar, LI } from '@/components/social/linkedin/linkedinShared';
import { SocialBrandLogo } from '@/components/social/SocialBrandLogo';
import SocialAvatarImage from '@/components/social/SocialAvatarImage';

const TEXT_CLAMP = 220;
const VISIBLE_COMMENTS = 2;

const ReactionPile = ({ post, getPostReaction }) => {
  const types = ['like', 'insightful', 'love'];
  const userReaction = getPostReaction(post.id);
  const pile = userReaction && !types.includes(userReaction) ? [userReaction, ...types.slice(0, 2)] : types;
  return (
    <span className="inline-flex -space-x-1" aria-hidden>
      {pile.map((t) => (
        <span
          key={t}
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white text-[10px]"
          style={{ backgroundColor: REACTION_META[t]?.bg ?? LI }}
        >
          {REACTION_META[t]?.emoji ?? '👍'}
        </span>
      ))}
    </span>
  );
};

const PostText = ({ text, headline }) => {
  const [expanded, setExpanded] = useState(false);
  const needsClamp = text.length > TEXT_CLAMP;
  const display = needsClamp && !expanded ? `${text.slice(0, TEXT_CLAMP).trim()}…` : text;

  return (
    <div className="px-4 pt-3">
      {headline && (
        <h3 className="mb-2 text-[15px] font-semibold leading-snug text-[rgba(0,0,0,0.9)]">{headline}</h3>
      )}
      <p className="whitespace-pre-line text-[14px] font-normal leading-relaxed text-[rgba(0,0,0,0.9)]">{display}</p>
      {needsClamp && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-[14px] font-semibold text-[#666] hover:text-[#0A66C2] hover:underline"
        >
          {expanded ? '…weniger anzeigen' : '…mehr anzeigen'}
        </button>
      )}
    </div>
  );
};

const CommentAvatar = ({ comment, onProfileClick }) => {
  if (comment.isLocal) return <LocalUserAvatar />;
  if (comment.isCompany) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E0E0E0] bg-white px-0.5 py-1">
        <SocialBrandLogo src={comment.avatar} fit="wide" />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onProfileClick(comment.author)}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]"
      aria-label={`Profil von ${comment.author} anzeigen`}
    >
      <SocialAvatarImage src={comment.avatar} className="h-10 w-10 rounded-full object-cover" />
    </button>
  );
};

const CommentRow = ({ comment, postId, onProfileClick, isCommentLiked, onToggleCommentLike, nested }) => {
  const liked = isCommentLiked(postId, comment.id);
  const isLocal = comment.isLocal;
  const isCompany = comment.isCompany;

  return (
    <li className={cn('flex gap-2', nested ? 'ml-12 mt-2 border-t-0 pt-2' : 'border-t border-[#E0E0E0] py-3 first:border-t-0 first:pt-0')}>
      <CommentAvatar comment={comment} onProfileClick={onProfileClick} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px]">
          {isLocal || isCompany ? (
            <span className="font-semibold text-[rgba(0,0,0,0.9)]">{comment.author}</span>
          ) : (
            <button
              type="button"
              onClick={() => onProfileClick(comment.author)}
              className="font-semibold text-[rgba(0,0,0,0.9)] hover:text-[#0A66C2] hover:underline"
            >
              {comment.author}
            </button>
          )}
          <span className="text-[#666]"> · {comment.publishedAt}</span>
        </div>
        <p className="mt-0.5 text-[14px] leading-snug text-[rgba(0,0,0,0.9)]">{comment.text}</p>
        <p className="mt-1 flex gap-3 text-[12px] font-semibold text-[#666]">
          <button
            type="button"
            onClick={() => onToggleCommentLike(postId, comment.id)}
            className={cn('hover:text-[#0A66C2]', liked && 'text-[#0A66C2]')}
          >
            Gefällt mir
          </button>
          {!isLocal && !isCompany && (
            <button type="button" className="hover:text-[#0A66C2]" onClick={() => onProfileClick(comment.author)}>
              Antworten
            </button>
          )}
        </p>
        {comment.replies?.map((reply) => (
          <ul key={reply.id} className="mt-0 list-none p-0">
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

const LinkedInPostCard = ({ post, pinned, onProfileClick, onProfileGate, onOpenPostMedia, engagement }) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const userReaction = engagement.getPostReaction(post.id);
  const reposted = engagement.isPostReposted(post.id);
  const userComments = engagement.getUserComments(post.id);
  const allComments = [...post.comments, ...userComments];
  const expanded = engagement.isCommentsExpanded(post.id);
  const hasHidden = post.comments.length > VISIBLE_COMMENTS;
  const visibleComments = expanded ? allComments : allComments.slice(0, VISIBLE_COMMENTS);
  const hiddenCount = allComments.length - VISIBLE_COMMENTS;

  const reactionCount = post.reactions + (userReaction ? 1 : 0);
  const repostCount = post.reposts + (reposted ? 1 : 0);
  const commentTotal = countPostComments(allComments);

  const submitComment = () => {
    if (!draft.trim()) return;
    engagement.onAddComment(post.id, draft);
    setDraft('');
    setComposerOpen(false);
  };

  return (
    <article className="overflow-hidden rounded-lg border border-[#E0E0E0] bg-white">
      {pinned && (
        <p className="flex items-center gap-1 border-b border-[#E0E0E0] bg-[#F3F2EF] px-4 py-1.5 text-[12px] font-semibold text-[#666]">
          <span aria-hidden>📌</span> Angeheftet
        </p>
      )}
      <header className="flex gap-2 px-4 pt-4">
        <button type="button" onClick={() => onProfileClick(linkedinProfile.companyName)} className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]" aria-label="Profil anzeigen">
          <CompanyLogo size={48} />
        </button>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">{linkedinProfile.companyName}</p>
          <p className="text-[12px] text-[#666]">{formatCount(linkedinProfile.stats.followers)} Follower</p>
          <p className="flex items-center gap-1 text-[12px] text-[#666]">
            {post.publishedAt} · <Globe className="h-3 w-3" aria-hidden />
          </p>
        </div>
      </header>
      <PostText text={post.text} headline={post.headline} />
      {post.image && (
        <div className="mt-3">
          {onOpenPostMedia ? (
            <button
              type="button"
              onClick={() => onOpenPostMedia(post.id)}
              className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]"
              aria-label={`Bild vergrößern: ${post.imageAlt ?? post.headline ?? 'Beitrag'}`}
              data-testid={`li-post-image-${post.id}`}
            >
              <img
                src={post.image}
                alt={post.imageAlt ?? ''}
                className="aspect-[1.91/1] w-full bg-[#F3F2EF] object-cover transition-opacity hover:opacity-95"
                loading="lazy"
              />
            </button>
          ) : (
            <img src={post.image} alt={post.imageAlt ?? ''} className="aspect-[1.91/1] w-full bg-[#F3F2EF] object-cover" loading="lazy" />
          )}
        </div>
      )}
      {post.linkPreview && (
        <a
          href={post.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 mt-3 block overflow-hidden rounded-md border border-[#E0E0E0] hover:bg-[#00000006]"
        >
          <img src={post.linkPreview.image} alt="" className="aspect-[1.91/1] w-full object-cover" loading="lazy" />
          <div className="border-t border-[#E0E0E0] bg-[#F3F2EF] px-3 py-2">
            <p className="text-[12px] text-[#666]">{post.linkPreview.url.replace(/^https?:\/\//, '')}</p>
            <p className="text-[14px] font-semibold text-[rgba(0,0,0,0.9)]">{post.linkPreview.title}</p>
            <p className="text-[12px] text-[#666]">{post.linkPreview.description}</p>
          </div>
        </a>
      )}
      <div className="flex items-center gap-2 px-4 py-2 text-[12px] text-[#666]">
        <ReactionPile post={post} getPostReaction={engagement.getPostReaction} />
        <span>{formatCount(reactionCount)}</span>
        <span className="ml-auto">
          {formatCount(commentTotal)} Kommentare · {formatCount(repostCount)} Reposts
        </span>
      </div>
      <div className="relative grid grid-cols-4 border-t border-[#E0E0E0] px-2 py-1 text-[#666]">
        <button
          type="button"
          onClick={onProfileGate}
          className="flex w-full items-center justify-center gap-1.5 rounded-md py-3 text-[14px] font-semibold transition-colors hover:bg-[#0000000a]"
        >
          <ThumbsUp className="h-5 w-5" strokeWidth={1.5} />
          Gefällt mir
        </button>
        <button
          type="button"
          onClick={onProfileGate}
          className="flex items-center justify-center gap-1.5 rounded-md py-3 text-[14px] font-semibold transition-colors hover:bg-[#0000000a]"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
          Kommentieren
        </button>
        <button
          type="button"
          onClick={onProfileGate}
          className="flex items-center justify-center gap-1.5 rounded-md py-3 text-[14px] font-semibold transition-colors hover:bg-[#0000000a]"
        >
          <Repeat2 className="h-5 w-5" strokeWidth={1.5} />
          Reposten
        </button>
        <button
          type="button"
          onClick={onProfileGate}
          className="flex items-center justify-center gap-1.5 rounded-md py-3 text-[14px] font-semibold text-[#666] transition-colors hover:bg-[#0000000a]"
          aria-label="Senden"
        >
          <Send className="h-5 w-5" strokeWidth={1.5} />
          <span className="sr-only">Senden</span>
        </button>
      </div>
      {composerOpen && (
        <div className="flex gap-2 border-t border-[#E0E0E0] px-4 py-3">
          <LocalUserAvatar />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Einen Kommentar hinzufügen …"
              className="w-full rounded-md border border-[#E0E0E0] px-3 py-2 text-[14px] outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitComment}
                disabled={!draft.trim()}
                className="rounded-full px-4 py-1.5 text-[14px] font-semibold text-[#0A66C2] hover:bg-[#0A66C2]/10 disabled:opacity-40"
              >
                Kommentieren
              </button>
            </div>
          </div>
        </div>
      )}
      {allComments.length > 0 && (
        <div className="px-4 pb-4">
          {hasHidden && !expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => engagement.onToggleExpandedComments(post.id)}
              className="mb-2 flex items-center gap-1 text-[14px] font-semibold text-[#666] hover:text-[#0A66C2]"
            >
              <ChevronDown className="h-4 w-4" />
              Weitere Kommentare laden ({hiddenCount})
            </button>
          )}
          <ul>
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

export default LinkedInPostCard;
