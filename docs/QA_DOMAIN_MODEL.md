Before adding or changing a QA domain entity, review this document and reuse existing shared entities and relations where applicable.

# QA domain model

Reviewed against the frontend on 2026-09-16. This document records current ownership and the rules for extending it. **Reuse entities by ID; do not duplicate domain state.** Known legacy exceptions below are not patterns for new development.

## Current entities and ownership

`QAApp` in `src/App.tsx` owns the frontend state/cache. Pages own selection, filters and unsaved editor drafts. The application is temporarily hybrid: Projects, Project Areas, Requirements, Test Plans and Test Case Types are loaded and mutated through the PHP API; all other QA entities remain session-local React state until their endpoints exist. A single entity must never combine API records with mock records.

| Entity | Current source of truth / role |
| --- | --- |
| Project | API-backed `projects`; root of QA data. Backend numeric IDs are normalized to frontend string IDs only in `lib/qaApi.ts`. The legacy `userIds` property is empty because the current Projects contract does not return membership. |
| User | `useAuth().user` (`AuthUser`); PHP session + `/auth/me.php`. No second user directory/state. Demo memberships grant the current user access to mock projects; they are not server authorization. |
| ProjectArea | API-backed `projectAreas`; one catalog per project shared across Requirements, Test Cases, Checklists, Defects, Audit and Coverage. |
| Environment / Release / Build | `projectSetup.environments` / `.releases` / `.builds` in QAApp; shared project-level catalogs, technical IDs separate from names/versions. |
| Requirement | API-backed `requirementsByProject[id].items`; one live definition. Optional Priority reuses the current Test Case priority values; it is not Defect priority. |
| TestPlan | API-backed `testPlans[]`; many plans per project, planning documents, not implicit containers of Test Cases. |
| TestCase | API-backed `testCasesByProject[id].items`; central live definition with technical ID, display code and structured steps. Test Case Types are also API-backed for the selected project. |
| TestSuite | API-backed `testSuites.suites`; reusable definitions with ordered central Test Case ID links in `testSuites.links`. |
| TestRun / TestExecution | `testRunData.runs` / `.executions`; executions reference a case and contain its historical snapshot. |
| Defect | `defects.items`; independent editable product issue, including its own copied incident context. |
| DefectRetest | `defectRetests[]` in QAApp; append-only focused verification records, separate from Defect and TestExecution. |
| Checklist / ChecklistRun | `checklists[]` / `checklistRuns[]`; template items are children of a checklist, run items are children of a run. |
| SmokeSuite / SmokeRun | `smoke.suites` / `smoke.runs`; ordered ID membership, prerequisite definitions and separate historical execution records. |
| Audit / AuditCheck / AuditFinding | `auditData.audits` / `.checks` / `.findings` in QAApp; project-scoped sessions with owned criteria and observations. |
| Coverage | A view over Requirements, Test Cases, executions and links. It owns no domain definitions or saved counts. |

`createdByUserId` and `executedByUserId` reference `AuthUser.id`; never substitute a copied user name. IDs and display codes are distinct for Requirements, Test Cases, Defects, Test Suites and Smoke Suites. Codes are project-local; IDs are the relationship keys.

## Relations and cardinalities

