# Question Image Storage & API Architecture

**Document Version:** 1.0  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Database Engine:** PostgreSQL 16  
**ORM:** Entity Framework Core 8  
**Backend Framework:** ASP.NET Core 8 Web API  
**BFF Framework:** Next.js App Router  

---

## 1. Architectural Overview

PrepFord mandates that question media files are persisted directly in the core PostgreSQL database using binary byte arrays (`bytea`). Storing binary image data inside PostgreSQL ensures atomic backups, snapshot consistency with examination revisions, absence of external cloud bucket configuration drift, and guaranteed persistence across deployments and container rebuilds.

```
┌────────────────────────────────────────────────────────┐
│               Admin Question Editor (Next.js)          │
│   • Drag & drop dropzone                               │
│   • Client-side 5 MB & format gate                     │
│   • Instant ObjectURL preview                          │
└───────────────────────────┬────────────────────────────┘
                            │ POST multipart/form-data
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Next.js BFF API Routes                 │
│   • /api/admin/questions/media                         │
│   • /api/admin/questions/[id]/media                    │
│   • Session forward & 5 MB payload guard               │
└───────────────────────────┬────────────────────────────┘
                            │ POST /api/v1/questions/media
                            ▼
┌────────────────────────────────────────────────────────┐
│            ASP.NET Core Web API (Preform.Api)          │
│   • QuestionMediaController                            │
│   • QuestionMediaService                               │
│   • Magic-byte verification (PNG/JPEG/WebP/GIF)        │
│   • SHA-256 deduplication                             │
│   • Max 5 MB boundary enforcement (5,242,880 bytes)    │
└───────────────────────────┬────────────────────────────┘
                            │ EF Core DbContext
                            ▼
┌────────────────────────────────────────────────────────┐
│             PostgreSQL Database (preform_db)           │
│   • "QuestionMedia" table                              │
│   • "ImageData" bytea binary storage                   │
│   • Foreign Key to "Questions"."Id" (ON DELETE CASCADE)│
│   • SHA-256 and QuestionId indexes                     │
└────────────────────────────────────────────────────────┘
```

---

## 2. PostgreSQL Database Schema

The `QuestionMedia` entity is defined in `apps/api/Models/Questions.cs` and mapped via `apps/api/Data/AppDbContext.cs` and EF Core migration `0014_AddQuestionMediaBinaryStorage`:

```sql
CREATE TABLE "QuestionMedia" (
    "Id" VARCHAR(64) PRIMARY KEY,
    "QuestionId" VARCHAR(64) NULL,
    "FieldKey" VARCHAR(128) NOT NULL,
    "FileName" VARCHAR(256) NOT NULL,
    "ContentType" VARCHAR(128) NOT NULL,
    "FileSizeBytes" BIGINT NOT NULL,
    "Sha256Hash" VARCHAR(64) NOT NULL,
    "ImageData" BYTEA NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "CreatedById" VARCHAR(64) NULL,
    CONSTRAINT "FK_QuestionMedia_Questions_QuestionId" 
        FOREIGN KEY ("QuestionId") 
        REFERENCES "Questions" ("Id") 
        ON DELETE CASCADE
);

CREATE INDEX "IX_QuestionMedia_QuestionId" ON "QuestionMedia" ("QuestionId");
CREATE INDEX "IX_QuestionMedia_Sha256Hash" ON "QuestionMedia" ("Sha256Hash");
```

### Column Specifications

| Column | Type | Nullable | Description |
|---|---|:---:|---|
| `Id` | `VARCHAR(64)` | No | Unique media identifier prefixed with `qm_` (e.g., `qm_4f9a7c...`). |
| `QuestionId` | `VARCHAR(64)` | Yes | Foreign key to parent `Questions` record. `NULL` for draft media prior to question save. |
| `FieldKey` | `VARCHAR(128)` | No | Slot key indicating attachment target (`option_A`, `option_B`, `stem_image`). |
| `FileName` | `VARCHAR(256)` | No | Original client filename sanitized for security. |
| `ContentType` | `VARCHAR(128)` | No | Verified MIME type derived from binary magic bytes (e.g., `image/png`). |
| `FileSizeBytes` | `BIGINT` | No | Exact byte length of the binary payload (constrained `<= 5,242,880`). |
| `Sha256Hash` | `VARCHAR(64)` | No | Hex-encoded cryptographic hash of `ImageData` for content integrity and deduplication. |
| `ImageData` | `BYTEA` | No | Raw binary image bytes stored directly in PostgreSQL. |
| `CreatedAt` | `TIMESTAMPTZ` | No | UTC timestamp of initial upload. |
| `UpdatedAt` | `TIMESTAMPTZ` | No | UTC timestamp of last modification. |
| `CreatedById` | `VARCHAR(64)` | Yes | User ID of the administrator who uploaded the image. |

