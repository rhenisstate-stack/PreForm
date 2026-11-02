# PrepFord Question-Type Foundation — Gate B

**Status:** Implemented with PostgreSQL verification outstanding  
**Date:** 2026-11-02  
**Scope:** Backend-authoritative catalogue, capability metadata, safe reconciliation, read-only API and contract-validation foundation.

## B0 — Source revalidation

The existing domain was reused; this gate did not create a replacement catalogue.

| Area | Verified source state |
|---|---|
| Entity | `QuestionTypeDefinition` maps to `public."QuestionTypeDefinitions"`. `Id` is the primary key; `Key` is required and limited to 64 characters; `Name` to 128; `Description` and `Category` to 512 and 64; `SupportedScoring` is a string limited to 64; `CapabilityFlags` is an integer bitmask; `ImplementationStatus` is a 32-character string; `IsActive` and `DisplayOrder` are persisted. |
| Initial rows | Migration `20261027150000_AddMasterDomainModels` inserts 18 records with IDs `qt-1` through `qt-18`, canonical keys, names, descriptions, categories, initial scoring labels, and display orders 1-18. The live PostgreSQL rows were not queried in this gate. |
| Key uniqueness | Migration 0002 already creates unique index `IX_QuestionTypeDefinitions_Key`. The EF model and model snapshot now declare the same unique index. `Questions.QuestionTypeKey` has an index but no foreign key to the catalogue. |
| Capability migration | Migration `20261102060000_AddQuestionTypeCapabilityAndStatus` adds the capability bitmask and status columns. It lacked EF discovery attributes; those attributes are now present. No data migration was added or executed. |
| Runtime initialization | `CatalogSeeder.SeedAsync` invokes `QuestionTypeCatalogueSeeder`. It uses the registry for missing-row defaults, transactionally adds missing keys, and reconciles only code-owned capability/status fields. |
| API conventions | API version prefix is `/api/v1`; catalogue list envelope is `{ success, count, items }`. |
| Frontend | The admin page keeps a static 18-item catalogue, with matching keys/categories but some differing labels and scoring claims. No question-type API client or type-specific exam renderer is wired to it. |
| Attempt contract | `ExamAttemptsController` accepts `selectedOptionIndices` as an integer list. The response validator invokes option-based graders for seven types. Attempt start does not deliver type-specific question content. |

### Persisted migration-0002 catalogue

The following IDs, keys, labels, categories, and initial scoring labels are the records inserted by migration 0002. Existing database rows are preserved; their IDs and administrator-managed metadata are not overwritten by runtime reconciliation.

| ID | Canonical key | Seeded display name | Category | Historical `SupportedScoring` |
|---|---|---|---|---|
| qt-1 | `single-choice` | Single Choice | Traditional | ExactMatch |
| qt-2 | `multiple-choice` | Multiple Choice | Traditional | ExactMatch |
| qt-3 | `sata` | Select All That Apply (SATA) | Traditional | PartialCredit |
| qt-4 | `checkbox` | Checkbox Response | Traditional | PartialCredit |
| qt-5 | `image-based` | Image-Based Question | Clinical | ExactMatch |
| qt-6 | `multiple-image` | Multiple-Image Item | Clinical | ExactMatch |
| qt-7 | `drag-drop` | Drag-and-Drop | NGN | ExactMatch |
| qt-8 | `ordering` | Ordering / Sequencing | NGN | ExactMatch |
| qt-9 | `case-study` | NGN Case Study | NGN | PartialCredit |
| qt-10 | `essay` | Extended Response / Essay | Traditional | ManualReview |
| qt-11 | `matching` | Matching | Traditional | ExactMatch |
| qt-12 | `fill-blank` | Fill-in-the-Blank | Traditional | ExactMatch |
| qt-13 | `matrix` | Matrix / Grid Response | NGN | PartialCredit |
| qt-14 | `numeric` | Numeric Response | Traditional | ExactMatch |
| qt-15 | `true-false` | True / False | Traditional | ExactMatch |
| qt-16 | `tabular` | Tabular Response | NGN | PartialCredit |
| qt-17 | `short-answer` | Short-Answer Response | Traditional | ManualReview |
| qt-18 | `dynamic-lab` | Dynamic Lab Value Response | NGN | ExactMatch |

The historical scoring column is not treated as proof that a grader exists. In particular, the implemented option grader awards exact match only; it does not implement partial credit or manual review.

## Authority and capability model

`IQuestionTypeRegistry` is the single code-owned authority for canonical keys, default metadata used only when a record is missing, capability flags, contract version, implementation status, scoring modes, and grading strategy. The database remains the source for active state and administrator-managed display metadata. The API resolves these sources on each request; no administrator-managed state is cached indefinitely.

Capability flags describe the type's response/content shape or required subsystem. They are not a claim that the renderer or validator exists. `ImplementationStatus` records evidence of implementation and is not inferred from catalogue presence. Authoring and delivery booleans are separate from status.

