# PrepFord Examination Management — P3.1 Examination Code Specification

## Status
- Decision ID: D6
- Status: OWNER APPROVED
- Approved direction: sequential, pathway-scoped examination codes
- Current unresolved item: exact code format and exact sequence-reset policy
- Implementation status: OWNER APPROVAL REQUIRED if the exact format differs from the recommended default

## Repository evidence
The current `Exam` entity in `apps/api/Models/Assessments.cs` includes `Pathway` but no code field and no uniqueness constraint. The repository documents (`docs/exam-management-p3-owner-decisions.md`) propose `ExamCode` as unique per pathway and a format like `{PATHWAY}-{TYPE}-{SEQUENTIAL}`. The current repository does not include either an actual code field or any database-level uniqueness enforcement for examination codes.

## Approved product direction
The owner approved the following:
- codes are sequential
- codes are unique within the approved pathway scope
- a new revision retains the stable examination’s code
- code generation must be concurrency-safe and protected by a database uniqueness constraint

## Product guardrails
- Do not introduce a second `TargetProgram` field if `Pathway` already represents the same business domain concept.
- Do not implement a code-generation strategy that depends on read-max-plus-one logic without a database-enforced uniqueness constraint.
- Do not store codes in more than one location unless a later implementation proves there is a real need.

## Recommended implementation model
Recommended minimal product model:
- stable `Examination` identity carries the code
- `Exam` revision row uses the code as inherited or copied value, depending on the final table design
- code allocation occurs at the stable identity level, not on every revision record
- the database enforces uniqueness within `(Pathway, Code)`

## Recommended code format options

### Option A — compact pathway-scoped code
Recommended default if product requires a compact administration code:
- `RN-0001`
- `PN-0001`

### Option B — pathway + type + sequential code
Recommended if product needs more descriptive codes:
- `RN-PRACT-0001`
- `PN-PRACT-0001`

### Option C — stable identity code with revision suffix
Not recommended for the foundation phase because it introduces unnecessary complexity and historical ambiguity:
- `RN-0001-R1`

## Recommended default
Use `RN-0001` / `PN-0001` style compact codes unless the product owner explicitly prefers a more descriptive format.

## Sequence scope and reset behavior
Recommended rule:
- sequence is unique within a pathway
- `RN` and `PN` sequences are independent
- the sequence does not reset by revision number
- a code is not reused once assigned and stable across the examination’s lifetime

This keeps the path-specific identity clear and avoids conflicts between pathways.

## Concurrency-safe allocation
The code generator must not do:
1. read max code
2. add one
3. save

This is unsafe under concurrent requests.

Recommended safe implementation pattern for the final code:
- allocate a database-backed counter or sequence at the pathway scope
- persist the code in a transaction with an enforced unique constraint
- fail the request cleanly when the database rejects a duplicate allocation
- audit the failed allocation with the actor and requested pathway

## Unique constraint requirements
At minimum, the database must enforce uniqueness for:
- `(Pathway, Code)` if a code is assigned to the stable identity
- or the equivalent stable-identity-level unique scope used by the final design

## Collision handling
If a duplicate code allocation is attempted:
- reject the transaction
- do not silently modify the existing code
- return the normal conflict response
- audit the failed allocation event for troubleshooting

## Historical code preservation
- a historical revision should retain the code assigned to the parent examination identity
- a new revision does not invent a new code unless the product explicitly decides that revisions may be assigned their own code namespace
- default recommendation: keep one stable code for the examination family and allow revision changes without code changes

## Remaining owner decisions
The following must be explicitly approved before implementation:
- exact code format (`RN-0001` vs `RN-PRACT-0001` or another pattern)
- whether sequence numbering resets by calendar year, pathway, or remains continuous
- whether an archived or retired examination can ever reuse a code

## Final recommendation
Implement a stable examination family code that is unique per pathway and generated through a database-enforced mechanism. Do not implement naive max-plus-one allocation. Keep the exact code string format as the last remaining product decision until the owner confirms the preferred UX and administrative readability tradeoff.

## Status summary
- Product policy: OWNER APPROVED
- Exact code format: OWNER APPROVAL REQUIRED
- Sequence safety: IMPLEMENTATION DETAIL REQUIRED
- Next gate: OWNER REVIEW REQUIRED
