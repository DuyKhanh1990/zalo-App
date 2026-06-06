/**
 * FileViewerSheet
 *
 * In-app full-screen file viewer. Renders files through the API proxy
 * so authenticated CRM files (PDF, video, audio, image) work correctly
 * without needing to be publicly accessible.
 *
 * Usage:
 *   const [viewingFile, setViewingFile] = useState<{ url: string; name: string } | null>(null);
 *   <FileViewerSheet file={viewingFile} onClose={() => setViewingFile(null)} />
 */

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText, AlertCircle, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { getToken } from "@/lib/api-client";
import { openUrlSync } from "@/lib/zmp-sdk";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export type FileEntry = {
  url: string;
  name: string;
};

type FileType = "pdf" | "video" | "audio" | "image" | "office" | "other";

function detectType(url: string, name?: string): FileType {
  // Check URL first (has extension in the path, more reliable than display name)
  const urlLower = url.toLowerCase().split("?")[0];
  const nameLower = (name ?? "").toLowerCase().split("?")[0];

  function matchExt(s: string): FileType | null {
    if (s.match(/\.(pdf)$/)) return "pdf";
    if (s.match(/\.(mp4|mov|avi|webm|mkv|m3u8)$/)) return "video";
    if (s.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/)) return "audio";
    if (s.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) return "image";
    if (s.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) return "office";
    return null;
  }

  return matchExt(urlLower) ?? matchExt(nameLower) ?? "other";
}

function buildOfficeViewerUrl(absoluteUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Decode centerId from the stored JWT (client-side, no signature check needed).
 * Returns e.g. "easyeduv2.easyedu.vn"
 */
function getCenterId(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1])) as Record<string, unknown>;
    return typeof payload["centerId"] === "string" ? payload["centerId"] : null;
  } catch {
    return null;
  }
}

/**
 * Build the CRM base URL from centerId, e.g. "https://easyeduv2.easyedu.vn"
 */
function getCrmBase(): string | null {
  const centerId = getCenterId();
  if (!centerId) return null;
  return /^https?:\/\//i.test(centerId) ? centerId.replace(/\/$/, "") : `https://${centerId}`;
}

/**
 * Returns true only when the file URL lives on the CRM domain.
 * CDN/S3/public URLs on other domains return false.
 */
function isCrmUrl(absoluteUrl: string): boolean {
  try {
    const crmBase = getCrmBase();
    if (!crmBase) return false;
    const fileHost = new URL(absoluteUrl).hostname.toLowerCase();
    const crmHost = new URL(crmBase).hostname.toLowerCase();
    return fileHost === crmHost;
  } catch {
    return false;
  }
}

function buildProxyUrl(fileUrl: string): string {
  if (!fileUrl) return fileUrl;
  const token = getToken();
  const params = new URLSearchParams({ url: fileUrl });
  if (token) params.set("token", token);
  return `${API_BASE}/api/files/proxy?${params.toString()}`;
}

/**
 * Resolve a raw file URL to a usable URL for the browser:
 *
 * 1. Relative paths → resolve against CRM base URL (not the API server).
 * 2. Absolute URLs on the CRM domain → route through the authenticated proxy.
 * 3. Absolute URLs on any other domain (CDN, S3, …) → use directly;
 *    sending a Bearer token to those servers causes 400/403 errors.
 */
export function resolveAndProxy(url: string): string {
  if (!url) return url;

  let absolute: string;
  if (isAbsoluteUrl(url)) {
    absolute = url;
  } else {
    // Relative path — resolve against the actual CRM, not the API server
    const base = getCrmBase() ?? API_BASE;
    absolute = `${base}/${url.replace(/^\//, "")}`;
  }

  // Only proxy CRM-origin files that require the Bearer CRM token
  if (isCrmUrl(absolute)) {
    return buildProxyUrl(absolute);
  }

  // CDN / public storage → direct URL (no auth header needed)
  return absolute;
}

function handleOpenExternal(url: string) {
  openUrlSync(url);
}

function CopyLinkBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    try {
      void navigator.clipboard.writeText(url);
    } catch {
      // clipboard API unavailable — select a hidden input as fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
      style={{ borderTop: "1px solid #f1f5f9", background: "#fff" }}
    >
      <p className="flex-1 text-xs text-slate-400 truncate min-w-0">Link: {url}</p>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
        style={{ background: copied ? "#22c55e" : "#7c6fd4", color: "#fff" }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Đã sao chép" : "Copy link"}
      </button>
    </div>
  );
}

