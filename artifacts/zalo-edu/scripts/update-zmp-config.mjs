/**
 * Post-build script: reads www/assets/ and writes BOTH:
 *   1. root app-config.json  (source of truth)
 *   2. www/app-config.json   (what ZMP CLI actually uploads)
 *
 * Run automatically via: pnpm run build:zmp
 *
 * IIFE build notes:
 *   With format:"iife" + inlineDynamicImports:true in vite.config.zmp.ts,
 *   the build produces exactly ONE JS file (index-[hash].js).
 *   There are no lazy/dynamic chunks, so listAsyncJS is always [].
 *   All JS files are classic scripts — safe for Zalo Mini App WebView.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "www", "assets");
const rootConfig = path.join(rootDir, "app-config.json");
const wwwConfig = path.join(rootDir, "www", "app-config.json");

async function main() {
  let files;
  try {
    files = await readdir(assetsDir);
  } catch {
    console.error("❌ www/assets/ not found. Run build first.");
    process.exit(1);
  }

  const jsFiles = files.filter((f) => f.endsWith(".js"));
  const cssFiles = files.filter((f) => f.endsWith(".css"));

  // With IIFE + inlineDynamicImports there is only one JS output file.
  // All JS files are classic scripts — put everything in listSyncJS.
  // listAsyncJS must stay empty: Zalo WebView loads async entries as
  // classic scripts too, but having ES-module chunks here was the original
  // source of "Unexpected keyword 'export'" errors.
  const listSyncJS = jsFiles.map((f) => `assets/${f}`);
  const listAsyncJS = [];
  const listCSS = cssFiles.map((f) => `assets/${f}`);

  const raw = await readFile(rootConfig, "utf-8");
  const config = JSON.parse(raw);

  config.listSyncJS = listSyncJS;
  config.listAsyncJS = listAsyncJS;
  config.listCSS = listCSS;

  const output = JSON.stringify(config, null, 2) + "\n";

  await writeFile(rootConfig, output, "utf-8");
  await writeFile(wwwConfig, output, "utf-8");

  console.log("✅ app-config.json updated (root + www):");
  console.log("   listSyncJS  :", listSyncJS);
  console.log("   listAsyncJS :", listAsyncJS);
  console.log("   listCSS     :", listCSS);

  if (jsFiles.length > 1) {
    console.warn(
      `⚠️  Expected 1 JS file but found ${jsFiles.length}. Check that inlineDynamicImports is still enabled in vite.config.zmp.ts.`,
    );
  }
}

main();
