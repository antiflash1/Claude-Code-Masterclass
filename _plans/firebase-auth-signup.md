# Implementation Plan: Firebase Auth Signup with Random Codename

Spec: `_specs/firebase-auth-signup.md` · Branch: `claude/feature/firebase-auth-signup` (current branch)

## Context

The signup form (`AuthForm` in `signup` mode, rendered from `app/(public)/signup/page.tsx`) currently only `console.log`s form data — there's no real auth or data layer yet. This plan wires it to real Firebase Authentication (Web SDK only, per spec), generates a random heist/spy-themed PascalCase "codename" (e.g. `SilentVaultFalcon`) as the user's `displayName`, and persists it to a `users/{uid}` Firestore document containing only `codename` — explicitly no email or other PII. On success the user is redirected to `/heists`; on failure an inline error is shown. `login` mode is untouched (out of scope per spec).

## Key decisions

- **Firestore export**: add `db` to `lib/firebase.ts` via `getFirestore(firebaseApp)`, following the exact lazy-init pattern already used for `auth`. No new lib file needed for this.
- **Codename generator lives in its own pure module**, `lib/codenames.ts` — no Firebase imports, no `"use client"`, testable in isolation. Matches the repo's only precedent for a `lib/` file that isn't Firebase-config-shaped: none exists yet, so this is the first, and it stays a single file with no barrel (consistent with `lib/firebase.ts`/`lib/user-context.tsx`, both barrel-less).
- **Word sets** (heist/spy themed, all pre-capitalized so concatenation needs no case transformation):
  - `ADJECTIVES`: Silent, Shadow, Crimson, Velvet, Rogue, Phantom, Golden, Covert, Midnight, Slick
  - `HEIST_NOUNS`: Vault, Heist, Caper, Score, Jackpot, Ledger, Getaway, Blueprint, Loot, Stakeout
  - `ANIMAL_ALIASES`: Falcon, Fox, Viper, Raven, Panther, Cobra, Wolf, Hawk, Jackal, Lynx
  - `generateCodename(): string` picks one random element from each (via an internal `pickRandom<T>(items: readonly T[]): T` using `Math.random()`) and concatenates with no separator. Factoring out `pickRandom` makes the function mockable in tests via `vi.spyOn(Math, "random")` without mocking the whole module.
