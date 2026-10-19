import { createFileRoute } from "@tanstack/react-router";
import { SITEMAP_PATHS, SITE_URL } from "@/lib/seoPages";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = SITEMAP_PATHS.map(
          (p) => `  <url><loc>${SITE_URL}${p === "/" ? "/" : p}</loc></url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
