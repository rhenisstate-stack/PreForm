# Image Upload Security & Validation Architecture

**Document Version:** 1.0  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Security Standard:** Zero-Trust Dual-Layer Binary Validation  
**Target Systems:** ASP.NET Core 8 Web API, Next.js BFF, PostgreSQL 16  

---

## 1. Dual-Layer Validation Architecture

To defend PrepFord against denial of service, memory exhaustion, arbitrary file uploads, stored Cross-Site Scripting (XSS), and MIME-spoofing attacks, image upload security is enforced across two independent layers:
1. **Client-Side UX Gate:** Validates file size and extension before network dispatch, providing immediate feedback to authors and preventing unnecessary network egress.
2. **Server-Side Security Authority:** Validates actual binary bytes, file size, request size, content integrity, and role permissions, refusing to trust client-supplied headers or extensions.

```
┌────────────────────────────────────────────────────────┐
│                   Client-Side UX Gate                  │
│   • Size <= 5,242,880 bytes                            │
│   • Extension in [.png, .jpg, .jpeg, .webp, .gif]      │
│   • Instant client-side validation error banner        │
└───────────────────────────┬────────────────────────────┘
                            │ (Client can be bypassed by attacker)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Server-Side Enforcement Gate (Mandatory)    │
│   1. [Authorize(Policy = "Permission:content.create")] │
│   2. [RequestSizeLimit(6 * 1024 * 1024)] (6 MB max)   │
│   3. file.Length <= 5,242,880 bytes (5 MB exact)       │
│   4. Magic Bytes Inspection (Detects actual format)    │
│   5. Allowed Formats: PNG, JPEG, WebP, GIF             │
│   6. SVG / HTML / Executables Strictly Rejected        │
│   7. Filename Sanitization                             │
│   8. SHA-256 Checksum Calculation                      │
└────────────────────────────────────────────────────────┘
```

---

## 2. Strict 5 MB Boundary Enforcement

The maximum permitted image upload size is strictly defined as:

```text
5 MB = 5 × 1,024 × 1,024 bytes = 5,242,880 bytes
```

This constant is uniformly defined across the architecture:
- **Backend (`Preform.Api`):** `IQuestionMediaService.MaxImageSizeBytes = 5 * 1024 * 1024` (`5,242,880` bytes).
- **Frontend (`@prepford/web`):** `MAX_QUESTION_IMAGE_BYTES = 5 * 1024 * 1024` (`5,242,880` bytes) in `question-image-upload.tsx`.
- **Database Column:** `FileSizeBytes BIGINT NOT NULL` records the verified length.
- **Hosting Limits:** ASP.NET Core controller sets `[RequestSizeLimit(6 * 1024 * 1024)]` (6 MB) to allow multi-part boundary framing while rejecting larger payloads at the transport layer.

Any file exceeding 5,242,880 bytes by even 1 byte (`5,242,881` bytes) is rejected with `400 Bad Request` and message:
`"File size exceeds the maximum allowed limit of 5 MB (5,242,880 bytes)."`

---

## 3. Magic Byte Detection & MIME Spoofing Defense

Client-supplied headers (`Content-Type: image/png`) and file extensions (`.png`) are inherently untrusted. The backend `QuestionMediaService.DetectVerifiedImageMimeType` reads the initial binary header of the byte array:

| Format | Magic Byte Signature (Hexadecimal) | Verified MIME Type Returned |
|---|---|---|
| **PNG** | `89 50 4E 47 0D 0A 1A 0A` (8 bytes) | `image/png` |
| **JPEG** | `FF D8 FF` (3 bytes) | `image/jpeg` |
| **GIF** | `47 49 46 38 37 61` (`GIF87a`) or `47 49 46 38 39 61` (`GIF89a`) | `image/gif` |
| **WebP** | `52 49 46 46` (`RIFF` at byte 0) + `57 45 42 50` (`WEBP` at byte 8) | `image/webp` |

### Security Protections Enforced:
1. **MIME Spoofing Block:** An executable file or HTML script renamed to `malware.png` lacks valid PNG/JPEG magic bytes and is rejected with:
   `"Invalid image file. Only PNG, JPEG, WebP, and GIF images are supported."`
2. **SVG Rejection:** Scalable Vector Graphics (SVG) are intentionally excluded because SVGs can contain embedded JavaScript `<script>` tags, creating stored XSS attack vectors when served from the application origin.
3. **Empty File Block:** Files with 0 bytes or payloads under 12 bytes are rejected immediately.

---

## 4. Role-Based Access Control (RBAC)

Media endpoints enforce explicit authorization policies defined in PrepFord's RBAC engine:

| Endpoint | Method | Required Policy | Permitted Roles | Notes |
|---|---|---|---|---|
| `/api/v1/questions/media` | POST | `Permission:content.create` | `admin`, `curriculum_lead` | Upload draft media. |
| `/api/v1/questions/{id}/media` | POST | `Permission:content.create` | `admin`, `curriculum_lead` | Upload question-bound media. |
| `/api/v1/questions/{id}/media` | GET | `Permission:content.view` | `admin`, `curriculum_lead`, `reviewer` | List question media metadata. |
| `/api/v1/questions/media/{id}` | DELETE | `Permission:content.edit` | `admin`, `curriculum_lead` | Delete question media. |
| `/api/v1/questions/media/{id}` | GET | `[Authorize]` | All active authenticated users (admins + candidates) | Candidate examination image streaming. |

---

## 5. Streaming Performance, Caching & ETags

1. **Lazy Loading:** `ImageData` byte arrays are NOT loaded during question list or examination query execution. Only metadata (`Id`, `FileName`, `ContentType`, `FileSizeBytes`) is queried by the repository.
2. **ETags:** Each `QuestionMedia` record stores `Sha256Hash` computed during upload. When serving `GET /api/v1/questions/media/{id}`, the API issues `ETag: "{Sha256Hash}"`.
3. **Conditional Requests:** If the client sends `If-None-Match: "{Sha256Hash}"`, the server immediately responds with `304 Not Modified`, transmitting 0 image bytes over the network.
4. **Cache Headers:** The server sets `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` (1 day client cache, 7 day stale-while-revalidate), offloading database load during high-concurrency examination delivery.