---

## 3. Draft Media Association Lifecycle

A critical requirement of the full-page question editor is supporting image uploads when creating a **new** question that does not yet possess a persisted `Question.Id`.

### The Two-Stage Association Pattern:
1. **Stage 1 (Draft Upload):**
   - The admin selects an image while drafting a new question.
   - The client issues `POST /api/admin/questions/media` (or `POST /api/v1/questions/media`).
   - The backend validates the 5 MB limit and magic bytes, persists the record into `QuestionMedia` with `QuestionId = null`, and returns:
     ```json
     {
       "success": true,
       "media": {
         "id": "qm_3a9e...",
         "fileName": "xray.png",
         "contentType": "image/png",
         "fileSizeBytes": 128456,
         "url": "/api/questions/media/qm_3a9e..."
       }
     }
     ```
   - The editor sets the option's `mediaUrl` to `/api/questions/media/qm_3a9e...`.

2. **Stage 2 (Question Save & Association):**
   - The admin submits the full-page question form (`CreateQuestionAsync` or `UpdateQuestionAsync`).
   - In `apps/api/Services/QuestionBankService.cs`, the service inspects all option `MediaUrl` values, extracts media IDs matching `/api/questions/media/([a-zA-Z0-9_-]+)`, and queries any unlinked `QuestionMedia` records.
   - In the same database transaction, the service updates `media.QuestionId = question.Id` and persists the relationship.
   - If a question is subsequently deleted, `ON DELETE CASCADE` removes all associated `QuestionMedia` records automatically.

---

## 4. API Endpoints

### 4.1 Backend Endpoints (`Preform.Api`)

#### `POST /api/v1/questions/media` & `POST /api/v1/questions/{questionId}/media`
- **Authorization:** `[Authorize(Policy = "Permission:content.create")]`
- **Request Limits:** `[RequestSizeLimit(6 * 1024 * 1024)]`
- **Consumes:** `multipart/form-data` (`file`, `fieldKey`, optional `questionId`)
- **Returns:** `200 OK` with `QuestionMediaUploadResponse`, `400 Bad Request` on invalid file or size > 5 MB, `404 Not Found` if `questionId` does not exist.

#### `GET /api/v1/questions/media/{mediaId}` & `GET /api/v1/questions/{questionId}/media/{mediaId}`
- **Authorization:** `[Authorize]` (accessible by candidates during exams and admins during authoring)
- **Caching:** Sets `ETag: "{sha256Hash}"`, `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
- **Conditional GET:** Evaluates `If-None-Match`. Returns `304 Not Modified` without re-transmitting payload when cached copy is valid.
- **Returns:** Binary image byte stream with exact verified `Content-Type`.

#### `DELETE /api/v1/questions/media/{mediaId}` & `DELETE /api/v1/questions/{questionId}/media/{mediaId}`
- **Authorization:** `[Authorize(Policy = "Permission:content.edit")]`
- **Returns:** `200 OK` `{ "success": true, "message": "Media deleted successfully." }`.

#### `GET /api/v1/questions/{questionId}/media`
- **Authorization:** `[Authorize(Policy = "Permission:content.view")]`
- **Returns:** Array of `QuestionMediaDto` metadata objects for all images attached to the question (does NOT load raw `ImageData` bytes into list responses).

### 4.2 Next.js BFF Proxy Routes

The Next.js App Router exposes the following transparent authenticated proxy routes:
- `POST /api/admin/questions/media`: Proxies draft uploads to backend with admin session token.
- `GET | POST /api/admin/questions/[id]/media`: Proxies question-bound media list and uploads.
- `GET | DELETE /api/admin/questions/media/[mediaId]`: Proxies binary streaming and deletions.
- `GET /api/questions/media/[mediaId]`: Candidate-accessible streaming endpoint with learner session.
- `GET /api/v1/questions/media/[mediaId]`: Direct alias ensuring backward compatibility.
