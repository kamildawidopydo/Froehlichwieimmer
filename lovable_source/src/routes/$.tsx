import { createFileRoute } from "@tanstack/react-router";
import LegacyShell from "@/components/LegacyShell";
import { SEO_PAGES, SITE_URL, isPrivatePath } from "@/lib/seoPages";

// Alle Originalpfade (160 Routen) laufen über den 1:1 übernommenen Routenbaum.
export const Route = createFileRoute("/$")({
  ssr: false,
  head: ({ params }) => {
    const path = "/" + String((params as { _splat?: string })._splat ?? "").replace(/\/+$/, "");
    const page = SEO_PAGES[path];
    const title = page?.title ?? "Fröhlich Vermögensberatung";
    const description =
      page?.description ?? "Zinsvergleich, Wissen und Vermögensverwaltung bei Fröhlich Vermögensberatung.";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: SITE_URL + path },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (isPrivatePath(path)) meta.push({ name: "robots", content: "noindex, nofollow" });
    return {
      meta,
      links: isPrivatePath(path) ? [] : [{ rel: "canonical", href: SITE_URL + path }],
    };
  },
  component: LegacyShell,
});
