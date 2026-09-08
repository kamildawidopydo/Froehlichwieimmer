import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

/**
 * Session 82.46 — Route Consolidation.
 *
 * Ersetzt die Legacy-Detailrouten
 *   - /nachrichten/:slug
 *   - /news/nachrichten/:slug
 * mit einer permanenten Weiterleitung auf die kanonische Route
 *   - /news/:slug
 *
 * Erhält Query-Parameter und Hash unverändert, damit UTM-Tracking und
 * Deep-Anchors (z. B. #kommentare) über den Redirect hinweg bestehen bleiben.
 * `replace` verhindert Redirect-Loops und ersetzt den Verlaufseintrag —
 * die Legacy-URL taucht nach dem Redirect nicht mehr im Back-Button auf.
 */
const LegacyNewsDetailRedirect = () => {
  const { slug } = useParams();
  const { search, hash } = useLocation();

  if (!slug) {
    return <Navigate to="/news" replace />;
  }

  return (
    <Navigate
      to={{ pathname: `/news/${slug}`, search, hash }}
      replace
    />
  );
};

export default LegacyNewsDetailRedirect;
