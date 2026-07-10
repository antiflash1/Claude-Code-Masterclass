# Spec for route-protection

branch: claude/feature/route-protection
figma_component (if used): N/A

## Summary
Right now every route in the app is reachable regardless of auth state — an authenticated user can still see `/login`, and an unauthenticated user can still see `/heists`. This feature adds route protection at the route-group level: the `(public)` layout only allows unauthenticated visitors, and the `(dashboard)` layout only allows authenticated visitors. Auth state comes from the existing `useUser` hook (`lib/user-context.tsx`), which reflects Firebase's `onAuthStateChanged` listener. While that listener is still resolving (`useUser()` returns `undefined`), each group layout shows a simple loading state instead of its normal content, so pages never flash before a redirect happens.

## Functional Requirements
- In the `(public)` group layout (`app/(public)/layout.tsx`):
  - While `useUser()` is `undefined` (auth status not yet known), render a simple loader instead of `children`.
  - Once `useUser()` resolves to an authenticated user (non-null), redirect to `/heists` and do not render the public page content.
  - Once `useUser()` resolves to `null` (unauthenticated), render `children` as normal.
- In the `(dashboard)` group layout (`app/(dashboard)/layout.tsx`):
  - While `useUser()` is `undefined`, render a simple loader instead of `children`/`Navbar`.
  - Once `useUser()` resolves to `null` (unauthenticated), redirect to `/login` and do not render dashboard content.
  - Once `useUser()` resolves to an authenticated user (non-null), render `children` (and `Navbar`) as normal.
- Both loaders should be minimal/simple (e.g. a centered "Loading..." message or basic spinner) — no new dependencies, consistent with existing styling conventions (custom utility class via `@apply` in `app/globals.css` if shared, or scoped CSS Module per component conventions).
- Redirects are client-side, driven by the `useUser` hook reacting to Firebase's live auth state (no manual polling or extra data fetching).
- This applies to every page inside each group, including `/preview` (part of `(public)`), without requiring changes to individual page files.

## Figma Design Reference (only if referenced)
N/A

## Possible Edge Cases
- Firebase auth state flips while a user is mid-session in another tab (e.g. logs out elsewhere) — the listener should still fire and trigger the appropriate redirect.
- User lands directly on a protected/unprotected URL via a bookmark or typed address (not just in-app navigation) — the same loader-then-redirect flow must apply on a fresh page load.
- Rapid auth state changes (e.g. login immediately followed by logout) shouldn't cause redirect loops or flicker between loader and content.
- A user already on `/login` submits the login form successfully — the resulting auth state change should redirect them out of `(public)` without requiring a manual navigation in the form's own submit handler (avoiding double redirect logic).
- Deep-linking into a dashboard page (e.g. `/heists/create`) while logged out should redirect to `/login`, not just the `/heists` index.

## Acceptance Criteria
- An authenticated user visiting any `(public)` route (`/`, `/login`, `/signup`, `/preview`) is redirected to `/heists`.
- An unauthenticated user visiting any `(dashboard)` route (`/heists`, `/heists/create`, `/heists/[id]`) is redirected to `/login`.
- While auth status is unresolved, both group layouts show a loader instead of their normal content, and no redirect fires prematurely.
- Unauthenticated users can freely view `(public)` pages; authenticated users can freely view `(dashboard)` pages.
- No console errors or redirect loops occur during normal login/logout flows.

## Open Questions
- Should the root `/` splash page (currently documented as redirecting to `/heists` or `/login` based on auth) keep any of its own redirect logic, or should that responsibility move entirely into the `(public)` layout described here?. Answer: Move it into the `(public)` layout.
- Is `/heists` the correct universal post-login redirect target for every `(public)` page, or should some pages (e.g. a future invite-link page) redirect elsewhere? Answer: Yes, use `/heists` as universal target.
- Should the loader be identical (shared component) between the two layouts, or intentionally distinct per group? Answer: Yes, identical.

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- `(public)` layout renders a loader when `useUser()` is `undefined`.
- `(public)` layout renders children when `useUser()` is `null`.
- `(public)` layout redirects to `/heists` when `useUser()` resolves to an authenticated user.
- `(dashboard)` layout renders a loader when `useUser()` is `undefined`.
- `(dashboard)` layout renders children when `useUser()` resolves to an authenticated user.
- `(dashboard)` layout redirects to `/login` when `useUser()` resolves to `null`.
