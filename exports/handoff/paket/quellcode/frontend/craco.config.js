// craco.config.js
const path = require("path");
require("dotenv").config();

// Create React App only inlines REACT_APP_* into the browser bundle.
// Vercel/Supabase dashboards often define SUPABASE_* or NEXT_PUBLIC_* — map them here before build.
if (!process.env.REACT_APP_SUPABASE_URL?.trim()) {
  process.env.REACT_APP_SUPABASE_URL =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    '';
}
if (!process.env.REACT_APP_SUPABASE_ANON_KEY?.trim()) {
  process.env.REACT_APP_SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_API_KEY?.trim() ||
    '';
}

const isDevServer = process.env.NODE_ENV !== "production";

const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        /Critical dependency: the request of a dependency is an expression/,
      ];

      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };

      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // Nur auf localhost binden; Zugriff über LAN-IP (z. B. 10.x.x.x:3000) verhindern
  devServerConfig.host = "0.0.0.0";

  // /api/* (except unsplash) → local API server on port 3001 (scripts/dev-api-server.js)
  devServerConfig.proxy = [
    {
      context: (pathname) =>
        pathname.startsWith('/api') && !pathname.startsWith('/api/unsplash-proxy'),
      target: `http://127.0.0.1:${process.env.DEV_API_PORT || 3001}`,
      changeOrigin: true,
      secure: false,
      proxyTimeout: 120000,
      timeout: 120000,
    },
  ];

  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }
      setupHealthEndpoints(devServer, healthPluginInstance);
      return middlewares;
    };
  }

  return devServerConfig;
};

if (isDevServer) {
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;