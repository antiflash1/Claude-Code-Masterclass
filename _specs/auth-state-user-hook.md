# Spec for auth-state-user-hook

branch: claude/feature/auth-state-user-hook
figma_component (if used): none

## Summary
Introduce a shared, app-wide auth state solution built on Firebase Authentication so that any page or component can read the current signed-in user without prop drilling. The core deliverable is a `useUser` hook that exposes the current Firebase user (or `null` when signed out) and stays in sync in real time as the auth state changes. This spec covers only the state/listener plumbing — it does not cover sign-up, login, or logout flows, which will be specced separately.

## Functional Requirements
- Provide a `useUser` hook that can be called from any client component or page in the app (both `(public)` and `(dashboard)` route groups).
- The hook returns the current Firebase user object when signed in, and `null` when signed out.
- The underlying auth state must be driven by a single, shared real-time listener (Firebase's `onAuthStateChanged` or equivalent) rather than each call to `useUser` creating its own subscription — avoid duplicate listeners when the hook is used in multiple components at once.
- The listener must be set up once at the app root (e.g. via a context provider in `app/layout.tsx` or a shared client boundary) so state updates propagate to every consumer of `useUser` automatically.
- The hook must reflect auth state changes in real time — i.e. if the user signs in or out in another part of the app (or another tab), all components using `useUser` re-render with the updated value without a page reload.
- The hook should expose a way for consumers to distinguish "auth state is still being determined" (initial load) from "confirmed signed out" (`null`), so components don't flash a logged-out UI before Firebase reports the real state.
- Existing places in the codebase that reference or will need the current user (e.g. `Navbar`, the `(dashboard)` layout, the splash page redirect logic described in `app/(public)/page.tsx`) should be identified as future consumers of this hook, even though wiring them up for redirect/display logic is out of scope here beyond noting the integration points.
- No sign-up, login, sign-out, or credential-handling logic is part of this spec — assume Firebase Authentication is already configured (see `firebase.json`, `lib/firebase.ts`) and some other flow will call Firebase's sign-in/sign-out methods.

## Figma Design Reference (only if referenced)
- Not applicable — this is a state-management feature with no UI.

## Possible Edge Cases
- `useUser` called from a component that renders before the app-level provider has mounted (should not throw; should return the "loading" state instead).
- Multiple components calling `useUser` simultaneously should all update together and not trigger redundant Firebase listener registrations.
- Auth state changing rapidly (e.g. login immediately followed by logout) should not leave the hook in a stale or inconsistent state.
- Firebase not yet initialized or misconfigured (e.g. missing env vars) — the hook should fail in an observable way rather than silently returning `null` forever.
- Server-rendered pages/components (App Router server components) cannot use this hook directly since it depends on a browser-side listener — this constraint should be documented so future consumers know `useUser` is client-only.
- Hook used outside of any provider (if a provider-based approach is chosen) should have a clear failure mode (e.g. thrown error) rather than silently returning incorrect data.

## Acceptance Criteria
- A `useUser` hook exists and can be imported and called from any client component or page in the app.
- Calling `useUser` returns `null` when no user is signed in, and the Firebase user object when one is signed in.
- The hook's return value updates automatically and in real time when the underlying Firebase auth state changes, without requiring a manual refresh or re-fetch.
- Only one underlying Firebase auth listener is active at a time, regardless of how many components use `useUser` concurrently.
- The hook clearly communicates an initial "loading" state distinct from "signed out," so consumers can avoid incorrect flashes of logged-out UI.
- No sign-up, login, or logout UI or logic is added as part of this change.

## Open Questions
- Should `useUser` be backed by React Context (a `UserProvider` wrapping the app in `app/layout.tsx`) or a standalone module-level subscription shared across hook instances? Both satisfy "one listener," but they differ in setup shape. (Response: Let it be backed by React Context)
- What shape should the "loading" state take — a separate boolean/enum field alongside the user, or a distinct sentinel value (e.g. `undefined` for loading vs `null` for signed out)? (Response: `undefined` for loading.)
- Should the hook return the raw Firebase `User` object as-is, or a lightly normalized/typed subset of its fields? (Response: Subset that includes at least email, uid and displayName for example)
- Should this feature also touch `Navbar` and the `(dashboard)` layout now to consume `useUser` for display purposes, or should that be deferred entirely to a follow-up spec alongside login/logout? (Response: let it be deferred in a follow-up spec)

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- `useUser` returns `null` when Firebase reports no signed-in user.
- `useUser` returns the user object when Firebase reports a signed-in user.
- `useUser` reflects a transition from signed-out to signed-in (and back) when the underlying auth state changes, without remounting.
- `useUser` exposes a distinguishable loading state before the first auth state callback fires.
- Multiple simultaneous consumers of `useUser` receive consistent, synchronized values (only one listener is registered).
