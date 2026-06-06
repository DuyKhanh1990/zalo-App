---
name: CRM proxy architecture
description: How Mini App server proxies data calls to CRM using embedded CRM token
---

## Architecture
Frontend → Mini App server (validates our JWT) → CRM (uses embedded CRM token)

## Implementation
1. On login, `loginWithPassword` calls `POST {center}/api/mobile/auth/login`
2. CRM returns its own JWT in `data.token`
3. We call `signStudentToken(userId, centerId, fullName, studentCode, data.token)` — CRM token stored as `crmToken` in our JWT payload
4. `requireStudent` middleware extracts `crmToken` from verified JWT
5. Data routes check `req.student?.crmToken` → if present, call `crmFetch(centerId, crmToken, path)`
6. `crmFetch` in `src/lib/crm-proxy.ts` forwards with `Authorization: Bearer {crmToken}` and rejects HTML responses
7. Fallback: if no crmToken or CRM call fails → return mock data (graceful degradation)

## centerId format
Stored as hostname only: `easyeduv2.easyedu.vn` (from `new URL(data.center).hostname`)
`crmFetch` prepends `https://` to build the full URL.

## Mock mode (Zalo dev / no CRM)
`loginWithZaloAccessToken` in mock mode calls `buildSuccess()` without a crmToken — data routes fall back to mock data automatically.

**Why:** JWT localStorage has no meaningful size limit; embedding the ~200-char CRM token avoids a session store. Both JWTs have 30-day expiry set at the same time, so they expire together.
