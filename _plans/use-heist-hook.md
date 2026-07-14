# Plan: `useHeist` real-time hook + heists list page wiring

## Context

The heists list page (`app/(dashboard)/heists/page.tsx`) is currently a heading-only stub with three empty sections. Per `_specs/use-heist-hook.md`, we need a `useHeist(mode)` hook that gives real-time, filtered access to the `heists` Firestore collection, and we need to wire it into those three sections so each shows the titles of its result set. This introduces the first real-time (`onSnapshot`) Firestore listener in the codebase — everything else so far uses one-shot `getDocs`/`addDoc` (see `components/HeistForm/HeistForm.tsx`).

Confirmed decisions (via user Q&A):
- Deploy the new composite indexes immediately as part of this change (via Firebase MCP), not just write the JSON.
- The hook exposes no error state — swallow `onSnapshot` errors with `console.error`, matching this repo's minimal-hook convention.
- `'expired'` mode filters `finalStatus` with `where("finalStatus", "in", ["success", "failure"])` rather than `!= null`.
- The `now` cutoff for deadline comparisons is captured once per subscription (at mode/uid change), not continuously re-evaluated — acceptable per spec.

## 1. `lib/useHeist.ts` (new)

Follows the `lib/user-context.tsx` / `HeistForm.tsx` conventions: hooks live in `lib/`, Firestore accessed via `db` from `@/lib/firebase`, docs converted via `heistConverter.fromFirestore`.

```ts
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useUser } from "@/lib/user-context"
import { COLLECTIONS, heistConverter, type Heist } from "@/types/firestore"

export type HeistMode = "active" | "assigned" | "expired"
```

- `useHeist(mode: HeistMode): Heist[]` — internal `useState<Heist[]>([])`, no loading/error exposed.
- Query per mode (all against `collection(db, COLLECTIONS.HEISTS)`):
  - `'active'`: `where("assignedTo", "==", currentUser.uid)`, `where("deadline", ">", now)`
  - `'assigned'`: `where("createdBy", "==", currentUser.uid)`, `where("deadline", ">", now)`
  - `'expired'`: `where("finalStatus", "in", ["success", "failure"])`, `where("deadline", "<=", now)` — no user filter
- `useEffect` guard: for `'active'`/`'assigned'`, if `!currentUser?.uid` (auth still loading, or signed out), skip subscribing, `setHeists([])`, return early. `'expired'` subscribes unconditionally regardless of auth state.
- Effect dependency array: `[mode, currentUser?.uid]` — the primitive uid, not the whole `currentUser` object (which gets a new reference on every `onAuthStateChanged` firing per `lib/user-context.tsx`, which would cause spurious resubscribes).
- `onSnapshot`'s success callback: `setHeists(snapshot.docs.map((d) => heistConverter.fromFirestore(d)))`. Error callback (2nd arg to `onSnapshot`): `console.error`, leave state as-is.
- Cleanup: `return unsubscribe` directly from the effect, mirroring `lib/user-context.tsx`'s `return unsubscribe` from `onAuthStateChanged`.

## 2. `app/(dashboard)/heists/page.tsx` (modify)

Needs `"use client"` added (currently a server component; hooks require client). Call `useHeist` three times and render title lists under each existing heading:

```tsx
"use client"

import { useHeist } from "@/lib/useHeist"

export default function HeistsPage() {
  const activeHeists = useHeist("active")
  const assignedHeists = useHeist("assigned")
  const expiredHeists = useHeist("expired")

  return (
    <div className="page-content">
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <ul>
          {activeHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
      <div className="assigned-heists">
        <h2>Heists You've Assigned</h2>
        <ul>
          {assignedHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
      <div className="expired-heists">
        <h2>All Expired Heists</h2>
        <ul>
          {expiredHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

No new CSS — existing global classes are preserved as-is; no `page.module.css` exists for this route today and the spec doesn't ask for styling.

## 3. `firestore.indexes.json` (modify) + deploy

Add three composite index entries to the currently-empty `"indexes": []` array (equality/`in` field first, then the range field):

```json
{
  "indexes": [
    {
      "collectionGroup": "heists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assignedTo", "mode": "ASCENDING" },
        { "fieldPath": "deadline", "mode": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "heists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdBy", "mode": "ASCENDING" },
        { "fieldPath": "deadline", "mode": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "heists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "finalStatus", "mode": "ASCENDING" },
        { "fieldPath": "deadline", "mode": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

After writing the file, deploy the indexes so the queries work against the real project — use the `mcp__firebase__firestore_create_index` tool (or `firebase deploy --only firestore:indexes` if the MCP path doesn't fit) for each of the three entries above, targeting the project's `(default)` Firestore database per `firebase.json`.

## 4. Tests

**`tests/lib/useHeist.test.tsx`** (new) — probe-component pattern matching `tests/lib/user-context.test.tsx` / `tests/components/HeistForm.test.tsx`:
- Mock `firebase/firestore` (`collection`, `query`, `where`, `onSnapshot`), `@/lib/firebase` (`db: {}`), `@/lib/user-context` (`useUser`).
- Probe component renders `useHeist(mode)` results into a `data-testid="heists"` list.
- Fake snapshot builder with `docs: [{ id, data() }]`, mirroring `fakeUsersSnapshot` in `HeistForm.test.tsx`.
- Capture the `onSnapshot` callback (like the `onAuthStateChanged` capture pattern in `user-context.test.tsx`) and invoke it manually inside `act(...)`.
- Cases: (1) `'active'` calls `where("assignedTo","==",uid)` + `where("deadline",">",...)` and renders delivered titles; (2) `'assigned'` calls `where("createdBy","==",uid)` + deadline range, renders titles; (3) `'expired'` calls `where("finalStatus","in",[...])` + deadline range and subscribes even when `useUser` returns `undefined`; (4) `'active'` does not call `onSnapshot` when `useUser` returns `undefined`, renders empty list; (5) same for `useUser` returning `null`; (6) changing `mode` prop unsubscribes the old listener and subscribes a new one; (7) a second `onSnapshot` callback invocation updates rendered titles in place.

**`tests/app/(dashboard)/heists/page.test.tsx`** (new) — mirrors `tests/app/(dashboard)/layout.test.tsx` path convention:
- Mock `@/lib/useHeist` directly (`vi.fn()` keyed by mode argument) so this test is decoupled from Firestore internals — verifies wiring only.
- Case: distinct arrays per mode render each title under the correct section.
- Case: empty arrays render each heading with no list items.

## Verification

1. `npm run lint` and `npx vitest run tests/lib/useHeist.test.tsx tests/app/\(dashboard\)/heists/page.test.tsx` — confirm new tests pass and no lint errors.
2. `npm test` — full suite still green (no regressions in existing tests, e.g. from adding `"use client"` to the page).
3. Deploy the three composite indexes via Firebase MCP, then confirm via `mcp__firebase__firestore_list_indexes` that all three are present and building/enabled.
4. `npm run dev`, sign in, and manually confirm on `/heists`: titles appear under the correct sections for at least one active, one assigned, and one expired heist (create test data via the existing create-heist flow, or directly via Firestore MCP), and that creating/updating a heist while the page is open updates the list without a manual refresh.