```text
Project
├── Areas
├── Environments
├── Releases
├── Builds ── optional Release
├── Requirements
├── Test Plans
├── Test Cases
├── Test Suites ── ordered Test Case ID membership
├── Checklists ── items
├── Checklist Runs ── run items / text snapshots
├── Smoke Suites ── prerequisite definitions / Test Case ID membership
├── Smoke Runs ── Smoke Executions / prerequisite snapshots
├── Test Runs ── Test Executions ── Test Case snapshots
├── Defects ── Defect Retests (focused verification history)
└── Audits ── Audit Checks / Audit Findings ── shared Evidence

Build → optional Release            releaseId (same project)
Test Run → Environment / Build       IDs + historical name/version snapshots
Smoke Run → Environment / Build      IDs + historical name/version snapshots
Defect → Environment / Build         IDs + incident name/version snapshots

Project ↔ User                       membership by userIds (mock)
Requirement ↔ Test Case              RequirementTestCaseLink[]
Test Suite ↔ Test Case              TestSuiteTestCaseLink[] with order
Test Suite → source Test Runs        optional sourceTestSuiteId + code/name snapshots
Test Run → optional Test Plan        testPlanId
Test Run 1 → many Test Executions
Test Case 1 → many Test Executions   testCaseId + historical snapshot
Test Execution ↔ Defect              DefectSourceLink[] (testExecution)
Smoke Execution ↔ Defect             DefectSourceLink[] (smokeExecution)
Audit Finding ↔ Defect               DefectSourceLink[] (auditFinding)
Defect 1 → many DefectRetests         defectId + independent context snapshots
Checklist 1 → many Checklist Runs    checklistId + historical item text
Smoke Suite ↔ Test Case              SmokeSuiteTestCaseLink[] with order
Smoke Suite 1 → many prerequisites   SmokePrerequisite[] (definition only)
Smoke Suite 1 → many Smoke Runs      suiteId + suite code/name snapshots
Smoke Run 1 → many Smoke Executions  TestCaseSnapshot + result
Smoke Run 1 → many prerequisite snapshots/results
Audit 1 → many AuditChecks           projectId + auditId
Audit 1 → many AuditFindings         projectId + auditId
AuditFinding 1 → many EvidenceItems  shared owner reference
TestExecution 1 → many EvidenceItems ownerType + ownerId
SmokeExecution 1 → many EvidenceItems ownerType + ownerId
Defect 1 → many EvidenceItems          ownerType + ownerId
DefectRetest 1 → many EvidenceItems    ownerType + ownerId
```

- `requirementLinks` is the **only** saved Requirement ↔ Test Case relation: `{projectId, requirementId, testCaseId}`. `Requirement.testCaseIds` is not stored. `RequirementWithTestCases.testCaseIds` is a derived view/editor draft consumed by existing forms; saving splits definitions and links again.
- `defects.links` is the **only** source ↔ Defect relation: `DefectSourceLink {projectId, sourceType, sourceId, defectId}`. Source types are testExecution, smokeExecution and auditFinding. Deduplicate the full typed key; IDs from different source types do not collide. A Defect's `source` identifies creation origin (type, ID, runId or auditId); `sourceTestCaseId` is derived from an execution when present. These origin fields do not represent all linked sources. The former untyped ExecutionDefectLink/sourceExecutionId on Defect was replaced, not retained as a parallel relation.
- Linking execution sources requires a saved Fail; Audit Findings do not need an execution result. Both the source and its parent Run/Audit must exist in the same project as the Defect. Completed parents permit follow-up links without changing historical source records or Evidence. Changing an execution result later does not silently remove existing links. Focused DefectRetest records do not create or change these links.
- Links contain IDs only. Deduplicate relation pairs. Unlinking never deletes the referenced definitions. Missing entities must not crash a view or create ghost copies.
- Coverage ignores invalid/dangling links. Covered means at least one existing linked case; percentage is covered requirements / total, rounded to an integer, or 0 for no requirements. Latest execution result is independent of design coverage.

## Derived Run Reports

Test Run Report and Smoke Run Report are read-only derived views. They do not
introduce a Report entity or saved counters. Each view calculates total,
completed and remaining work from the existing execution result enum, and
shows per-result counts using that module's own values. It renders saved Run
metadata and snapshots, execution TestCase code/title/result, and typed
DefectSourceLink relations. Smoke also derives prerequisite totals from
SmokeRunPrerequisite results. Empty and Not Run states are valid report output.

Reports never edit a Run, execution, prerequisite, snapshot or EvidenceItem.
They link to existing execution and Defect views. Test Run keeps its optional
Test Plan and source Test Suite snapshots; Smoke keeps suite and
Environment/Build snapshots. PDF/export and a persisted reporting/history
domain remain future work.

## Project scoping and shared Areas

Every selection, lookup and write must check `projectId`, including **both ends** of a relation. A project-keyed container alone is not sufficient validation. Updates should match `(projectId, id)`, even when generated IDs are normally globally unique. Picker filtering is usability protection, not backend authorization.

