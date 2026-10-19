import React from 'react';
import { Play } from 'lucide-react';
import { formatCount } from '@/data/social/formatCount';

const ReelTile = ({ reel, onOpen }) => (
    <button
      type="button"
      onClick={() => onOpen(reel)}
      className="group relative aspect-[9/16] overflow-hidden bg-[#0A2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0095F6]"
    >
      <img
        src={reel.poster}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" aria-hidden />
      <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow-md">
        <Play className="h-3 w-3 fill-white" strokeWidth={0} />
        {formatCount(reel.views)}
      </span>
    </button>
);

const InstagramReelsGrid = ({ reels, onOpenReel }) => (
  <div className="grid grid-cols-3 gap-[2px]">
    {reels.map((reel) => (
      <ReelTile key={reel.id} reel={reel} onOpen={onOpenReel} />
    ))}
  </div>
);

export default InstagramReelsGrid;
