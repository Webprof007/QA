Before adding or changing a QA domain entity, review this document and reuse existing shared entities and relations where applicable.

# QA domain model

Reviewed against the frontend on 2026-09-15. This document records current ownership and the rules for extending it. **Reuse entities by ID; do not duplicate domain state.** Known legacy exceptions below are not patterns for new development.

## Current entities and ownership

`QAApp` in `src/App.tsx` owns saved QA data in React state. Pages own selection, filters and unsaved editor drafts. Navigation keeps saved state; reload/logout discards mock QA changes. Only auth uses the PHP API.

| Entity | Current source of truth / role |
| --- | --- |
| Project | `projects`; root of QA data. `userIds: number[]` references numeric auth user IDs. |
| User | `useAuth().user` (`AuthUser`); PHP session + `/auth/me.php`. No second user directory/state. Demo memberships grant the current user access to mock projects; they are not server authorization. |
| ProjectArea | `projectAreas`; one catalog per project shared across Requirements, Test Cases, Checklists, Defects, Audit and Coverage. |
| Requirement | `requirementsByProject[id].items`; one live definition. Optional Priority reuses the current Test Case priority values; it is not Defect priority. |
| TestPlan | `testPlans[]`; many plans per project, planning documents, not implicit containers of Test Cases. |
| TestCase | `testCasesByProject[id].items`; central live definition with technical ID, display code and structured steps. |
| TestRun / TestExecution | `testRunData.runs` / `.executions`; executions reference a case and contain its historical snapshot. |
| Defect | `defects.items`; independent editable product issue, including its own copied incident context. |
| Checklist / ChecklistRun | `checklists[]` / `checklistRuns[]`; template items are children of a checklist, run items are children of a run. |
| SmokeSuite / SmokeRun | `smoke.suites` / `smoke.runs`; ordered ID membership, prerequisite definitions and separate historical execution records. |
| Audit finding | `auditByProject[id][]` of `AuditItem`; observation with metadata/evidence. There is no separate Audit session/run entity today. |
| Coverage | A view over Requirements, Test Cases, executions and links. It owns no domain definitions or saved counts. |

`createdByUserId` and `executedByUserId` reference `AuthUser.id`; never substitute a copied user name. IDs and display codes are distinct for Requirements, Test Cases, Defects and Smoke Suites. Codes are project-local; IDs are the relationship keys.

## Relations and cardinalities

```text
Project
├── Areas
├── Requirements
├── Test Plans
├── Test Cases
├── Checklists ── items
├── Checklist Runs ── run items / text snapshots
├── Smoke Suites ── prerequisite definitions / Test Case ID membership
├── Smoke Runs ── Smoke Executions / prerequisite snapshots
├── Test Runs ── Test Executions ── Test Case snapshots
├── Defects
└── Audit findings

Project ↔ User                       membership by userIds (mock)
Requirement ↔ Test Case              RequirementTestCaseLink[]
Test Run → optional Test Plan        testPlanId
Test Run 1 → many Test Executions
Test Case 1 → many Test Executions   testCaseId + historical snapshot
Test Execution ↔ Defect              ExecutionDefectLink[]
Checklist 1 → many Checklist Runs    checklistId + historical item text
Smoke Suite ↔ Test Case              SmokeSuiteTestCaseLink[] with order
Smoke Suite 1 → many prerequisites   SmokePrerequisite[] (definition only)
Smoke Suite 1 → many Smoke Runs      suiteId + suite code/name snapshots
Smoke Run 1 → many Smoke Executions  TestCaseSnapshot + result
Smoke Run 1 → many prerequisite snapshots/results
```

- `requirementLinks` is the **only** saved Requirement ↔ Test Case relation: `{projectId, requirementId, testCaseId}`. `Requirement.testCaseIds` is not stored. `RequirementWithTestCases.testCaseIds` is a derived view/editor draft consumed by existing forms; saving splits definitions and links again.
- `defects.links` is the **only** general Execution ↔ Defect relation: `{projectId, executionId, defectId}`. A Defect's `sourceExecutionId` / `sourceTestCaseId` identify its creation origin, not all related executions. Never infer the complete relation from the origin fields.
- Linking a Defect currently requires a saved Fail. Changing that execution's result later does not silently remove the relation. Retest policy is undecided.
- Links contain IDs only. Deduplicate relation pairs. Unlinking never deletes the referenced definitions. Missing entities must not crash a view or create ghost copies.
- Coverage ignores invalid/dangling links. Covered means at least one existing linked case; percentage is covered requirements / total, rounded to an integer, or 0 for no requirements. Latest execution result is independent of design coverage.

## Project scoping and shared Areas

Every selection, lookup and write must check `projectId`, including **both ends** of a relation. A project-keyed container alone is not sufficient validation. Updates should match `(projectId, id)`, even when generated IDs are normally globally unique. Picker filtering is usability protection, not backend authorization.

All functional areas use `ProjectArea` and `areaId`. Audit also uses `areaId`; its filter's UI key `area` is only presentation state. The sole seed catalog is `data/projectAreasMockData.ts`. Existing IDs (including legacy `tc-area-*` IDs) are opaque, not module ownership markers. Do not regenerate an ID when renaming an Area.

`createProjectAreaData()` makes an independent seed copy for an app instance. Module state does not store its own Area arrays. The `areas` properties on `TestCasesProjectState` / `RequirementsProjectState` are page view props, supplied from shared state. Seed view fixtures likewise reference the common catalog.