All functional areas use `ProjectArea` and `areaId`. Audit also uses `areaId`; its filter's UI key `area` is only presentation state. The selected Project's API-backed `projectAreas` collection is the live source of truth. Existing IDs are opaque, not module ownership markers. Do not regenerate an ID when renaming an Area.

Module state does not store its own Area arrays. The `areas` properties on `TestCasesProjectState` / `RequirementsProjectState` are page view props supplied from shared state. Local fixtures may provide Areas only as isolated test data, never as a runtime fallback for the API catalog.

Renaming an Area updates all live views by ID. Deletion is blocked while used by a saved live entity; an open editor checks its own draft and validates selected IDs on save. Historical snapshot labels do not block deleting an otherwise unused Area.

## API-backed and local ownership

`lib/api.ts` is the one HTTP client and uses `VITE_API_URL`, session-cookie
credentials and the backend error contract. `lib/qaApi.ts` is the domain adapter
for Projects, Project Areas, Requirements, Test Plans, Test Cases, Test Case Types
and Requirement ↔ Test Case links. Numeric
backend IDs are converted to the frontend string ID type at this boundary and are
converted back only when building requests. A failed mutation never creates or
changes the corresponding local cache record. A 401 delegates to the existing
auth/session refresh flow.

After authentication, Projects load first. Selecting a Project loads its Areas,
Requirements, Test Plans, Test Cases, Test Case Types and Requirement ↔ Test Case
links independently as one project-scoped
batch. Their old demo seeds are not fallback data. Existing data is retained while
an error is shown, and responses for an abandoned Project selection are ignored.
Project edit is not implemented because the current backend has no update endpoint.
After a successful Project create, the new Project becomes active and opens Project
Settings while its Areas, Requirements, Test Plans and Test Case Types load.

Project Settings is a presentation and management screen, not a domain entity or
another state owner. It shows API Project name/description read-only, because the
backend has no Project update endpoint. Project Areas and Test Case Types are
created, renamed and deleted centrally in Settings through their existing API-backed
collections. Requirements, Test Cases, Checklists and Audit only select from those
shared dictionaries; they do not expose parallel dictionary CRUD. Environment,
Release and Build management uses the existing shared `projectSetup` state and
remains frontend/session-only. The Danger Zone invokes the existing confirmed
Project deletion flow.

Test Suites, Checklists/Runs, Smoke, Test Runs/Executions, Defects/Retests, Audit,
Evidence, Environment/Release/Build and derived Reports remain frontend-only. Their
domain rules and ID relations are unchanged. Requirement and Test Case CSV/XLSX
imports validate in the browser, then create each accepted definition through the
same API mutation path and report partial failures. Checklist imports remain local.

## Snapshot rule

Live entity ≠ historical snapshot. Creating a Test Run deep-copies code/title, area/type IDs **and labels**, priority/status, preconditions, structured steps including expected results, postconditions and notes. Executions render the snapshot, not the live Test Case. `testPlanTitleSnapshot` preserves the selected plan's title as run context alongside `testPlanId`.

Checklist runs retain title and ordered item text snapshots, source item IDs, result and comment. Updates preserve run/item identity and snapshots; Completed runs reject writes. Test Runs likewise reject execution edits after completion. Results reset to Not Run clear execution time/user consistently.

A Defect created from an execution copies incident context once; later definition/run changes do not update its fields. Deliberate Defect editing remains allowed. Snapshots are not separately editable live Test Case definitions.

## Concepts that must stay separate

- Test Case Type (`TestCaseDictionaryValue`) and Audit Type (`AuditDictionaryValue`, referenced by `Audit.typeId` / `AuditFinding.type`) are distinct project dictionaries. No Requirement Type exists today. Their identical option shape and reused dictionary UI do not make them one domain catalog.
- Each entity owns its statuses/lifecycle. Do not create a universal `QAStatus` or combine TestRun, ChecklistRun and SmokeRun models.
- `AuditSeverity` and `DefectSeverity` retain their current separate scales. Severity measures impact; Priority measures urgency. Neither is an execution result.
- Audit finding ≠ Defect; explicit Create/Link Defect actions preserve the Finding. There is no automatic conversion or deletion.
- Checklist definition ≠ ChecklistRun; TestCase definition ≠ TestExecution; TestPlan ≠ execution container.
- View models, editor drafts, generic picker option rows and calculated counts may repeat presentation data transiently. They are not another persisted domain source of truth.

