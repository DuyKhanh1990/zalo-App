---
name: CRM file upload
description: Correct endpoint, field name, and response format for file uploads to CRM from Mini App proxy.
---

## Upload endpoint
`POST /api/upload` (NOT `/api/my-space/assignments/student/upload-attachment` — that endpoint does not exist in CRM).

## Multipart field name
Must use field name `"files"` (plural). Using `"file"` causes CRM multer to return `{"message":"Unexpected field"}` (502 from our proxy).

## Response format
```json
{ "files": [{ "name": "photo.jpg", "url": "https://s3.../...", "size": 12345, "mimetype": "image/jpeg" }] }
```
Parse as `data.files[0].url`. Old code expected `data.url` or `data.fileUrl` — both wrong.

## Auth
Requires `Authorization: Bearer <crmToken>` header. Our proxy already handles this via `requireStudent` middleware.

## S3 URLs
Uploaded files are public-read ACL. URL pattern: `https://{S3_HOSTNAME}/{bucket}/{folder}/{timestamp}_{filename}`. Safe to store directly in submissionAttachments.

## submissionAttachments format
Submit endpoint accepts `string[]` (array of URLs). Correct as-is.

**Why:** CRM team confirmed these details after investigating why uploaded files appeared empty on CRM web — the proxy was calling a non-existent endpoint.