- **Firestore doc ID = uid itself** (per spec's answered open question) — `doc(db, "users", user.uid)` with body `{ codename }` only. No separate `id` field.
- **Redirect**: `useRouter().push("/heists")` from `next/navigation`, called client-side inside `AuthForm`. This is the first redirect pattern in the repo — no existing precedent to match, so this establishes it.
- **Error handling**: single `try/catch` wraps the whole signup sequence (Auth → updateProfile → Firestore write). No rollback of the Auth user if a later step fails (accepted edge case per spec) — same generic-or-mapped inline error either way. A local (unexported) `getSignupErrorMessage(error: unknown): string` duck-types on a string `.code` property (covers both `firebase/auth` and Firestore thrown errors) and maps `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, `auth/network-request-failed` to friendly copy, else a generic fallback.
- **Error display**: inline (per spec's answered open question), `role="alert"` paragraph rendered after the submit button, styled via a new `.error` class in `AuthForm.module.css` using the **existing** `--color-error` token (`text-error`) from `app/globals.css` — do not introduce a new/raw color.
- **Pending state**: `isSubmitting` boolean disables the submit button during the async signup sequence; not reset to `false` on the success path (component navigates away via `router.push`, so staying disabled avoids a re-enable flash before navigation completes). Button label stays static (no "Signing Up…" text) — minimal-diff default since spec doesn't require it.
- **`useUser()` staleness is a known, accepted limitation**: `updateProfile()` does not retrigger `onAuthStateChanged`, so `useUser().displayName` will read `null` immediately post-signup until the next real auth-state event. Confirmed nothing currently reads `useUser().displayName` (Navbar/Avatar don't), so this is not a regression — not addressed by this plan.
- **Firestore rules**: `firestore.rules` currently has an open `allow read, write` rule (expires 2026-08-07), so the `users/{uid}` write will succeed without any rules change. Not touched by this plan.

## Files

**New:**
- `lib/codenames.ts` — `ADJECTIVES`, `HEIST_NOUNS`, `ANIMAL_ALIASES` (exported for test assertions), `generateCodename()`.
- `tests/lib/codenames.test.ts` — see Testing below.

**Modified:**
- `lib/firebase.ts` — add `getFirestore` import and `export const db = getFirestore(firebaseApp)`.
- `components/AuthForm/AuthForm.tsx`:
  - New imports: `useRouter` (`next/navigation`); `createUserWithEmailAndPassword`, `updateProfile` (`firebase/auth`); `doc`, `setDoc` (`firebase/firestore`); `auth`, `db` (`@/lib/firebase`); `generateCodename` (`@/lib/codenames`).
  - New state: `isSubmitting: boolean`, `errorMessage: string | null`. `const router = useRouter()` called unconditionally at top (Rules of Hooks; used only in the signup branch).
  - `handleSubmit` becomes `async`, branches on `mode`:
    - `login`: unchanged synchronous `console.log`, returns early.
    - `signup`: `setErrorMessage(null)`, `setIsSubmitting(true)`, then in one `try`:
      1. `const { user } = await createUserWithEmailAndPassword(auth, email, password)`
      2. `const codename = generateCodename()`
      3. `await updateProfile(user, { displayName: codename })`
      4. `await setDoc(doc(db, "users", user.uid), { codename })`
      5. `router.push("/heists")`
      - `catch (error)`: `setErrorMessage(getSignupErrorMessage(error))`, `setIsSubmitting(false)`.
  - New local helper `getSignupErrorMessage(error: unknown): string` (in-file, not its own module — it's UI copy).
  - JSX: `disabled={isSubmitting}` on submit button; `{errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}` after the submit button, inside `<form>`.
- `components/AuthForm/AuthForm.module.css` — add:
  ```
  .error {
    @apply mt-2 text-center text-sm text-error;
  }
  ```
- `tests/components/AuthForm.test.tsx` — rewrite the breaking test + add signup-flow coverage (see Testing below).

**Not touched:** `components/AuthForm/index.ts` (no prop/type changes), `app/(public)/signup/page.tsx`, `app/(public)/login/page.tsx` (stay thin wrappers).

## Testing

### `tests/lib/codenames.test.ts` (new)
1. Mock `Math.random` (`vi.spyOn`) with controlled values to assert exact output at each word list's first/last index boundaries.
2. Regex invariant (`/^[A-Z][a-zA-Z]*$/`, no separators) checked over several real-random invocations.
3. Optional variety sanity check: ~50 unmocked calls, assert more than one distinct result (guards against an always-index-0 bug).

### `tests/components/AuthForm.test.tsx` (modified)
- Add `vi.mock()` calls (matching the per-test mocking convention already used in `tests/lib/user-context.test.tsx`) for: `next/navigation` (`useRouter` → `{ push: vi.fn() }` via `beforeEach`), `firebase/auth` (`createUserWithEmailAndPassword`, `updateProfile`), `firebase/firestore` (`doc`, `setDoc`), `@/lib/firebase` (`{ auth: {}, db: {} }`), `@/lib/codenames` (`generateCodename: vi.fn(() => "SilentVaultFalcon")` — keeps signup-flow assertions deterministic; randomness is covered separately).
- **Rewrite** "logs mode, email, and password on submit without a real form submission" to render `mode="login"` (rename to reflect login-only scope) — this assertion is no longer true for signup.
- **Add**:
  1. Happy path: submit valid signup form → assert `createUserWithEmailAndPassword(auth, email, password)`, `updateProfile(user, { displayName: "SilentVaultFalcon" })`, `doc(db, "users", uid)` + `setDoc(ref, { codename: "SilentVaultFalcon" })`, `router.push("/heists")` all called; no alert rendered.
  2. Auth failure (`auth/email-already-in-use`): assert mapped error text via `getByRole("alert")`; `updateProfile`/`setDoc`/`router.push` never called.
  3. Firestore failure after Auth succeeds: `setDoc` rejects → assert alert renders, `router.push` never called (the "no rollback" edge case — don't assert anything about deleting the Auth user).
  4. Submit button disabled while pending: manually-controlled pending promise for `createUserWithEmailAndPassword`; assert `disabled` immediately after submit, then resolve and flush.
  5. Login mode unaffected: submitting in `mode="login"` calls none of the Firebase/router mocks.
- Async submit assertions use `await user.click(...)` + `findByRole`/`waitFor` (handler is now async).

## Sequencing

1. Add `db` export to `lib/firebase.ts`.
2. Write `lib/codenames.ts` + `tests/lib/codenames.test.ts`; iterate until green.
3. Update `tests/components/AuthForm.test.tsx` (rewrite breaking test, add mocks + new signup tests) — expect new tests to fail against the still-unwired component (TDD, matching this repo's established `/component` workflow).
4. Implement the `AuthForm.tsx` signup wiring + `.error` CSS class.
5. `npx vitest run tests/lib/codenames.test.ts tests/components/AuthForm.test.tsx` — iterate until green.
6. `npm run lint` and `npx tsc --noEmit` (or `npm run build`).
7. Manual verification: `npm run dev`, submit `/signup` with a fresh email/password → confirm redirect to `/heists`, new Firebase Auth user with a 3-word PascalCase `displayName`, and a `users/{uid}` Firestore doc with only `codename`. Retry the same email → confirm inline "already exists" error, no duplicate doc.

## Risks / things to double-check while implementing

- Error copy strings proposed in this plan are placeholders — fine to ship as-is, but worth a quick read-through for tone consistency with the rest of the app's copy.
- `useRouter()` called unconditionally even in `login` mode is intentional (Rules of Hooks) and harmless.
- If `npx tsc` flags the duck-typed `.code` narrowing on `unknown` in `getSignupErrorMessage`, adjust the type guard shape — it's a standard `"code" in error && typeof ... === "string"` narrowing, should be strict-mode clean, but confirm once written.