| Status | Meaning in this gate | Count |
|---|---|---:|
| `Catalogued` | Catalogue entry exists; no response grader is implemented for the type. | 11 |
| `ContractDefined` | No type-specific persisted content contract is finalized at this gate. | 0 |
| `AuthoringSupported` | No question-authoring workflow is implemented. | 0 |
| `DeliverySupported` | No end-to-end type-specific delivery surface is implemented. | 0 |
| `GradingSupported` | Existing backend option exact-match grader handles the type. This does not imply authoring or delivery support. | 7 |
| `FullySupported` | No type qualifies. | 0 |

The seven implemented grader keys are `single-choice`, `multiple-choice`, `sata`, `checkbox`, `image-based`, `multiple-image`, and `true-false`. For these keys, the scoring mode exposed by the API is automatic exact match. SATA and checkbox are **not** reported as partial credit because the current grader compares the complete selected set with the correct set. No manual-grading workflow exists.

## Type-specific contract inventory

These are Gate B contract notes, not a claim that each payload has been finalized or is accepted by an authoring/delivery endpoint. The only existing response implementation is the generic option-index path. Open semantics remain explicitly deferred.

| Key | Content and response shape | Validation and scoring | Media, renderer, status, and dependencies |
|---|---|---|---|
| `single-choice` | Stem plus options; existing response is one selected option index. | Exactly one in-range index in the contract validator; automatic exact match. | No media; generic choice renderer. `GradingSupported`; authoring/delivery UI remains unwired. |
| `multiple-choice` | Stem plus options; response is a set/list of selected option indices. | Indices must be unique and in range; exact set match only. Confirm whether single and multiple selection should remain one type. | No media; generic choice renderer. `GradingSupported`; partial-credit policy deferred. |
| `sata` | Stem plus options; response is a set/list of selected option indices. | Multi-selection is permitted; exact set match only. No NCLEX-specific scoring policy is claimed. | No media; generic choice renderer. `GradingSupported`; any partial-credit policy requires a separate business decision. |
| `checkbox` | Form prompt plus checkbox options; response is selected option indices. | Unique in-range indices; exact set match. | No media; generic form renderer. `GradingSupported`; do not merge its key with `multiple-choice`. |
| `image-based` | Stem/options plus a future media-reference structure; response semantics could be an option or coordinate. | Existing grader can compare option indices; image/coordinate validation is not implemented. | Media capability is descriptive only; asset schema and specialized renderer are missing. `GradingSupported` for option grader, not end-to-end support. |
| `multiple-image` | Multiple exhibit references; response cardinality and comparative semantics remain open. | Existing generic option grader only; no specialized response validator. | Media capability is descriptive only; specialized renderer and content schema are missing. `GradingSupported` for option grader, not end-to-end support. |
| `drag-drop` | Item pool and drop-zone definitions; response should map zone keys to ordered or unordered item keys. | Key membership, duplicate placement, cardinality, and scoring policy remain open; no grader. | Specialized renderer/validator required. `Catalogued`. |
| `ordering` | Ordered step/item definitions; response is an ordered list of item keys. | Require known keys and define duplicate/omission policy before implementation; no grader. | Specialized renderer/validator required. `Catalogued`. |
| `case-study` | Clinical scenario, exhibits, and linked sub-question content; response is keyed by sub-question. | Sub-question schemas and scoring aggregation remain open; no partial-credit or manual flow is implemented. | Scenario/exhibit fields exist on `Question`; unfolding-case renderer and validator are missing. `Catalogued`. |
| `essay` | Prompt and optional rubric metadata; response is text. | Length, rubric, moderation, and scoring workflow are undecided; no manual grader. | Specialized text-entry/review UI required. `Catalogued`; `ManualReview` in migration is historical metadata only. |
| `matching` | Source and target sets; response maps each source key to a target key. | Pair coverage, target reuse, and scoring policy remain open; no grader. | Specialized renderer/validator required. `Catalogued`. |
| `fill-blank` | Stem with stable blank identifiers; response maps blank IDs to text or numeric values. | Normalization, case sensitivity, accepted alternatives, and units are undecided; no grader. | Specialized renderer/validator required. `Catalogued`. |
| `matrix` | Row and column definitions; response maps row IDs to selected column IDs. | Multi-selection and partial-credit rules require a business decision; no grader. | Specialized renderer/validator required. `Catalogued`. |
| `numeric` | Prompt with explicit unit/precision/tolerance configuration; response is a decimal value, optionally with unit. | Decimal precision, tolerance, rounding, and units are undecided; no grader. | Specialized numeric input/validator required. `Catalogued`. |
| `true-false` | Statement plus a binary choice; existing response uses one option index. | Exactly one in-range option index; automatic exact match. | Generic choice renderer; no specialized media. `GradingSupported`. |
| `tabular` | Table/row/column content; response shape is a structured table-cell map. | Missing-cell, value-set, and partial-credit rules remain open; no grader. | Specialized renderer/validator required. `Catalogued`. |
| `short-answer` | Prompt; response is concise text. | Rubric, accepted alternatives, and manual-review workflow remain undecided; no grader. | Specialized text-entry/review UI required. `Catalogued`; migration's `ManualReview` is not an implemented workflow. |
| `dynamic-lab` | Lab analyte/time-series exhibits; response maps analytes to a defined trend/interpretation. | Trend vocabulary, reference ranges, units, and scoring rules remain open; no grader. | Specialized renderer/validator and domain schema required. `Catalogued`. |