## General Test Suites

Test Plan ≠ Test Suite ≠ Test Run; SmokeSuite ≠ TestSuite. A plan is a document, a general suite is an editable group of central cases, and a run is an execution record. General suites have no Area, type, status or results of their own. Smoke retains its separate prerequisites and execution lifecycle.

`testSuites` in QAApp is the API-backed state cache for `suites: TestSuite[]` and `links: TestSuiteTestCaseLink[]`. Links store only `{projectId, suiteId, testCaseId, order}`. Saving validates suite/case project ownership and deduplicates IDs before the backend persists the ordered membership. Editing or removing membership never edits central cases.

Create Test Run from Suite prefills the existing run editor with ordered member IDs. Users may change the selection without modifying the suite. At creation, `sourceTestSuiteId`, `sourceTestSuiteCodeSnapshot` and `sourceTestSuiteNameSnapshot` capture source context from a validated same-project suite. Executions, in their creation order, and deep TestCaseSnapshots are the authoritative run content; live suite membership is never used to reconstruct history. No separate suite execution mechanism is introduced.

Suite detail derives history from existing project Test Runs by sourceTestSuiteId. Suite edits do not alter source context snapshots. Confirmed suite deletion removes only its definition and membership links: central cases, runs and executions remain. Runs show source snapshots even when the suite is absent. Missing live cases are skipped with an update warning and block the suite's Create Test Run action until membership is corrected. No ghost case is created.

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

## Defect Retest workflow

`DefectRetest` is an independent focused verification record, not a TestExecution or fake TestRun. QAApp owns one `defectRetests[]` collection. Defect 1 → many DefectRetests via projectId/defectId. Original source ↔ Defect links describe discovery; Defect → Retest describes fix verification. Saving a Retest never adds DefectSourceLink or updates TestRun/Smoke executions. Smoke-origin Defects can use their SmokeExecution snapshot as fallback when the live TestCase is absent; no fake TestRun is created.

Only Ready for Retest permits saving Pass/Fail/Blocked. Drafts exist only inside the UI. Environment is required and must be active/current-project; Build is optional and must exist in the same project. Existing valid incident IDs are preselected, but unavailable/inactive defaults must be replaced. Each save captures current shared name/version snapshots and authenticated user ID, with generated executedAt/createdAt. Retest context never overwrites original Defect incident context. There are no saved-Retest edit/delete controls or update helpers; deleting an entire mock project removes its project-owned retests.

Snapshot precedence for a new attempt: current live central TestCase through `createTestCaseSnapshot` → source TestExecution snapshot → latest previous Retest snapshot for that case → frozen Defect title/stepsToReproduce/expectedResult/actualResult in `defectContextSnapshot`. The fallback field is intentional additional history data: manual Defect editing must not alter prior Retest instructions. No fake TestCase is created. Existing snapshots are deep-copied. Helpers reject foreign source entities and foreign Environment/Build IDs.

History is chronological, with stable append order for equal timestamps; Retest #N is derived. Saved details always show snapshots. New → Open and Open/In Progress → Ready for Retest have explicit actions; existing manual Defect status editing remains. Saving any result leaves Ready for Retest unchanged. The latest Pass offers Close Defect (Closed); the latest Fail offers Reopen Defect (Open); Blocked offers neither. Clicking Close/Reopen is the user's explicit status confirmation, never an automatic effect of saving. Outcome actions validate the latest attempt, project, status, result and whether the Defect has since changed. Closed/Rejected/Duplicate do not allow new Retests; history remains readable. There is no general status audit log or permissions workflow.

## Project deletion ownership

