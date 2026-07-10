# Route Protection

## Context

Every route in Pocket Heist is currently reachable regardless of auth state — an authenticated user can still land on `/login`, and an unauthenticated user can still see `/heists`. The app already has the pieces needed to fix this: `lib/user-context.tsx` exposes `useUser()`, backed by a live Firebase `onAuthStateChanged` listener, returning `undefined` (loading), `null` (signed out), or an `AppUser` (signed in). This feature wires that hook into the two route-group layouts (`app/(public)/layout.tsx`, `app/(dashboard)/layout.tsx`) so each group enforces the correct audience, shows a simple shared loader while auth status is still resolving, and redirects otherwise — without touching individual page files. See `_specs/route-protection.md` for full requirements/acceptance criteria/edge cases.

Confirmed decisions (from spec's Open Questions): the stale redirect-intent comment on the splash page moves entirely into the `(public)` layout; `/heists` is the universal post-login redirect target; the loader is one shared component reused by both layouts.

## Approach

Rather than duplicating the same `useEffect`/`router.push` logic in both layouts, factor the redirect mechanics into a tiny shared hook, and factor the loading UI into a shared component — following existing project conventions (`lib/` for cross-cutting hooks/logic, `components/<Name>/` folder convention with its own CSS Module for one-off UI like `Skeleton`).

### 1. `lib/useAuthRedirect.ts` (new)
A minimal client hook:
```
useAuthRedirect(shouldRedirect: boolean, to: string)
```
Internally calls `useRouter()` (`next/navigation`) and runs `router.push(to)` inside a `useEffect` gated on `shouldRedirect`, so it fires once per transition (no redirect loops). Each layout computes `shouldRedirect` itself from `useUser()`, keeping the auth-state branching visible in the layout rather than hidden behind a predicate callback.

### 2. `components/Loader/` (new)
Follows the exact `Skeleton` precedent: `Loader.tsx` (single wrapping `div`, `role="status"`, one CSS Module class, "Loading..." text), `Loader.module.css` (centering + pulse/spinner via plain CSS — do not reuse `.center-content` from `globals.css`, since that's a page-level utility, not something to reference from a CSS Module), `index.ts` barrel (`export { default } from "./Loader"`).

### 3. `app/(public)/layout.tsx` (modify)
Add `"use client"`. Use `useUser()` + `useAuthRedirect(!!user, "/heists")`:
- `user === undefined` → render `<Loader />`
- `user` truthy → render `null` (redirect in flight — never flash public content)
- `user === null` → render `<main className="public">{children}</main>` as before

### 4. `app/(dashboard)/layout.tsx` (modify)
Add `"use client"`. Mirror pattern with `useUser()` + `useAuthRedirect(user === null, "/login")`:
- `user === undefined` → render `<Loader />`
- `user === null` → render `null` (redirect in flight)
- `user` truthy → render `<Navbar />` + `<main>{children}</main>` as before

### 5. `app/(public)/page.tsx` (modify)
Delete the stale 3-line comment documenting per-page redirect intent (lines 1-3) — that responsibility now lives in the layout. No other changes; stays a static server component.

### 6. `CLAUDE.md` (modify)
Update the "Auth-based routing is intended but not implemented" line in the Architecture section to reflect that it's now implemented at the layout level, since CLAUDE.md currently documents this gap explicitly.

### 7. `app/(public)/preview/page.tsx` (modify, optional polish)
Add a `Loader` demo section alongside existing `Avatar`/`Skeleton`/`AuthForm` sections, consistent with how other new components get registered here (per the `/component` skill's own convention).

## Why this shape

- **Hook, not duplicated effects**: both layouts need identical "redirect once, on this boolean" mechanics; a 5-line hook avoids copy-pasting a `useEffect` twice while leaving the actual auth-state → boolean mapping (which differs slightly between groups) inline and readable in each layout.
- **Component, not a `globals.css` class**: the loader is consumed as `<Loader />` in exactly one shared spot (two call sites, same component) — CLAUDE.md reserves `globals.css` `@apply` utilities for classes applied directly in multiple component templates, not for a component's internal styling, which belongs in its own CSS Module (matches `Skeleton.module.css`).
- **Render `null` instead of `children` while a redirect is pending**: satisfies the spec's "do not render the public/dashboard content" requirement and avoids a content flash between the auth-state flip and `router.push` completing navigation.
- **No changes needed to `AuthForm.tsx`**: it already omits `router.push` on the login path (only signup pushes) — the new `(public)` layout's own redirect-on-authenticated logic is what moves the user off `/login` after `signInWithEmailAndPassword` succeeds and `useUser()` flips truthy. This avoids two places pushing to the same route.

## Tests

Two new test files, mirroring the `app/` route-group structure and reusing existing mocking patterns exactly (no new patterns introduced):

- `tests/app/(public)/layout.test.tsx`
- `tests/app/(dashboard)/layout.test.tsx`

Both mock `@/lib/user-context` (`vi.mock("@/lib/user-context", () => ({ useUser: vi.fn() }))`, per `tests/components/Navbar.test.tsx`) and `next/navigation` (`vi.hoisted` + `useRouter` returning a `push` mock, per `tests/components/AuthForm.test.tsx`). The dashboard test also mocks `@/components/Navbar` to a stub so the layout test doesn't double-consume the `useUser` mock through Navbar's own rendering.

| Layout | `useUser()` | Assertion |
|---|---|---|
| `(public)` | `undefined` | `Loader` renders, no `push` call |
| `(public)` | `null` | children render, no `push` call |
| `(public)` | `AppUser` | `push("/heists")` called, children absent |
| `(dashboard)` | `undefined` | `Loader` renders, no `Navbar`/children, no `push` call |
| `(dashboard)` | `AppUser` | children + `Navbar` render, no `push` call |
| `(dashboard)` | `null` | `push("/login")` called, no children/`Navbar` |

## Suggested order (TDD, per repo convention)

1. `lib/useAuthRedirect.ts`
2. `components/Loader/` (component + module CSS + barrel)
3. Write `tests/app/(public)/layout.test.tsx` against the unmodified layout (should fail) → update `app/(public)/layout.tsx` → tests pass
4. Repeat for `(dashboard)`
5. Clean up `app/(public)/page.tsx` comment
6. Update `CLAUDE.md`, add `Loader` demo to `preview/page.tsx`

## Verification

- `npm test` — full Vitest suite, including the two new layout test files and the existing `Navbar.test.tsx`/`user-context.test.tsx` (unaffected, since Navbar is tested standalone and user-context tests don't touch layouts).
- `npm run lint` — ESLint (core-web-vitals + typescript).
- `npm run dev` — manually verify in browser: visit `/` and `/login` while logged out (should render normally); log in and confirm redirect to `/heists`; visit `/heists` or `/heists/create` directly while logged out (should redirect to `/login`); log out from the dashboard and confirm redirect back to `/login`; confirm a brief loader appears (not a content flash) on hard refresh of any route while Firebase resolves auth state.
