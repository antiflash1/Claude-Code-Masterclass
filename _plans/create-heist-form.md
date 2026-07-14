# Plan: Create Heist Form

## Context

`app/(dashboard)/heists/create/page.tsx` is currently a heading-only stub. Per `_specs/create-heist-form.md`, it needs to become a working form that lets a signed-in user create a heist and assign it to another user (by codename), writing a `CreateHeistInput` document to the Firestore `heists` collection, then redirecting to `/heists`. `createdAt` (server timestamp) and `deadline` (fixed 48h out) are set programmatically; `finalStatus` starts `null`; self-assignment is disallowed.

The `users` collection already exists (written today only by `components/AuthForm/AuthForm.tsx` on signup: `setDoc(doc(db, "users", user.uid), { codename })`) but has no typed interface yet — this feature needs to read it to populate the assignee list, so a `User` type + converter is in scope.

**Explicitly out of scope:** `firestore.rules` (currently a temporary open rule expiring 2026-08-07 — confirmed with the user to leave untouched for this feature and track separately). Also out of scope: refactoring `AuthForm.tsx`'s existing `users` write, and building a reusable dropdown/combobox component (a native `<select>` is used per the project's minimal-dependencies convention).

## Files

| File | Action |
|---|---|
| `types/firestore/user.ts` | Create |
| `types/firestore/index.ts` | Modify |
| `components/HeistForm/HeistForm.tsx` | Create |
| `components/HeistForm/HeistForm.module.css` | Create |
| `components/HeistForm/index.ts` | Create |
| `app/(dashboard)/heists/create/page.tsx` | Modify |
| `tests/components/HeistForm.test.tsx` | Create |