Project is the root-owned entity for QA data. After explicit user confirmation,
deleting a Project means permanent deletion of every project-owned QA entity and
relation. The backend operation must preserve its authorization rules and run in
one database transaction so either the complete project graph is deleted or no
part of it is deleted. Child rows must be removed through verified `ON DELETE
CASCADE` constraints or explicit project-scoped child-to-parent deletes; global FK
checks must not be disabled.

Auth users and session data are not owned by Project and must not be deleted.
Project membership relations may be deleted with the Project. When backend file
storage exists, physical Evidence files owned by the Project must also be removed
as part of the deletion workflow. The current browser-only object URLs require no
server cleanup; this file-storage step remains backend-dependent.

## Shared Environments, Releases and Builds

Environment is where testing happens; Release is a logical product version; Build is a concrete assembly that may reference a Release. These are separate project-owned entities, not module-specific dictionaries. Settings / Налаштування edits the one shared `projectSetup` state. Release owns Planning/Active/Released/Archived statuses; Environment owns isActive. Build has no added lifecycle.

TestRun, SmokeRun and Defect reuse the `ProjectContext` field shape: optional environmentId/environmentNameSnapshot and buildId/buildVersionSnapshot. They remain separate entities. Create helpers validate IDs against the current project's shared catalogs and capture current names/versions. New selections reject missing/inactive Environments and foreign IDs. Build creation validates same-project Release ownership and rejects a new association with an Archived Release; existing Build associations may be retained.

`ProjectContextFields` is the shared selector UI. Active Environments and project Builds are offered; Build options include the live Release name as selection context. Historical Run and Defect views display saved snapshots, never substitute live renamed labels. No release snapshot is added because no historical release label is shown.

Defect creation from a saved Fail copies the source Run's IDs and incident snapshots. Saving unrelated Defect edits preserves that context (including deleted/inactive references). Explicitly choosing another ID validates it and captures its current label; clearing selection clears the corresponding snapshot. Incoming editor snapshot text is not authoritative: saved/source context or validated live lookups are used.

Confirmed Environment/Build deletion removes only the catalog entry. Historical references may dangle, while snapshots remain readable without ghost entities. Releases are archived rather than deleted in the UI. Final archive/FK and concurrent-write policies remain backend decisions.

Old arbitrary environment/build string fields have been removed from TestRun, SmokeRun and Defect; no parallel string entry path remains. Existing mock Runs start empty and demo Defects had blank context, so those records have no selected IDs; the shared Voicli seed provides three Environments, two Releases and three Builds for future records. **TestPlan.environment remains planning text** because it can describe multiple environments/setup instructions. No context fields are added to ChecklistRun, Audit, TestSuite or Coverage.

## Shared Evidence / Attachments

App owns one `EvidenceItem[]`. Each record references exactly one owner by
`projectId + ownerType + ownerId`: TestExecution, SmokeExecution, Defect,
DefectRetest or AuditFinding. No embedded attachment arrays or independent
AuditEvidence model remain. Helpers resolve the actual owner and parent run or Audit,
reject cross-project/missing owners, and hide orphan records.

Evidence ≠ comment ≠ actual result ≠ evidenceNote. Notes remain text.
Defect evidence is independent of source execution evidence; nothing is copied
automatically. The shared EvidenceSection renders metadata, previews and links.

Completed TestRun/SmokeRun/Audit evidence is read-only. Retest draft attachments are
committed together with the new Retest; saved Retest evidence cannot be changed
or deleted. Audit attachments are staged until finding Save; cancellation releases
unsaved files. Defect and unfinished executions permit add/remove.

Files use session-only browser object URLs plus metadata, never File objects or
base64 in domain state. Shared URL ownership retains saved and draft references,
revokes removed/abandoned URLs, and releases URLs on app unmount. Reload loses
mock attachments. The 20 MB frontend limit only protects browser memory.
Links accept http/https and open with noopener/noreferrer. Backend storage,
server validation, access control and retention/delete policies are deferred.

## Future work (not implemented)

- Versioned requirements, release coverage and server authorization require separate designs. Do not add placeholder domain state or automatic relations for them now.

