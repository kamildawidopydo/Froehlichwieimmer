// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Große Legacy-Modulgruppe: alle Abhängigkeiten beim Start vorbereiten,
    // sonst lädt Vite nachträglich neu und der Seiten-Chunk schlägt fehl.
    optimizeDeps: {
      entries: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.server.ts", "!src/routes/api/**"],
    },
    resolve: {
      alias: {
        // Originalprojekt nutzte react-router-dom → Brücke auf TanStack Router
        "react-router-dom": path.resolve(__dirname, "src/lib/reactRouterDom.jsx"),
        "react-helmet-async": path.resolve(__dirname, "src/lib/helmetCompat.jsx"),
      },
    },
    define: {
      "process.env.REACT_APP_BACKEND_URL": JSON.stringify(""),
      "process.env.REACT_APP_CLOUDINARY_CLOUD_NAME": JSON.stringify(""),
      "process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET": JSON.stringify(""),
      "process.env.REACT_APP_KREDIT_HERO_IMAGE_URL": JSON.stringify(""),
      "process.env.REACT_APP_RELEASE": JSON.stringify("froehlich-vermoegensberatung"),
      "process.env.REACT_APP_SENTRY_DSN": JSON.stringify(""),
      "process.env.PUBLIC_URL": JSON.stringify(""),
    },
  },
});
