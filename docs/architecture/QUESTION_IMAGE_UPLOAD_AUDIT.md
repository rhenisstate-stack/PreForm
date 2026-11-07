# Question Image Upload Audit: Canonical 18-Question Types & Clinical Exhibit Support

**Document Version:** 1.0  
**Repository Branch:** `feature/dotnet-backend-migration`  
**Execution Context:** PrepFord NCLEX Examination & Assessment Engine  
**Target Systems:** ASP.NET Core 8 Web API + Entity Framework Core 8 (PostgreSQL) + Next.js App Router (BFF & Admin UI)

---

## 1. Executive Summary

This audit establishes the evidence-based inventory of question types across PrepFord's canonical 18-type examination registry to determine which question types require and support visual exhibits, radiographs, ECG tracings, anatomical diagrams, and option-level image choices.

Prior to this implementation, the question authoring system supported `mediaUrl` properties across `QuestionOption` models and question entities, but lacked an integrated binary image upload mechanism and direct database persistence. Administrators were forced to manually supply external image URLs or omit visual attachments entirely.

This implementation delivers a unified, database-backed image upload architecture enforcing an immutable **5 MB per image limit** (`5,242,880 bytes`), persistent PostgreSQL `bytea` storage via EF Core, dual-layer magic byte validation, and seamless integration into PrepFord's full-page CRUD Question Editor workspace.

---

## 2. Canonical 18-Question Types Audit Matrix

The PrepFord question bank models 18 canonical question types spanning Traditional NCLEX formats and Next Generation NCLEX (NGN) clinical interaction styles. Each question type was inspected in `apps/web/src/lib/question-types.ts`, `apps/api/Models/Questions.cs`, and `apps/web/src/components/questions/question-type-editor.tsx`.

| ID | Key | Label | Category | Option Based? | Media Option Support | Clinical Exhibit Support | Image Usage Analysis |
|---|---|---|---|:---:|:---:|:---:|---|
| **qt-1** | `multiple-choice` | Multiple Choice (Traditional) | Traditional | Yes | Yes (Optional) | Yes | Diagnostic exhibits (e.g., chest X-ray, lab strip) in stem or as option choices. |
| **qt-2** | `multiple-response` | Select All That Apply (SATA) | Traditional | Yes | Yes (Optional) | Yes | Visual exhibits illustrating clinical findings with multiple correct actions. |
| **qt-3** | `fill-blank` | Fill-in-the-Blank / Numeric | Calculation | No | No | Yes | Dosage calculation strips, medication administration labels, syringe gradations. |
| **qt-4** | `drag-drop` | Ordered Response / Drag-and-Drop | Procedural | No | No | Yes | Clinical procedural flowcharts, sterile technique sequences, algorithm schematics. |
| **qt-5** | `image-based` | Hot Spot / Image-Based | Clinical | Yes | **Primary (Native)** | Yes | Core anatomical diagrams, lesion identification, ECG strips, point-of-care ultrasound. |
| **qt-6** | `multiple-image` | Multiple Image Selection | Clinical | Yes | **Primary (Native)** | Yes | Multi-option visual comparison (e.g., identifying correct skin suture appearance or ECG). |
| **qt-7** | `case-study` | Clinical Case Study (6-Step CJMM) | NGN | No | No | Yes | Tabbed Electronic Health Record (EHR) charts, diagnostic test scans, nurses' notes. |
| **qt-8** | `extended-drag-drop` | Extended Drag-and-Drop | NGN | No | No | Yes | Categorization matrices with clinical visual exhibit tabs. |
| **qt-9** | `cloze` | Dropdown Cloze / Embedded | NGN | No | No | Yes | Case findings with inline dropdowns linked to diagnostic imaging exhibits. |
| **qt-10** | `matrix` | Matrix Grid / Decision Matrix | NGN | No | No | Yes | Multi-row assessment grids accompanied by patient clinical exhibits. |
| **qt-11** | `highlight` | Highlight Text & Findings | NGN | No | No | Yes | EHR provider orders and clinical charting with visual symptom exhibits. |
| **qt-12** | `bow-tie` | Bow-Tie Clinical Reasoning | NGN | No | No | Yes | Central condition diagram with actions and monitoring exhibits. |
| **qt-13** | `extended-multiple-response` | Extended Multiple Response (Grouping) | NGN | Yes | Yes (Optional) | Yes | Complex multi-choice clinical findings with visual radiograph exhibits. |
| **qt-14** | `trend` | Longitudinal Trend Analysis | NGN | No | No | Yes | Vital sign graphs, cardiac telemetry trends, telemetry visual rhythm exhibits. |
| **qt-15** | `audio` | Auscultation / Audio-Based | Clinical | Yes | No | Yes | Respiratory or heart sound auscultation waveforms with option text. |
| **qt-16** | `chart-exhibit` | EHR Chart / Exhibit Evaluation | Clinical | Yes | Yes (Optional) | Yes | Multi-tab clinical chart exhibits with option explanations. |
| **qt-17** | `ordered-response` | Ordered Response Sequencing | Procedural | No | No | Yes | Procedural step ordering with equipment setup visual reference. |
| **qt-18** | `true-false` | Binary True / False Verification | Traditional | Yes | Yes (Optional) | Yes | Rapid clinical assertion validation with visual findings. |

---

## 3. Image Roles and Attachment Points

1. **Option Visual Exhibits (`QuestionOption.MediaUrl` / `opt.mediaUrl`):**
   - **Primary Native Question Types:** `image-based` (`qt-5`) and `multiple-image` (`qt-6`). The `<QuestionImageUpload>` control is rendered directly on every option row.
   - **Optional Attachments:** Authors editing `multiple-choice`, `multiple-response`, or any other option-based question type can attach an image to any individual option with a single click ("Attach Option Image").
   - **Persistence:** Associated with `QuestionMedia` where `FieldKey = "option_" + optionKey` (e.g. `option_A`, `option_B`).

2. **Question Stem Visual Exhibits (`Question.MediaUrl`):**
   - Accompanies the question stem to provide clinical evidence: ECG strips, diagnostic radiographs, dermatological lesion photographs, wound assessment stages, or cardiac monitor waveforms.
   - Associated with `QuestionMedia` where `FieldKey = "stem_image"`.

3. **EHR Clinical Chart Exhibits (`Question.ExhibitsJson`):**
   - Tabbed nurses' notes, vital sign tables, lab panels, and diagnostic reports configured in the full-page workspace.
   - Rendered using PrepFord's clinical tab viewer in both admin preview and candidate interactive workspaces.

---

## 4. Full-Page CRUD Workspace Standard Compliance

The question authoring system strictly conforms to the system-wide full-page CRUD workspace standard:
- No modal or drawer dialogs are used for question CRUD.
- The primary authoring workspace is the full-page `AdminQuestionsClient` (`apps/web/src/app/admin/questions/page-client.tsx`).
- Inline drag-and-drop dropzones and accessible file inputs are seamlessly embedded within each option card.
- Changes are preserved during live editing, allowing instant side-by-side rendering in the candidate interactive previewpane before committing changes.