## Shared contract and validation foundation

`QuestionTypePayloadEnvelope` defines `typeKey`, `contractVersion`, `kind` (`Content` or `Response`), and a `JsonElement` payload. Registry entries currently use contract version `1`. `QuestionTypeContractValidator`:

- rejects unknown or inactive keys and unsupported versions;
- caps serialized payload size at 64 KiB;
- only validates the existing option-index response shape for non-specialized option types;
- requires an available option count from 1 to 250, unique non-negative indices within that count, and exactly one selection for single-choice/true-false;
- rejects all content payloads and unsupported response kinds instead of accepting arbitrary JSON.

This validator is a foundation and is not wired into the attempt endpoint. The existing attempt response contract and learner behavior were not changed. No type-specific content schema is finalized for the other 13 cases, and no new public payload endpoint accepts arbitrary JSON.

## Safe seeding and database impact

Migration 0002 already inserts all 18 rows and the unique key index. Runtime reconciliation is idempotent and uses one transaction on relational providers. Existing IDs and `Name`, `Description`, `Category`, `SupportedScoring`, `IsActive`, and `DisplayOrder` are preserved. Only code-owned `CapabilityFlags` and `ImplementationStatus` are reconciled. Missing rows use registry defaults; unknown database keys are logged and preserved; duplicate keys cause an explicit failure.

When a key is missing, its new row uses the registry's currently implemented scoring label (`ExactMatch` for an implemented exact-match grader, otherwise `NotImplemented`), not a stale partial/manual label from the historical migration.

No migration operations or schema/data changes were added. Existing migration 0006 metadata was corrected for EF discovery; the current model snapshot now records the pre-existing unique key index. Actual migration execution and Npgsql seeding still require verification against an isolated PostgreSQL database.

## Read-only catalogue API

| Method and route | Behavior |
|---|---|
| `GET /api/v1/question-types` | Returns active canonical types ordered by persisted `DisplayOrder`, then key, in `{ success, count, items }`. Empty catalogue returns an empty success envelope. |
| `GET /api/v1/question-types/{key}` | Returns one active canonical type; unknown and inactive types return the same generic 404. |
| `POST /api/v1/question-types/validate` | Existing compatibility helper; validates a key without modifying state and does not reveal inactive type metadata. |

The catalogue is public because it contains only display/capability metadata needed by learners and management surfaces. DTOs omit database IDs and all answer-key data. They expose canonical key, display text, category, active state, status, contract version, compatibility scoring string, normalized scoring modes, and capability flags/details. No authoring, answer-key, private grading, or internal validation detail is returned. Filtering is not added.

Scoring mode keys are `automatic-exact-match`, `automatic-partial-credit`, `manual`, and `not-implemented`. Only `automatic-exact-match` and `not-implemented` are currently returned.

## Frontend compatibility

- Frontend and backend have the same 18 canonical keys; no key mismatch was found.
- Categories match migration 0002.
- Display labels differ for `single-choice`, `multiple-choice`, `checkbox`, `essay`, and `dynamic-lab`; runtime DB labels remain authoritative and are preserved.
- The static frontend claims partial credit for SATA/checkbox and describes manual review for essay/short-answer. Those are design labels, not implemented scoring behavior; the new API reports actual supported modes.
- Static `responseSchema` strings (including image coordinates, matrix structures, and dynamic-lab trends) are not validated backend contracts.
- The admin page remains static in this gate. Future work should replace its metadata source with `GET /api/v1/question-types`, preserve icons locally by canonical key, and remove independently maintained labels/scoring/response schemas. Do not remove the existing catalogue before that migration is implemented and tested.

## Remaining work and decisions

- Validate migration 0006 and reconciliation against a disposable PostgreSQL database.
- Define concrete content/response schemas and unknown-field policy before accepting payloads for each type.
- Decide whether multiple-choice permits both one and many selections and define image-based/multiple-image semantics.
- Decide SATA scoring, numeric tolerance/units, matching reuse rules, matrix/tabular scoring, and case-study aggregation.
- Implement question authoring, type-specific response validators/renderers, manual review, and grading only in later approved gates.
- No exam CRUD, question-bank CRUD, builder, publication workflow, or Gate C security work was introduced.
