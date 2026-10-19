import { createFileRoute } from "@tanstack/react-router";
import LegacyShell from "@/components/LegacyShell";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fröhlich Vermögensberatung | Ihre Investments. Alle Banken. Eine Plattform." },
      { name: "description", content: "Tagesgeld, Festgeld & mehr bei über 100 europäischen Banken – auf einer Plattform vergleichen und verwalten. Sicher, übersichtlich und unverbindlich mit Fröhlich Vermögensberatung." },
      { property: "og:title", content: "Fröhlich Vermögensberatung | Ihre Investments. Alle Banken. Eine Plattform." },
      { property: "og:description", content: "Tagesgeld, Festgeld & mehr bei über 100 europäischen Banken – auf einer Plattform vergleichen und verwalten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://essenceinvest.com/" },
    ],
    links: [{ rel: "canonical", href: "https://essenceinvest.com/" }],
  }),
  component: LegacyShell,
});
