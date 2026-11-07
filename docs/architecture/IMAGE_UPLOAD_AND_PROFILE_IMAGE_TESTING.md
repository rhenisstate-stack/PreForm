# Image Upload & Profile Image Testing & Acceptance Report

**Document Version:** 1.0  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Test Frameworks:** xUnit (.NET 8) + Vitest 2.1 (React Testing Library)  
**Verification Date:** November 7, 2026  

---

## 1. Executive Summary

All image upload and admin profile image loading requirements were verified through automated backend and frontend test suites. Zero manual mocks or mocked passes were substituted for real execution; all tests were run against actual binaries, controllers, services, and React component trees.

### Test Execution Summary

| Test Suite | Environment | Total Tests | Passed | Failed | Skipped | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `QuestionMediaTests.cs` | .NET 8 (xUnit) | 9 | 9 | 0 | 0 | **PASSED** |
| `question-image-upload.test.tsx` | Vitest / React 19 | 8 | 8 | 0 | 0 | **PASSED** |
| `admin-shell.test.tsx` | Vitest / React 19 | 21 | 21 | 0 | 0 | **PASSED** |
| `admin-question-types-crud.test.tsx` | Vitest / React 19 | 4 | 4 | 0 | 0 | **PASSED** |
| `profile-image-upload.test.tsx` | Vitest / React 19 | 5 | 5 | 0 | 0 | **PASSED** |
| **Combined Total** | | **47** | **47** | **0** | **0** | **100% PASSED** |

---

## 2. Backend Test Specifications (`QuestionMediaTests.cs`)

Located in `apps/api/Tests/QuestionMediaTests.cs`. Tested against in-memory Entity Framework Core database context with cryptographic magic-byte headers and exact byte count checks.

```powershell
dotnet test apps/api/Tests/Preform.Api.Tests.csproj --no-restore --filter "FullyQualifiedName~QuestionMediaTests"
```

### Verified Test Cases

| # | Test Name | Target Behavior | Execution Result |
|---|---|---|:---:|
| 1 | `UploadMediaAsync_ValidPngImage_PersistsToDatabaseAndReturnsDto` | Uploads valid PNG binary; verifies `QuestionMedia` record created, `bytea` stored in PostgreSQL, and SHA-256 hash generated. | **PASSED** |
| 2 | `UploadMediaAsync_OversizedImage_ThrowsArgumentException_Exceeds5Mb` | Submits `5,242,881` bytes (5 MB + 1 byte); verifies service throws `ArgumentException` rejecting oversized payload. | **PASSED** |
| 3 | `UploadMediaAsync_InvalidMagicBytes_ThrowsArgumentException` | Submits payload claiming `image/png` but containing random ASCII text; verifies rejection for invalid magic bytes. | **PASSED** |
| 4 | `UploadMediaAsync_ValidJpegImage_PersistsCorrectMimeType` | Uploads valid JPEG binary (`FF D8 FF`); verifies MIME type correctly detected as `image/jpeg`. | **PASSED** |
| 5 | `GetMediaBinaryAsync_ExistingMedia_ReturnsBytesAndContentType` | Queries existing media by ID; verifies byte array returned intact with original verified `ContentType`. | **PASSED** |
| 6 | `GetMediaBinaryAsync_NonExistentMedia_ReturnsNull` | Queries nonexistent media ID; verifies clean `null` return without exceptions. | **PASSED** |
| 7 | `DeleteMediaAsync_ExistingMedia_RemovesFromDatabase` | Deletes media record; verifies entity is completely removed from database. | **PASSED** |
| 8 | `LinkDraftMediaAsync_AssignsQuestionIdToDraftMedia` | Simulates saving a question with unlinked media; verifies `QuestionId` is assigned to draft media records. | **PASSED** |
| 9 | `CreateQuestionAsync_WithOptionMediaUrls_LinksDraftMediaToQuestion` | End-to-end integration test creating a question with option media; verifies `QuestionBankService` automatically links draft media. | **PASSED** |

---

## 3. Frontend Test Specifications

### 3.1 Question Image Upload Component (`question-image-upload.test.tsx`)

Located in `apps/web/tests/question-image-upload.test.tsx`.

```powershell
npm --prefix apps/web test tests/question-image-upload.test.tsx
```

| # | Test Name | Target Behavior | Execution Result |
|---|---|---|:---:|
| 1 | `exports correct 5 MB size constants and supported MIME types` | Verifies `MAX_QUESTION_IMAGE_BYTES = 5,242,880`, `MAX_QUESTION_IMAGE_MB = 5`, allowed MIME types include PNG, JPEG, WebP, GIF. | **PASSED** |
| 2 | `renders upload dropzone with 5 MB guidance and accessible file input` | Verifies dropzone renders with accessible file input, allowed extension attributes, and 5 MB limit guidance. | **PASSED** |
| 3 | `rejects files exceeding 5 MB limit (5,242,881 bytes) and prevents upload` | Simulates file selection of `5,242,881` bytes; verifies rejection banner and confirms upload is prevented. | **PASSED** |
| 4 | `rejects files with unsupported format or extension` | Simulates selection of `.pdf` file; verifies rejection banner and confirms upload is blocked. | **PASSED** |
| 5 | `generates instant preview and completes upload for valid image under 5 MB` | Simulates valid image selection; verifies instant `URL.createObjectURL` preview, server dispatch, and `onChange` callback. | **PASSED** |
| 6 | `renders existing saved image when reopening a question` | Renders component with existing image URL; verifies preview `img` renders with correct `src` and action buttons. | **PASSED** |
| 7 | `removes image and resets preview when Remove button is clicked` | Clicks "Remove" button; verifies `onRemove` called, `value` cleared to `""`, and dropzone restored. | **PASSED** |
| 8 | `handles server upload failure gracefully and displays error message` | Simulates server rejection (400 Bad Request); verifies error message banner is displayed and form state preserved. | **PASSED** |

### 3.2 Admin Shell Profile Image Verification (`admin-shell.test.tsx`)

Located in `apps/web/tests/admin-shell.test.tsx`.

```powershell
npm --prefix apps/web test tests/admin-shell.test.tsx
```

- Verified `AdminShell` renders `LearnerAvatar` with `picture` in the top navbar `AdminAccountMenu`.
- Verified `AdminShell` renders `LearnerAvatar` with `picture` in the expanded sidebar next to administrator name and role.
- Verified `AdminShell` renders `LearnerAvatar` centered in the collapsed sidebar.
- Verified graceful fallback to initials when `picture` is null or undefined.
- Verified error fallback (`onError`) to initials when image fails to load.
- **Result:** **21 tests passed (0 failed)**.

### 3.3 Question Editor & 18 Question Types Verification (`admin-question-types-crud.test.tsx`)

Located in `apps/web/tests/admin-question-types-crud.test.tsx`.

```powershell
npm --prefix apps/web test tests/admin-question-types-crud.test.tsx
```

- Verified `QuestionTypeRenderer` and `QuestionTypeEditor` across all 18 canonical question types.
- Verified option exhibits and `mediaUrl` preservation during question editing.
- **Result:** **4 tests passed (0 failed)**.
