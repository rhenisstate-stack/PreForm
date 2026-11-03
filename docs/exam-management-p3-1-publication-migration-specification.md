# PrepFord Examination Management — P3.1 Publication Migration Specification

## Status
- Decision ID: D7
- Status: OWNER APPROVED
- Approved direction: lifecycle is the source of truth; `IsPublished` is not an independently editable source of truth
- Temporary compatibility: only allowed if explicitly synchronized and documented

## Repository evidence
The current repository treats publication mostly as a boolean on `Exam` in `apps/api/Models/Assessments.cs`. The database model in `apps/api/Data/AppDbContext.cs` indexes `IsPublished` directly. Candidate-facing flows and administrative flows assume the boolean is the publication flag. This is not compatible with the approved lifecycle model in which publication is a state and not just a field value.

## Required migration rule
The lifecycle state must become the authoritative publication representation. The boolean may exist only as a compatibility bridge until the repository fully migrates the application to the lifecycle model.

## Canonical representation
Recommended canonical field:
- `LifecycleState` enum or string-backed state on the revision record

Recommended relationship:
- `LifecycleState == Published` is the canonical publication state
- `IsPublished` is derived compatibility and must not be writable by the application outside a transition shim

## Recommended compatibility mapping

| Current repository state | Recommended lifecycle mapping | Compatibility note |
|---|---|---|
| `IsPublished = true` | `Published` | acceptable if there is no evidence of a different active state |
| `IsPublished = false` | `Draft` by default | must be treated as conservative default, not proof of historic lifecycle completeness |
| Unknown or ambiguous historical state | `Draft` or `Archived` only with explicit evidence | do not fabricate approval or publishing timestamps |

## Important constraints
- Do not map every unpublished record to `Draft` without considering whether some records were actually archived, retired, or historically unpublished because the publication workflow had not yet been implemented.
- Do not fabricate review or approval metadata for old records.
- Do not claim historical publication timestamps that cannot be proven in the repository.
- Do not widen candidate access during the migration by interpreting `IsPublished = false` as a publication state.

## Recommended compatibility behavior
For the transition period:
1. `LifecycleState` is read and written by the domain logic.
2. `IsPublished` remains readable by existing code paths during migration.
3. `IsPublished` is set only by the compatibility shim when a lifecycle transition occurs.
4. Any direct writes to `IsPublished` outside the compatibility shim are prohibited.
5. Legacy UI or APIs may still read `IsPublished` until the migration window ends.

## Reads and writes to investigate during implementation
Read/write analysis required for final implementation:
- reads of `IsPublished` in API and service logic
- writes of `IsPublished` in creation or publication routines
- candidate access checks
- admin access checks
- seed data and defaults
- tests that depend on the boolean
- frontend assumptions about `Published` status

Current repository evidence shows the boolean is indexed and used to represent publish status, but no lifecycle-state transition layer exists yet. Implementation must perform a full read/write audit before deleting the compatibility field.

## Ambiguous record policy
If historical records cannot be mapped safely:
- leave them in a conservative state
- require explicit owner instructions before changing them
- record their ambiguity in the migration report

## Removal criteria for the legacy flag
The legacy `IsPublished` flag should be removed only when:
- all domain logic reads lifecycle state exclusively
- all migrations are complete
- candidate access enforcement is verified
- the admin workflow is using the lifecycle model consistently
- tests and documentation are updated to reflect the new source of truth

## Rollback considerations
- migration rollback must preserve the ability to recover the old `IsPublished` value where that evidence exists
- historical candidate attempts and other records must not be rewritten in a way that loses their exact starting revision
- tolerance for legacy compatibility should be temporary and documented

## Final recommendation
Use lifecycle state as authoritative immediately, and treat `IsPublished` as a derived compatibility property only during a transition window. Do not silently reclassify historical records without explicit audit evidence.

## Status summary
- Product policy: OWNER APPROVED
- Technical implementation: IMPLEMENTATION DETAIL REQUIRED
- Compatibility mapping: REQUIRED before code changes
- Next gate: OWNER REVIEW REQUIRED
