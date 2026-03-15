---
title: "Patients List Stays Stale After Successful Create in Sivanethram Frontend"
date: 2026-03-13
category: ui-bugs
severity: medium
component: frontend/src/components/patients/PatientTable.tsx
tags: [nextjs, react, patients, stale-state, pagination, sivanethram]
symptoms:
  - "Creating a patient succeeds, but the new record does not appear in http://localhost:3000/patients"
  - "The backend returns 201 Created for POST /api/v1/patients/"
  - "The patients list can remain stuck on older or empty data until a manual refresh or state reset"
root_cause: "PatientTable initialized local paginatedData from initialData with useState(initialData) but never synchronized that local state when the parent page's async useApi fetch returned newer patient data. The create path worked; the read path was stale."
resolution: "Synchronize PatientTable's mirrored paginated state with incoming initialData by adding a useEffect that calls setPaginatedData(initialData) whenever initialData changes."
time_to_resolve: "~30 minutes including cross-app port investigation and backend verification"
prevention: "Avoid mirroring fetched props into local state unless necessary. If a mirror is required for pagination or optimistic updates, explicitly synchronize it and add a rerender/regression test."
---

## Context

The reported symptom was that patient saving was "not working" from the browser UI. The first pass of investigation showed that the save complaint was coming from `http://localhost:3000`, which turned out to be the Sivanethram app, not the Ruthva app on `http://localhost:3001`.

That distinction mattered because the two apps were running side by side with different codebases and different route structures:

- `3000` = Sivanethram (`next-server v14.2.35`)
- `3001` = Ruthva (`next-server v16.1.6`)

Once the correct app was identified, the patient create flow in Sivanethram was traced end to end.

## Investigation Steps

1. Confirmed the issue was being reproduced on `localhost:3000`, not the Ruthva server on `localhost:3001`.
2. Located the Sivanethram frontend at:
   - `frontend/src/app/(dashboard)/patients/page.tsx`
   - `frontend/src/components/patients/PatientTable.tsx`
   - `frontend/src/components/patients/PatientForm.tsx`
3. Traced the create flow in `PatientForm.tsx` and verified it submits through:
   - `useMutation("post", "/patients/")`
   - `frontend/src/lib/api.ts`
   - backend `POST /api/v1/patients/`
4. Verified the backend was healthy by posting directly to `http://localhost:8000/api/v1/patients/` with a valid clinic-scoped JWT and `X-Clinic-Slug`, receiving `201 Created`.
5. Compared the write path versus the read path and found the mismatch:
   - the create endpoint worked
   - the patients list UI did not refresh its local table state from updated fetched props
6. Read `frontend/src/app/(dashboard)/patients/page.tsx` and confirmed the page fetches fresh data via `useApi("/patients/")`.
7. Read `frontend/src/components/patients/PatientTable.tsx` and found that it copied `initialData` into local state only once.

## Root Cause Analysis

The page component fetched patients asynchronously:

```tsx
const { data } = useApi<PaginatedResponse<PatientListItem>>("/patients/");
const initialData = data ?? {
  count: 0,
  next: null,
  previous: null,
  results: [],
};
```

That fresh `initialData` was passed into `PatientTable`, but the table treated it like a one-time initialization value:

```tsx
const [paginatedData, setPaginatedData] = useState(initialData);
```

This created a stale-state bug:

- first render: `initialData` is still empty
- `PatientTable` stores the empty object in local state
- `useApi` later resolves with the actual patient list
- parent rerenders with populated `initialData`
- `PatientTable` never copies that new prop into `paginatedData`

So the save path was correct, but the list remained visually stale.

## Working Solution

Add an explicit synchronization effect in `PatientTable` so its mirrored pagination state tracks new server-fetched props.

### File

`frontend/src/components/patients/PatientTable.tsx`

### Fix

```tsx
const [paginatedData, setPaginatedData] = useState(initialData);

useEffect(() => {
  setPaginatedData(initialData);
}, [initialData]);
```

### Why this works

`PatientTable` still keeps local state for user-driven pagination changes, but it now updates when the parent fetch returns newer data. That preserves the existing component structure while removing the stale initialization bug.

## Verification

- Direct backend create request returned `201 Created`, proving the save path was working.
- After the patch, `PatientTable` can adopt newly fetched patient data instead of staying on the original empty or stale state.
- Targeted ESLint on `frontend/src/components/patients/PatientTable.tsx` passed.

## Prevention Strategies

### 1. Avoid mirrored state unless necessary

If a component can render directly from fetched props, prefer that over copying props into local state.

### 2. Synchronize prop mirrors explicitly

If local state is needed for pagination, optimistic inserts, or temporary table mutations, add a synchronization effect and document the intent.

### 3. Separate write-path and read-path debugging

When a "save failed" report comes in:

1. verify whether the write endpoint actually failed
2. verify whether the list or detail view failed to refresh

This reduces time lost on the wrong layer.

### 4. Confirm port-to-app mapping first

In local multi-app development, confirm which app each port serves before debugging. In this case, the initial confusion between Sivanethram (`3000`) and Ruthva (`3001`) added noise to the investigation.

## Suggested Tests

### Component test

Render `PatientTable` with empty `initialData`, rerender with populated `initialData`, and assert that rows update.

### Integration test

Mock the patients page so it first renders an empty result set and then a populated one from `useApi`, and confirm the table reflects the later data without a manual refresh.

### Regression test

Create a patient through the UI, navigate to `/patients`, and assert that:

- the patient count updates
- the new `record_id` appears in the table
- clicking the new row opens the detail page

## Related Documentation

- `docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md`
  - similar in that the user-visible symptom was misleading until the full route/data flow was traced

## Files Involved

- `frontend/src/app/(dashboard)/patients/page.tsx`
- `frontend/src/components/patients/PatientTable.tsx`
- `frontend/src/components/patients/PatientForm.tsx`
- `frontend/src/hooks/useApi.ts`
- `backend/patients/views.py`
