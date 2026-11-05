import React from 'react';
import { highlightParts } from '@/lib/news/highlightSearch';

const HighlightText = ({ text, query, className, highlightClassName }) => {
  const parts = highlightParts(text, query);
  if (!parts.length) return null;

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={`${index}-${part.text}`}
            className={
              highlightClassName ??
              'rounded-sm bg-bank-gold/25 px-0.5 text-inherit not-italic'
            }
          >
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={`${index}-${part.text}`}>{part.text}</React.Fragment>
        ),
      )}
    </span>
  );
};

export default HighlightText;
