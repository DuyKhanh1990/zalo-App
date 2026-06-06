/**
 * CRM Proxy Utility
 *
 * Forwards authenticated requests from the Mini App server to the tenant CRM.
 * CRM uses the same /api/my-space/... path structure as the Mini App API.
 *
 * Usage:
 *   const data = await crmFetch(centerId, crmToken, "/api/my-space/calendar/student?month=2026-05");
 *   // Returns the CRM response JSON, or throws on error.
 */

function centerBaseUrl(centerId: string): string {
  return /^https?:\/\//i.test(centerId)
    ? centerId.replace(/\/$/, "")
    : `https://${centerId}`;
}

export async function crmFetch<T = unknown>(
  centerId: string,
  crmToken: string,
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const base = centerBaseUrl(centerId);
  const url = `${base}${path}`;
  const method = options?.method ?? "GET";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${crmToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof errBody["message"] === "string"
      ? errBody["message"]
      : typeof errBody["error"] === "string"
      ? errBody["error"]
      : `CRM error ${res.status}`;
    throw new Error(msg);
  }

  // Reject HTML responses (SPA fallback — path not found on CRM)
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error("CRM returned HTML — path not supported");
  }

  return res.json() as Promise<T>;
}