function IframeViewer({ iframeSrc, rawUrl }: { iframeSrc: string; rawUrl: string }) {
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Google Docs / Office Online may load silently even on error — treat
    // a load event arriving within 30s as success.
    timerRef.current = setTimeout(() => setLoading(false), 30000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [iframeSrc]);

  function handleLoad() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "#f8fafc" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "#7c6fd4" }} />
            <p className="text-xs text-slate-400">Đang tải xem trước...</p>
          </div>
        )}
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0"
          style={{ display: loading ? "none" : "block" }}
          onLoad={handleLoad}
          title="document preview"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
      <CopyLinkBar url={rawUrl} />
    </div>
  );
}

function PdfViewer({ rawUrl }: { rawUrl: string }) {
  const iframeSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  return <IframeViewer iframeSrc={iframeSrc} rawUrl={rawUrl} />;
}

function VideoViewer({ proxyUrl, name }: { proxyUrl: string; name: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-black">
      <video
        src={proxyUrl}
        controls
        playsInline
        className="max-w-full max-h-full"
        style={{ width: "100%", maxHeight: "100%" }}
      >
        <track kind="captions" />
        Trình duyệt không hỗ trợ phát video.
      </video>
    </div>
  );
}

function AudioViewer({ proxyUrl, name }: { proxyUrl: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center"
        style={{ background: "#7c6fd415" }}
      >
        <FileText size={40} style={{ color: "#7c6fd4" }} />
      </div>
      <p className="text-sm font-semibold text-slate-700 text-center px-4">{name}</p>
      <audio
        src={proxyUrl}
        controls
        preload="metadata"
        className="w-full max-w-xs"
      >
        Trình duyệt không hỗ trợ phát audio.
      </audio>
    </div>
  );
}

function ImageViewer({ proxyUrl, name }: { proxyUrl: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="flex items-center justify-center h-full bg-slate-900 p-4 overflow-auto">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-white/50" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm text-white/70">Không thể tải ảnh</p>
        </div>
      ) : (
        <img
          src={proxyUrl}
          alt={name}
          className="max-w-full max-h-full object-contain rounded"
          style={{ display: loaded ? "block" : "none" }}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(true); setError(true); }}
        />
      )}
    </div>
  );
}

/**
 * OfficeViewer — opens Office files via ZMP openDocument / system browser.
 * iframe approach doesn't work reliably in Zalo WebView.
 */
function OfficeViewer({ rawUrl }: { rawUrl: string }) {
  const iframeSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`;
  return <IframeViewer iframeSrc={iframeSrc} rawUrl={rawUrl} />;
}

function OtherViewer({ rawUrl }: { rawUrl: string }) {
  // Try Google Docs Viewer for unknown types — it supports many formats
  const iframeSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  return <IframeViewer iframeSrc={iframeSrc} rawUrl={rawUrl} />;
}

export function FileViewerSheet({
  file,
  onClose,
}: {
  file: FileEntry | null;
  onClose: () => void;
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.getElementById("sheet-root"));
  }, []);

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {file && (
        <FileViewerContent file={file} onClose={onClose} />
      )}
    </AnimatePresence>,
    portalRoot
  );
}

function FileViewerContent({ file, onClose }: { file: FileEntry; onClose: () => void }) {
  const type = detectType(file.url, file.name);
  const proxyUrl = resolveAndProxy(file.url);
  // rawUrl: the original (public S3 / CDN) URL — passed to Google Docs / Office Online
  // which need to fetch the file themselves without our auth proxy.
  const rawUrl = file.url;
  const isDark = type === "video" || type === "image";

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col" style={{ zIndex: 100 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: isDark ? "#000" : "#f8fafc" }}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="relative flex flex-col h-full"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: isDark ? "rgba(0,0,0,0.7)" : "#fff",
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f1f5f9",
          }}
        >
          <p
            className="text-sm font-semibold truncate flex-1 mr-3"
            style={{ color: isDark ? "#fff" : "#1e293b" }}
          >
            {file.name}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleOpenExternal(proxyUrl)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{
                background: isDark ? "rgba(255,255,255,0.12)" : "#f1f5f9",
                color: isDark ? "#fff" : "#64748b",
              }}
              title="Mở trong trình duyệt"
            >
              <Download size={15} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{
                background: isDark ? "rgba(255,255,255,0.12)" : "#f1f5f9",
                color: isDark ? "#fff" : "#64748b",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {type === "pdf"    && <PdfViewer rawUrl={rawUrl} />}
          {type === "video"  && <VideoViewer proxyUrl={proxyUrl} name={file.name} />}
          {type === "audio"  && <AudioViewer proxyUrl={proxyUrl} name={file.name} />}
          {type === "image"  && <ImageViewer proxyUrl={proxyUrl} name={file.name} />}
          {type === "office" && <OfficeViewer rawUrl={rawUrl} />}
          {type === "other"  && <OtherViewer rawUrl={rawUrl} />}
        </div>
      </motion.div>
    </div>
  );
}
