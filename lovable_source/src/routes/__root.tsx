import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const CHUNK_ERROR_RE =
  /dynamically imported module|Importing a module script failed|error loading dynamically/i;
const CHUNK_RELOAD_KEY = "km_chunk_reload_count";
const MAX_CHUNK_RELOADS = 3;

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  const isChunkError = CHUNK_ERROR_RE.test(normalizedError.message);
  const router = useRouter();
  useEffect(() => {
    // Nach einem Neustart der Vorschau sind alte Seitenteile ungültig → automatisch neu laden.
    if (isChunkError) {
      const count = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
      if (count < MAX_CHUNK_RELOADS) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(count + 1));
        const t = window.setTimeout(() => window.location.reload(), 600 * (count + 1));
        return () => window.clearTimeout(t);
      }
    }
    console.error(normalizedError);
    reportLovableError(normalizedError, { boundary: "tanstack_root_error_component" });
    return undefined;
  }, [normalizedError, isChunkError]);

  if (isChunkError && typeof window !== "undefined" &&
      Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0) <= MAX_CHUNK_RELOADS) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Seite wird geladen …</p>
      </div>
    );
  }



  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "hYP0XC_zHN20RHVB56KBOPJ1mnCJVPonksuLZRhF1D0" },
      { title: "Fröhlich Vermögensberatung – Zinsvergleich & Vermögen" },
      { name: "description", content: "Tagesgeld, Festgeld und Geldanlage in Europa mit Fröhlich Vermögensberatung vergleichen." },
      { property: "og:title", content: "Fröhlich Vermögensberatung – Zinsvergleich & Vermögen" },
      { property: "og:description", content: "Tagesgeld, Festgeld und Geldanlage in Europa mit Fröhlich Vermögensberatung vergleichen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
          ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Nach erfolgreichem Laden die Neulade-Zähler zurücksetzen, damit die
  // automatische Wiederherstellung auch beim nächsten Vorschau-Neustart greift.
  useEffect(() => {
    const t = window.setTimeout(() => {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("tanstack_router_reload:")) sessionStorage.removeItem(k);
      }
    }, 8000);
    const onPreloadError = (e: Event) => {
      e.preventDefault?.();
      const count = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
      if (count < MAX_CHUNK_RELOADS) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(count + 1));
        window.location.reload();
      }
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("vite:preloadError", onPreloadError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