Renaming an Area updates all live views by ID. Deletion is blocked while used by a saved live entity; an open editor checks its own draft and validates selected IDs on save. Historical snapshot labels do not block deleting an otherwise unused Area.

## Snapshot rule

Live entity ≠ historical snapshot. Creating a Test Run deep-copies code/title, area/type IDs **and labels**, priority/status, preconditions, structured steps including expected results, postconditions and notes. Executions render the snapshot, not the live Test Case. `testPlanTitleSnapshot` preserves the selected plan's title as run context alongside `testPlanId`.

Checklist runs retain title and ordered item text snapshots, source item IDs, result and comment. Updates preserve run/item identity and snapshots; Completed runs reject writes. Test Runs likewise reject execution edits after completion. Results reset to Not Run clear execution time/user consistently.

A Defect created from an execution copies incident context once; later definition/run changes do not update its fields. Deliberate Defect editing remains allowed. Snapshots are not separately editable live Test Case definitions.

## Concepts that must stay separate

- Test Case Type (`TestCaseDictionaryValue`) and Audit Type (`AuditDictionaryValue`, referenced by `AuditItem.type`) are distinct project dictionaries. No Requirement Type exists today. Their identical option shape and reused dictionary UI do not make them one domain catalog.
- Each entity owns its statuses/lifecycle. Do not create a universal `QAStatus` or combine TestRun, ChecklistRun and SmokeRun models.
- `AuditSeverity` and `DefectSeverity` retain their current separate scales. Severity measures impact; Priority measures urgency. Neither is an execution result.
- Audit finding ≠ Defect; no automatic conversion or link exists today.
- Checklist definition ≠ ChecklistRun; TestCase definition ≠ TestExecution; TestPlan ≠ execution container.
- View models, editor drafts, generic picker option rows and calculated counts may repeat presentation data transiently. They are not another persisted domain source of truth.

## Smoke model (legacy exception closed)

`smoke: SmokeState` in QAApp owns six separate arrays:

- `suites`: metadata with technical `id`, project-local generated `code`, name/description and timestamps.
- `links`: `{projectId, suiteId, testCaseId, order}`; many-to-many central Test Case membership, no copied definitions. Suite editor drafts contain ordered IDs only.
- `prerequisites`: `{id, projectId, suiteId, text, order}`; no checked/result state.
- `runs`: metadata, suite name/code snapshots, creator user ID, Draft/In Progress/Completed lifecycle and timestamps.
- `runPrerequisites`: source prerequisite ID, text snapshot, historical order, Not Checked/Pass/Fail and comment.
- `executions`: central `testCaseId`, shared `TestCaseSnapshot`, historical order, Not Run/Pass/Fail/Blocked/Skipped, actual result/comment/evidence note and execution time/user.

Creating a run deep-copies all current members and prerequisites in their saved order. `createTestCaseSnapshot` is shared with Test Runs; `ExecutionPanel` is presentation only. SmokeRun and TestRun state/lifecycles remain separate. The shared result-count helper computes progress; counts are never persisted. Coverage's Latest Result currently reads Test Executions only; Smoke is not automatically integrated.

Prerequisites can be checked in Draft. Start Run sets In Progress/startedAt; the first actual test result also starts a run. Returning an execution to Not Run clears executedAt/executedByUserId. Completion is allowed with outstanding items after a UI warning; all result/prerequisite writes and status changes reject Completed runs. Saved snapshots and run metadata are not editable from execution controls.

Deleted live cases do not affect historical runs. Suite views skip missing definitions and show a notice; creating a new run rejects missing/foreign members until the suite membership is corrected. Saving that suite uses the selected surviving IDs. Deleting a suite requires confirmation and is currently **blocked when it has runs**, preserving history access until archive/delete policy is designed. Deleting an entire mock project still removes its project-owned data.

Legacy `SmokeTestCase`, embedded TestResult arrays and suite checked prerequisites have been removed. The two new seed suites explicitly use existing central case IDs; no migration copies of the old 16 mock definitions are created. Legacy profile and estimatedMinutes fields were not assigned invented semantics. Suite codes are generated independently of technical IDs; runs are displayed as Run #1, Run #2 within the suite.

## Known exceptions — Requires separate redesign decision

**Identity / deletion:** Audit AUD codes currently double as project-local IDs. Before cross-module Audit links, separate technical ID and display code. Current deletion cleans Requirement links and project data locally; archive/FK policies, historical source deletion and concurrent edits need backend decisions. Demo project membership is not a permissions system.

## Future shared entities (not implemented)

- **Environment:** one project-level entity referenced by runs/issues. Current strings remain valid migration input; do not add module-specific Environment dictionaries.
- **Build / Release:** shared project entities, not parallel per-module catalogs. Current build strings are allowed; the distinction between build and release needs an explicit future decision.
- **Evidence / Attachments:** one reusable metadata/attachment mechanism. Audit currently uses `AuditEvidence[]` and temporary File API object URLs; executions/defects use notes. Backend URLs will replace temporary URLs; no base64 persistence or database BLOB design. Decide ownership, deletion and history retention with backend storage.
- Versioned requirements, release coverage, Retest, Audit links and server authorization require separate designs. Do not add placeholder domain state or automatic relations for them now.

## Change checklist

Locate the entity's owner → reuse its IDs and shared Areas → keep domain-specific lifecycle/types → validate both project IDs → preserve snapshots → test relation/isolation behavior → update this document if ownership or cardinality changes. Run `npm test`, `npm run lint`, `npm run build`.
