// Session 81.09 — MUST be the very first import so that the axios.create
// monkey-patch is installed before any service module (marketService,
// watchlistApi, apiClient, etc.) creates its axios instance at module load.
import "@/lib/apiBaseFix";
import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import "@/index.css";
import App from "@/App";
import "./i18n";

/** Benign browser noise when RO callbacks affect layout in the same frame. */
const RESIZE_OBSERVER_LOOP =
  /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/;

window.addEventListener(
  "error",
  (event) => {
    if (event.message && RESIZE_OBSERVER_LOOP.test(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  },
  true,
);

const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.REACT_APP_RELEASE || "frontend@dev",
    tracesSampleRate: 0.1,
    ignoreErrors: [
      "ResizeObserver loop completed with undelivered notifications.",
      "ResizeObserver loop limit exceeded",
    ],
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <Sentry.ErrorBoundary fallback={<div className="p-4 text-sm">Etwas ist schiefgelaufen.</div>}>
        <App />
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
);
