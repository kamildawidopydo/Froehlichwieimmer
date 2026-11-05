import React from 'react';
import PublicVideoCard from '@/components/news/PublicVideoCard';

const PublicVideoGroups = ({ groups, highlightQuery = '' }) => {
  if (!groups?.length) return null;
  return (
    <div className="space-y-10">
      {groups.map(({ label, items }) => (
        <section key={label}>
          <h2 className="font-display mb-5 text-[1.25rem] font-light text-bank-text">
            {label}
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((video) => (
              <PublicVideoCard key={video.id} video={video} highlightQuery={highlightQuery} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default PublicVideoGroups;