## Change checklist

Locate the entity's owner → reuse its IDs and shared Areas → keep domain-specific lifecycle/types → validate both project IDs → preserve snapshots → test relation/isolation behavior → update this document if ownership or cardinality changes. Run `npm test`, `npm run lint`, `npm run build`.

## Audit sessions (legacy finding-only screen replaced)

QAApp owns one AuditState: audits, checks, findings. Audit is a project-owned
review session. Its technical ID differs from its project-local AUDIT code.
It contains title, Audit type ID, objective/scope, planned dates, notes/limitations,
creation/update metadata and optional creator user ID. The existing Audit
classification dictionary is reused within this domain; it is independent of
Test Case Type. Findings retain their existing classification and severity/status.

Lifecycle is Draft → In Progress → Completed through explicit actions.
Start records startedAt; completion records completedAt. Completion requires
confirmation, including outstanding Not Checked criteria and discarded unsaved
finding drafts. No reopen or delete-session workflow is implemented.
AuditCheck owns criterion/result/comment, references projectId/auditId and has
Not Checked/Pass/Fail/N/A results. It is neither TestCase nor ChecklistItem.
Checks can be prepared and updated before completion.

AuditFinding replaces the legacy AuditItem type (no parallel model).
It has a technical ID and separate project-local AUD display code, auditId,
shared areaId, classification, severity/status, description/location/expected/
actual, note/task fields and creation/update metadata. It remains distinct from
Defect. Findings are not embedded in Audit; EvidenceItem references a finding's
technical ID, never its code. The existing demonstration finding seed belongs
explicitly to one demo session; this is frontend seed data, not a production migration.

Mutation helpers validate the Audit, child ownership and both project IDs.
Existing checks/findings cannot be moved by changing auditId. Area/type choices
must belong to the same project. Completed blocks metadata/check/finding
writes and deletion, and the shared Evidence helper resolves the parent Audit
before allowing attachment changes. Historical UI has no editing controls.
Completion freezes Area/type labels for historical display, so catalog renames
do not alter a completed record. This does not create duplicate dictionaries.
Other content stays in the original immutable Audit/check/finding records;
no parallel snapshot collection is needed. Project deletion still removes that
project's mock state.

Further Audit integrations, server authorization, archive/deletion,
status audit trails and concurrent changes remain separate future decisions.

## Defect follow-up from Smoke and Audit

All three source kinds reuse the same Defect editor, existing-defect picker,
App-owned DefectsState and typed ID relation collection. One source can have
many Defects and one Defect can have many sources, including mixed kinds.
The source panels show linked Defects; origin detail navigates back through the
existing Smoke/Test Run/Audit screens. Missing origins show a safe unavailable
message, while the Defect retains its own copied incident fields.

Smoke creation reads the historical TestCaseSnapshot, execution actual result,
comment/evidence note and SmokeRun Environment/Build snapshots plus browser/device.
Audit creation prefills title, description/location/comment context, expected,
actual, shared Area and evidence note. Its severity suggestion maps critical →
Critical, high → Major, medium → Minor, low → Trivial; Priority keeps the ordinary
Medium default. These separate scales are not merged and the user can edit
suggestions before saving. Audit does not invent Environment/Build or TestCase.

Creating a Defect writes only the Defect and relation state. Origin references
are validated/canonicalized on creation and immutable during ordinary Defect
editing. Existing source content and completed states are never rewritten.
Evidence belongs to its original owner and is never automatically copied.
Unsaved source changes must be saved before follow-up actions. No backend,
permissions, automatic linking, unlink workflow or multi-source provenance
timeline is implemented in this step.

## Import / Export transport

CSV/XLSX import and export are browser-side transport and presentation features,
not domain entities or another source of truth. They currently create and export
only live Requirements, Test Cases and Checklists. Import validates project-scoped
Area and Test Case Type references before explicit confirmation; it never creates
shared dictionaries or cross-project relations from a file. Files and raw rows stay
in transient UI state, while confirmed records are normal project-owned entities.
Export uses readable Area/Type names and omits technical IDs and historical snapshots.
