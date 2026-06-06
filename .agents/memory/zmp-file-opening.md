---
name: ZMP file opening
description: Correct pattern for opening file URLs in Zalo Mini App without losing user activation (gesture context).
---

## Core rule: openUrlSync, NOT openUrl (async)

Any `await` between a click handler and the `openOutApp` call — including `await import("zmp-sdk")` — causes Zalo WebView to silently drop the navigation. No error thrown. Nothing happens.

**The fix**: Pre-cache `openOutApp` at module load time so click handlers can call it synchronously.

## Implementation in zmp-sdk.ts

```ts
let _cachedOpenOutApp: ((opts: { url: string }) => Promise<void>) | null = null;

if (typeof window !== "undefined") {
  import("zmp-sdk")
    .then((sdk) => { _cachedOpenOutApp = sdk.openOutApp; })
    .catch(() => {});
}

export function openUrlSync(url: string): void {
  if (_cachedOpenOutApp) {
    _cachedOpenOutApp({ url }).catch(() => window.open(url, "_blank", "noopener,noreferrer"));
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
```

## Usage pattern in UI components

**DO NOT** call `openUrlSync` / `openOutApp` from `useEffect` — `useEffect` runs outside user gesture context.

**DO** show a `<button>` and call `openUrlSync(url)` directly from its `onClick`.

Example: FileViewerSheet shows PdfViewer / OfficeViewer / OtherViewer — each has a "Mở tài liệu" button that calls `handleOpenExternal(proxyUrl)` → `openUrlSync(proxyUrl)`.

## Do NOT use openDocument

`openDocument` resolves without throwing even when it fails (silent no-op confirmed in production). Can't detect failure. Dropped entirely.

## openWebview — do NOT use

Requires domain whitelist in Zalo Developer Console. Silently fails for non-whitelisted domains.

**Why:** Both openDocument and async openUrl failed silently. Root cause: `await import("zmp-sdk")` inside openUrl broke user activation state in Zalo WebView before openOutApp was reached.
