---
name: CRM API discovery
description: Real CRM data endpoint paths and response formats for easyeduv2.easyedu.vn
---

## Key finding
CRM at `easyeduv2.easyedu.vn` uses `/api/my-space/...` paths (NOT `/api/mobile/my-space/...`).
The `/api/mobile/...` prefix only works for auth: `POST /api/mobile/auth/login`.
All other `/api/mobile/...` GET paths return HTML (SPA fallback = 404 equivalent).
Must include `Accept: application/json` header — but the path is the real gating factor.

## Confirmed working endpoints (with Bearer CRM token)
- `GET /api/my-space/calendar/student?month=YYYY-MM` → `{ sessions, datesWithSessions, month }`
- `GET /api/my-space/assignments/student?month=YYYY-MM` → `{ rows, month }`
- `GET /api/my-space/score-sheet` → array of score sheet objects
- `GET /api/my-space/invoices` → `{ invoices: [...] }`

## Auth
Login: `POST {center}/api/mobile/auth/login` with `{username, password}`
Response: `{ token (CRM JWT), center, user: {id, username, isActive}, userType, profile: {id, fullName, code, type}, needsOnboarding }`
The CRM JWT (`token`) must be passed as `Authorization: Bearer {token}` for all data calls.

**Why:** The CRM is a full-stack SPA app — unknown GET paths fall back to the SPA HTML. Only specifically registered API routes return JSON.
