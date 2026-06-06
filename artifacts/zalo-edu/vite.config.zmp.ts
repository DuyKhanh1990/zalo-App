import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Separate Vite config for ZMP deploy builds.
//
// Key requirements for Zalo Mini App WebView:
//   1. Classic scripts only — WebView does NOT support type="module"
//   2. No `export` / `import` keywords in output bundles
//   3. No `import.meta` at runtime (only build-time replacements are safe)
//   4. No code splitting — a single IIFE file avoids dynamic import() calls
//
// Strategy:
//   - format: "iife"  → wraps everything in an immediately-invoked function,
//     no `export` or `import` keywords in the output
//   - inlineDynamicImports: true  → merges all lazy chunks into the single IIFE;
//     eliminates the `index.es-*.js` chunks that caused the failures
//   - target: "es2015"  → Vite/Rollup polyfills or rewrites any remaining
//     import.meta.* at build time; safe for older WebView engines
//   - modulePreload: false  → suppresses <link rel="modulepreload"> injection
//   - zmpHtmlClean plugin  → strips the Vite-injected `<script type="module">`
//     from index.html. ZMP runtime loads JS via listSyncJS (classic scripts),
//     so the HTML shell must have NO script tags — having a module script tag
//     here would cause "Unexpected keyword 'export'" even though the IIFE JS
//     itself is clean.
//   - base: "./"  → relative asset paths required by ZMP WebView (no web root)

/**
 * Strips Vite's auto-injected module script tags and modulepreload links from
 * the HTML output. ZMP WebView must never see type="module" — the runtime
 * loads all JS as classic scripts via app-config.json listSyncJS instead.
 */
function zmpHtmlClean(): Plugin {
  return {
    name: "zmp-html-clean",
    enforce: "post",
    transformIndexHtml(html) {
      return (
        html
          // Remove <link rel="modulepreload"> tags (unsupported by ZMP WebView)
          .replace(/<link rel="modulepreload"[^>]*\/?>/g, "")
          // Remove Vite-injected <script type="module" ...></script> tags.
          // ZMP loads the bundle via listSyncJS as a classic script; having
          // this tag would double-load the bundle AND trigger module errors.
          .replace(/<script\s+type="module"[^>]*><\/script>/g, "")
          .replace(/<script\s+type="module"[^>]*\/>/g, "")
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env, .env.production, etc. so VITE_* vars are available at build time.
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "VITE_");
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "";

  // Warn loudly during build if the URL is not set — catches CI/CD misconfig early.
  if (!apiBaseUrl) {
    console.warn(
      "[vite.config.zmp] WARNING: VITE_API_BASE_URL is not set. " +
      "API calls will use relative paths and will NOT reach the production backend. " +
      "Create .env.production with VITE_API_BASE_URL=https://easyeduv2.easyedu.vn",
    );
  } else {
    console.log("[vite.config.zmp] VITE_API_BASE_URL =", apiBaseUrl);
  }

  return {
  base: "./",
  plugins: [react(), tailwindcss(), zmpHtmlClean()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  define: {
    // Explicitly bake VITE_API_BASE_URL into the IIFE bundle.
    // The ZMP WebView build uses es2015/IIFE format which means standard
    // Vite env injection via import.meta.env may not survive all transforms.
    // Defining it here guarantees the value is statically replaced at build time.
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
    // Ensure any stray import.meta.url in third-party deps becomes an empty
    // string instead of breaking the IIFE build.
    "import.meta.url": JSON.stringify(""),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "www"),
    emptyOutDir: true,
    assetsDir: "assets",
    // Target es2015: Vite replaces / polyfills import.meta.* at build time.
    // Do NOT use esnext here — that keeps import.meta alive in output.
    target: "es2015",
    // No <link rel="modulepreload"> — not understood by ZMP WebView.
    modulePreload: false,
    rollupOptions: {
      output: {
        // IIFE = classic script wrapper; no export/import in output.
        format: "iife",
        // name is required for IIFE format.
        name: "ZaloApp",
        // Merge all lazy / dynamic chunks into the single entry bundle.
        // This is what eliminates the index.es-*.js chunks.
        inlineDynamicImports: true,
        // Predictable filenames so update-zmp-config.mjs can detect them.
        entryFileNames: "assets/index-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  };
});
