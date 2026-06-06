/**
 * File Proxy Route
 *
 * GET /api/files/proxy?url=<encoded_url>
 *
 * Fetches a file from the CRM (or CDN/S3) and streams it back to the client.
 *
 * Auth strategy:
 *   - If the file URL is on the same hostname as the CRM (centerId), forward
 *     the student's CRM Bearer token so authenticated CRM files are accessible.
 *   - For any other hostname (CDN, S3, public storage) we do NOT send the
 *     Bearer token — those servers reject unknown auth headers with 400/403.
 *   - Fallback: if auth fetch still fails (400/401/403), retry once without auth.
 *
 * Supports HTTP Range requests so browsers can seek audio/video correctly.
 *
 * Auth: JWT token via Authorization header or ?token= query param.
 */

import { Router, type IRouter } from "express";
import { requireStudent } from "../middleware/student-auth.js";

const router: IRouter = Router();

router.use(requireStudent);

function crmHostname(centerId: string): string | null {
  try {
    const raw = /^https?:\/\//i.test(centerId) ? centerId : `https://${centerId}`;
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function proxyFetch(
  fileUrl: string,
  rangeHeader: string | undefined,
  crmToken: string | undefined,
  centerId: string | undefined
): Promise<Response> {
  const isCrmUrl = (() => {
    if (!crmToken || !centerId) return false;
    try {
      const fileHost = new URL(fileUrl).hostname.toLowerCase();
      const crmHost = crmHostname(centerId);
      return crmHost !== null && fileHost === crmHost;
    } catch {
      return false;
    }
  })();

  const baseHeaders: Record<string, string> = {
    "User-Agent": "EasyEdu-MiniApp/1.0",
  };
  if (rangeHeader) baseHeaders["Range"] = rangeHeader;

  const headersWithAuth: Record<string, string> = {
    ...baseHeaders,
    ...(isCrmUrl && crmToken ? { Authorization: `Bearer ${crmToken}` } : {}),
  };

  const response = await fetch(fileUrl, { headers: headersWithAuth });

  // If auth caused a rejection on a non-CRM URL, retry without auth
  if (!response.ok && response.status !== 206 && [400, 401, 403].includes(response.status) && isCrmUrl) {
    console.warn(`[files-proxy] auth attempt got ${response.status} for ${fileUrl}, retrying without auth`);
    return fetch(fileUrl, { headers: baseHeaders });
  }

  return response;
}

router.get("/files/proxy", async (req, res): Promise<void> => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : null;

  if (!rawUrl) {
    res.status(400).json({ error: "Missing ?url= parameter" });
    return;
  }

  let fileUrl: string;
  try {
    fileUrl = decodeURIComponent(rawUrl);
    new URL(fileUrl); // validate
  } catch {
    res.status(400).json({ error: "Invalid file URL" });
    return;
  }

  console.log(`[files-proxy] fetching: ${fileUrl.slice(0, 120)}`);

  const rangeHeader = typeof req.headers["range"] === "string" ? req.headers["range"] : undefined;

  try {
    const upstream = await proxyFetch(
      fileUrl,
      rangeHeader,
      req.student?.crmToken,
      req.student?.centerId
    );

    if (!upstream.ok && upstream.status !== 206) {
      console.warn(`[files-proxy] upstream error ${upstream.status} for ${fileUrl.slice(0, 80)}`);
      res.status(upstream.status).json({ error: `Upstream error: ${upstream.status}` });
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const acceptRanges = upstream.headers.get("accept-ranges");
    const contentRange = upstream.headers.get("content-range");

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    // Always serve inline so Zalo WebView iframes can render the file instead of downloading it.
    // Do NOT forward Content-Disposition: attachment from the CRM.
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", acceptRanges ?? "bytes");

    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const stream = new ReadableStream({
      start(controller) {
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) { controller.close(); return; }
            controller.enqueue(value);
            push();
          }).catch((err) => controller.error(err));
        }
        push();
      },
    });

    const nodeStream = await streamToNodeReadable(stream);
    nodeStream.pipe(res);
  } catch (err) {
    console.error("[files-proxy] fetch error:", (err as Error).message);
    res.status(502).json({ error: "Không thể tải file. Vui lòng thử lại." });
  }
});

async function streamToNodeReadable(webStream: ReadableStream<Uint8Array>) {
  const { Readable } = await import("stream");
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        this.push(Buffer.from(value));
      }
    },
  });
}

export default router;
