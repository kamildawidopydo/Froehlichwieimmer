/**
 * Ersatz für react-helmet-async: React 19 hebt <title>/<meta>/<link>/<script>
 * automatisch in den <head>. Helmet rendert seine Kinder daher direkt.
 */
import React from "react";

export function Helmet({ children }) {
  return <>{children}</>;
}
export function HelmetProvider({ children }) {
  return <>{children}</>;
}
export default Helmet;
