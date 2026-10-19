import React, { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { formatCount, countPostComments } from '@/data/social/formatCount';
const InstagramPostGrid = ({ posts, onOpenPost, isPostLiked }) => {
  const [hoverId, setHoverId] = useState(null);

  return (
    <div className="grid grid-cols-3 gap-[2px]">
      {posts.map((post) => {
        const liked = isPostLiked(post.id);
        const likeCount = post.likes + (liked ? 1 : 0);
        const commentTotal = countPostComments(post.comments);
        const showOverlay = hoverId === post.id;

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => onOpenPost(post)}
            onMouseEnter={() => setHoverId(post.id)}
            onMouseLeave={() => setHoverId(null)}
            onFocus={() => setHoverId(post.id)}
            onBlur={() => setHoverId(null)}
            className="group relative aspect-square bg-[#efefef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0095F6]"
          >
            <img
              src={post.image}
              alt={post.imageAlt ?? ''}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span
              className={`absolute inset-0 flex items-center justify-center gap-5 bg-black/45 text-white transition-opacity duration-150 ${
                showOverlay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              aria-hidden={!showOverlay}
            >
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold">
                <Heart className="h-5 w-5 fill-white" strokeWidth={0} />
                {formatCount(likeCount)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold">
                <MessageCircle className="h-5 w-5 fill-white/20" strokeWidth={1.75} />
                {formatCount(commentTotal)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default InstagramPostGrid;
