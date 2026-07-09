# Implementation Plan: `useUser` auth-state hook

Spec: `_specs/auth-state-user-hook.md` · Branch: `claude/feature/auth-state-user-hook` (current branch)

## Context

Pocket Heist's Firebase backend (Firestore + Email/Password auth) was just added, but nothing in the app can read the current signed-in user yet — `lib/firebase.ts` only exports the initialized `firebaseApp`, there's no `getAuth()`/`auth` export, and the codebase has no React Context or custom-hook directory at all (confirmed via search: no `createContext`/`useContext` usage anywhere). `app/layout.tsx` is a Server Component with no providers. This spec introduces a single shared `useUser` hook, backed by one app-wide `onAuthStateChanged` listener via React Context (per the spec's answered Open Questions), so future work (Navbar, dashboard layout, splash-page redirect — explicitly deferred) has a ready-made way to read auth state. This plan covers only the state/listener plumbing: no sign-up/login/logout logic, and no wiring of consumers.

## Key decisions

- **Location**: `lib/user-context.tsx` — a single new file next to `lib/firebase.ts`. No new `context/`/`hooks/` top-level directory (repo has no precedent for one, and "minimal dependencies/structure" is a stated convention). Exports `UserProvider`, `useUser`, and the `AppUser` type.
- **Firebase auth instance**: add `export const auth = getAuth(firebaseApp)` to `lib/firebase.ts` (confirmed via Context7 firebase-js-sdk docs — `getAuth(app)` + `onAuthStateChanged(auth, callback)` returning an `Unsubscribe` function is the current modular API, matching the already-installed `firebase@^12.15.0`).
- **Provider placement**: keep `app/layout.tsx` a Server Component (so it keeps its `metadata` export) and wrap `{children}` with `<UserProvider>`. Confirmed via Context7 Next.js docs — "Context providers" pattern: a Client Component provider that accepts `children` is imported into a Server Component layout; Server Component children passed through it are still rendered server-side and slotted in, they don't get forced client-side. This makes `UserProvider` the **first Client Component provider** in the tree (the only precedent for `"use client"` at all so far is `AuthForm`).
- **Distinguishing "loading" vs "no provider"**: per the spec, the hook's user value is `undefined` (loading) / `null` (signed out) / `AppUser` (signed in). Since `undefined` is a valid *in-provider* value, `createContext` can't default to `undefined` too, or "no provider" and "loading" would be indistinguishable. Fix: the context stores a wrapper object `{ user: AppUser | null | undefined }`, and `createContext<UserContextValue | undefined>(undefined)`. `useUser` throws if `useContext` returns `undefined` (= no ancestor `<UserProvider>` at all — the tree-structure failure mode from the spec's edge cases), and otherwise returns `context.user` (which itself may legitimately be `undefined` while the first `onAuthStateChanged` callback hasn't fired yet). Because the root layout wraps the entire app, every real page is always inside the provider — the throw path only fires for a component tested/rendered in isolation without the provider, which is exactly what one of the spec's test cases exercises.
- **`AppUser` shape**: reconstructed as a plain object (`{ uid, email, displayName }`), not the raw Firebase `User` instance — avoids leaking Firebase internals/methods into app state and matches the spec's "lightly normalized subset" answer (which named these three fields explicitly).
- **Single listener guarantee**: `onAuthStateChanged` is called exactly once, inside `UserProvider`'s `useEffect` (empty dep array), not inside `useUser` itself. Every `useUser()` call just reads from Context — no new subscriptions — satisfying "only one listener regardless of how many components use `useUser` concurrently."

## `lib/user-context.tsx` (new file)

```tsx
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export type AppUser = {
  uid: string
  email: string | null
  displayName: string | null
}

type UserContextValue = {
  user: AppUser | null | undefined
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null | undefined>(undefined)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(
        firebaseUser
          ? {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            }
          : null,
      )
    })

    return unsubscribe
  }, [])

  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }

  return context.user
}
```

## Files

**New:**
- `lib/user-context.tsx` — `UserProvider`, `useUser`, `AppUser` type (as above).
- `tests/lib/user-context.test.tsx` — see Testing section below.

**Modified:**
- `lib/firebase.ts` — add `getAuth` import and `export const auth = getAuth(firebaseApp)`.
- `app/layout.tsx` — import `UserProvider` from `@/lib/user-context` and wrap `{children}`:
  ```tsx
  <body>
    <UserProvider>{children}</UserProvider>
  </body>
  ```
  Stays a Server Component; `metadata` export is untouched.

**Not touched (explicitly deferred per spec's answered Open Questions):** `components/Navbar`, `app/(dashboard)/layout.tsx`, `app/(public)/page.tsx` — noted here only as future consumers once a follow-up spec wires up display/redirect logic.

## Testing (`tests/lib/user-context.test.tsx`)

No Firebase mocking precedent exists yet in the repo, so this introduces one: `vi.mock("firebase/auth")` to fully control `onAuthStateChanged` (capture the callback, invoke it manually to simulate auth-state transitions) rather than hitting real Firebase/network from jsdom. A tiny test-only consumer component (`function Probe() { const user = useUser(); return <div data-testid="user">{JSON.stringify(user)}</div> }`) renders the hook's value so assertions can use `screen`/`getByTestId`, matching the existing role/testing-library-first style (`Navbar.test.tsx`, `AuthForm.test.tsx`).

Cases (mapped 1:1 to the spec's Testing Guidelines):
1. `useUser` returns `undefined` (loading) before the mocked `onAuthStateChanged` callback fires.
2. Invoking the mocked callback with `null` → hook returns `null` (signed out).
3. Invoking the mocked callback with a fake Firebase user object → hook returns the normalized `{ uid, email, displayName }`.
4. Invoking the callback signed-in → signed-out → signed-in in sequence updates the rendered value each time, without remounting `Probe`.
5. Rendering two `Probe` instances under one `UserProvider` and firing one callback update → both show the same value, and `onAuthStateChanged` was called exactly once (assert on the mock's call count).
6. Rendering `Probe` **without** a `UserProvider` ancestor throws the "must be used within a UserProvider" error (wrap in a function and assert via `expect(() => render(<Probe />)).toThrow(...)`, per React Testing Library's error-boundary-free synchronous throw pattern).

## Sequencing

1. Add `auth` export to `lib/firebase.ts`.
2. Write `tests/lib/user-context.test.tsx` first (TDD, matching this repo's established `/component` workflow) — expect it to fail (no `lib/user-context.tsx` yet).
3. Create `lib/user-context.tsx`.
4. `npx vitest run tests/lib/user-context.test.tsx` — iterate until green.
5. Wrap `app/layout.tsx`'s `{children}` in `<UserProvider>`.
6. Run full suite (`npm test`) and `npm run lint`.
7. Manually sanity-check in the dev server: app still renders with no console errors/warnings about missing provider, and no regression to existing pages (splash, login, signup, heists stubs).

## Risks / things to double-check while implementing

- `UserProvider` becomes the second `"use client"` boundary in the repo (after `AuthForm`) and the first one wrapping the entire app tree at the root layout — confirm no other Server-Component-only assumption breaks (e.g. `metadata` export must stay in `app/layout.tsx`, which is untouched, so this should be a non-issue per the Context7-confirmed pattern).
- `getAuth(firebaseApp)` at module scope in `lib/firebase.ts` runs on import; make sure test mocking (`vi.mock("firebase/auth")`) covers `getAuth` too so tests never touch real Firebase config/network from jsdom.
- Throwing inside `useUser` when there's no provider means any *future* test file that renders a consumer without wrapping it will fail loudly (by design) — worth a one-line note in the hook file itself so it's not mysterious later, but no code beyond the existing `throw` is needed.