Order: types → component (+ tests alongside, test-first per the project's `/component` TDD convention) → wire into the page last.

## Step 1 — `types/firestore/user.ts`

Follows the `firestore-schemas` skill conventions and the existing `types/firestore/heist.ts` pattern. Only a document type + read converter are needed (nothing in scope writes through this type — `AuthForm.tsx`'s existing `setDoc` call stays untouched):

```ts
export interface User {
  id: string // Firestore doc id === Firebase Auth uid
  codename: string
}

export const userConverter = {
  toFirestore: (data: Partial<User>): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): User =>
    ({ id: snapshot.id, ...snapshot.data() }) as User,
}
```

## Step 2 — `types/firestore/index.ts`

Add the barrel export and a `USERS` collection name, matching the existing `HEISTS` entry:

```ts
export * from "./heist"
export * from "./user"

export const COLLECTIONS = {
  HEISTS: "heists",
  USERS: "users",
} as const
```

## Step 3 — `components/HeistForm/HeistForm.tsx` (+ `.module.css`, `index.ts`)

Client component (`"use client"`), no props — mirrors `components/AuthForm/AuthForm.tsx`'s self-contained style (local state, own Firebase calls, own error/submitting handling). Barrel `index.ts` re-exports default, same as `AuthForm`.

**State:**
- `title`, `description`, `assignedTo` (selected uid, `""` = unselected) — controlled inputs, so entered values survive a failed submit.
- `users: User[]`, `usersLoading: boolean`, `usersError: string | null` — the fetched roster.
- `isSubmitting: boolean`, `errorMessage: string | null` — same role as in `AuthForm`.

**Derived (computed at render, not stored):**
- `currentUser = useUser()`
- `assignableUsers = users.filter(u => u.id !== currentUser?.uid)`
- `myCodename = users.find(u => u.id === currentUser?.uid)?.codename ?? currentUser?.displayName ?? ""` — prefer the freshly-fetched Firestore doc over `displayName`, which `_plans/firebase-auth-signup.md` notes can go stale; fall back only if the user's own doc isn't in the fetched list.
- `canSubmit = Boolean(title.trim() && description.trim() && assignedTo && currentUser && assignableUsers.length > 0 && !isSubmitting)`

**Data fetching:** one-shot `getDocs(collection(db, COLLECTIONS.USERS).withConverter(userConverter))` in a mount-only `useEffect` (`[]` deps — no realtime sync needed for a short-lived create form). Set `usersLoading` around the call, `usersError` on failure. Does not wait on `currentUser` resolving — filtering is a pure render-time derivation.

**Assignee `<select>` states:**
- Loading: `disabled`, single "Loading agents..." placeholder option.
- Loaded, `assignableUsers.length === 0`: `disabled`, `.hint` text "No other agents available yet." (also gates `canSubmit`).
- Loaded with results: placeholder `<option value="">Select an agent...</option>` (so nothing is silently pre-selected) + one `<option value={u.id}>{u.codename}</option>` per assignable user.

**Validation:** required-field checks (`title`, `description`, `assignedTo` non-empty) plus environmental guards (`currentUser` resolved, `assignableUsers.length > 0`, not already submitting), combined into `canSubmit`. Use HTML `required` on inputs for baseline a11y, but gate the actual submit button and handler on `canSubmit` since the "no assignable users" case can't be expressed via native `required` alone. A blocked submit sets `errorMessage` to a validation message (reuses the same `role="alert"` region as write failures — one message channel, matching the spec's wording for both cases).

**Submit handler:**
1. `preventDefault()`; if `!canSubmit`, set validation `errorMessage` and return.
2. Defense-in-depth self-assignment guard: if `assignedTo === currentUser.uid`, set error and return (UI already excludes self from options, but guard regressions).
3. Resolve `assignee = assignableUsers.find(u => u.id === assignedTo)`; if missing (stale state), set error and return.
4. Clear `errorMessage`, set `isSubmitting(true)`.
5. Build `CreateHeistInput`: `title.trim()`, `description.trim()`, `createdBy: currentUser.uid`, `createdByCodename: myCodename`, `assignedTo: assignee.id`, `assignedToCodeName: assignee.codename`, `createdAt: serverTimestamp()`, `deadline: new Date(Date.now() + 48 * 60 * 60 * 1000)`, `finalStatus: null`.
6. `await addDoc(collection(db, COLLECTIONS.HEISTS), input)` — **plain `addDoc`, without `.withConverter(heistConverter)`**: `heistConverter.toFirestore` types its param as `Partial<Heist>` (`createdAt: Date`), which fights `CreateHeistInput.createdAt: FieldValue`. The converter is for reads; writes here go through as a plain typed object.
7. On success: `router.push("/heists")`. Do **not** reset `isSubmitting` on the success path — leave the button disabled through the redirect (mirrors `AuthForm`'s signup branch, which only resets `isSubmitting` in `catch`, not `finally`).
8. On failure: `setErrorMessage("Couldn't create the heist. Please try again.")`, `setIsSubmitting(false)`. Form state (`title`/`description`/`assignedTo`) is untouched, so controlled inputs still show what the user entered.

**Duplicate-submit prevention:** `disabled={!canSubmit}` on the button (includes `!isSubmitting`) plus the handler re-checking `canSubmit` at its top — same two-layer approach `AuthForm` already uses.

**Markup** (parallels `AuthForm`'s field/label/input structure, `useId()` for label association):
```
<form onSubmit={handleSubmit} className={styles.form}>
  field: label + input (title)
  field: label + textarea (description)
  field: label + select (assignedTo) + loading/empty hint
  <button type="submit" disabled={!canSubmit}>{isSubmitting ? "Creating..." : "Create Heist"}</button>
  {errorMessage && <p role="alert" className={styles.error}>{errorMessage}</p>}
</form>
```

**CSS Module:** reuse `AuthForm.module.css`'s class vocabulary (`.form`, `.field`, `.label`, `.input`, `.submit`, `.error`) via `@apply` (`@reference "../../app/globals.css";` at top, per CLAUDE.md's no-bare-utility-classes rule), plus new `.textarea`, `.select`, and `.hint` classes, and a `:disabled` treatment on `.submit` (opacity/cursor — `AuthForm` doesn't need this but this form has more disable triggers).

## Step 4 — `app/(dashboard)/heists/create/page.tsx`

Keep the existing `.center-content > .page-content` wrapper and `<h2 className="form-title">` heading; render `<HeistForm />` below it. Page itself stays a server component (no `"use client"`); `HeistForm` carries its own directive.

## Step 5 — `tests/components/HeistForm.test.tsx`

Mocking pattern mirrors `tests/components/AuthForm.test.tsx`: `vi.mock("next/navigation")` (`useRouter` → push spy), `vi.mock("firebase/firestore")` (`collection`, `addDoc`, `getDocs`, `serverTimestamp`, `doc`), `vi.mock("@/lib/firebase")` (`{ auth: {}, db: {} }`), `vi.mock("@/lib/user-context")` (`useUser` → fixed fake `AppUser`, overridable per test). Fake `getDocs` result: `{ docs: [{ id, data: () => ({ codename }) }, ...] }`.

Test cases (spec's required four, plus high-value additions the Plan agent identified):
1. Renders title, description, assignee fields, and a submit control (role/label queries).
2. Missing required fields blocks submit — no `addDoc` call, alert message shown.
3. Valid submit calls `addDoc` with the expected `CreateHeistInput` shape (`createdBy`/`createdByCodename` match mocked user, `assignedTo`/`assignedToCodeName` match selection, `finalStatus: null`, `deadline` ~48h ahead, `createdAt` is the mocked `serverTimestamp()` sentinel) and redirects to `/heists`.
4. Failed `addDoc` shows an alert error and preserves entered field values.
5. Current signed-in user is excluded from the assignee `<select>` options (seed `getDocs` with self + one other user).
6. Only-user-in-system case: submit disabled, "no other agents" hint shown.
7. Submit button disabled while the write is pending (manually-resolved `addDoc` promise, assert mid-flight disabled state).

## Verification

1. `npm run lint` and `npx tsc --noEmit` (or `npm run build`) — confirm new types/component compile clean, including the `addDoc` (no converter) vs `CreateHeistInput` typing.
2. `npx vitest run tests/components/HeistForm.test.tsx` — all new tests pass; also run the full `npm test` to confirm nothing in `AuthForm.test.tsx` or elsewhere regressed (e.g. from the `COLLECTIONS`/barrel export change).
3. Manual check via `npm run dev`: sign in as one seeded user, confirm the assignee dropdown lists other users by codename (not self), submit a heist, confirm redirect to `/heists`, and spot-check the new document in the Firestore emulator/console for `createdAt`/`deadline`/`finalStatus` values.
