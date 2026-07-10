# Navbar Logout Button

## Context

`_specs/navbar-logout-button.md` specs out a logout control for the `Navbar` component. Auth already exists (Firebase Auth + `useUser` hook + `UserProvider` wrapping the whole app in `app/layout.tsx`), but there's currently no way for a signed-in user to sign out — the Navbar is a static server component with just branding and the "Create Heist" link. This adds that missing control: visible only when authenticated, calls Firebase `signOut`, shows a disabled/loading state while in flight, and surfaces failures via a toast (a UI primitive that doesn't exist yet in this codebase and needs to be built, minimally, from scratch). No redirect is in scope — the Navbar re-renders itself via the existing `onAuthStateChanged` listener already wired into `UserProvider`.

## Approach

### 1. New `components/Toast/` (minimal, presentational only)

No toast library exists and none should be added (project convention: minimal dependencies). Build the smallest thing that satisfies "surfaced via toast" — no provider, no queue, no imperative API, no auto-dismiss. Navbar owns visibility by conditionally rendering it.

- **`components/Toast/Toast.tsx`**: single component, one prop `message: string`, renders `<div role="alert">{message}</div>` styled via its CSS module. `role="alert"` matches the existing inline-error convention in `AuthForm.tsx` (`role="alert"` on the error `<p>`), keeping `getByRole("alert")`-style test queries consistent across the codebase.
- **`components/Toast/Toast.module.css`**: `@reference "../../app/globals.css";` then one `@apply` rule, e.g. `fixed bottom-4 right-4 rounded-lg bg-error px-4 py-3 text-sm text-white shadow-lg`. `--color-error` (`#FF6467`) is already defined in `app/globals.css`'s `@theme` block, so `bg-error`/`text-white` resolve via Tailwind 4's auto-generated utilities — no new tokens needed.
- **`components/Toast/index.ts`**: `export { default } from "./Toast"` (matches the barrel convention used by every other component folder).

### 2. `components/Navbar/Navbar.tsx` — becomes a client component

Add `"use client"` at the top (required for `useState` + `onClick`). New imports: `useState` from `react`; `LogOut` added to the existing `lucide-react` import; `signOut` from `firebase/auth`; `auth` from `@/lib/firebase`; `useUser` from `@/lib/user-context`; `Toast` from `@/components/Toast`.

```tsx
const user = useUser()
const [isSigningOut, setIsSigningOut] = useState(false)
const [errorMessage, setErrorMessage] = useState<string | null>(null)

async function handleLogout() {
  if (isSigningOut) return // guards rapid repeated clicks

  setErrorMessage(null)
  setIsSigningOut(true)
  try {
    await signOut(auth)
  } catch (error) {
    setErrorMessage(getSignOutErrorMessage(error))
  } finally {
    setIsSigningOut(false)
  }
}
```

Note: unlike `AuthForm` (which only resets `isSubmitting` in `catch`, because success there navigates away and unmounts the form), Navbar stays mounted after a successful logout — only the `<li>` disappears once `user` flips to `null` via the auth listener. So `isSigningOut` must reset in a `finally`, not just on error.

JSX — new `<li>` inserted immediately before the existing "Create Heist" `<li>` (per the spec's Figma notes: logout sits to the left of Create Heist), gated on `user` truthiness. This single check (`{user && (...)}`) covers both "don't render while loading" (`useUser()` is `undefined` while loading) and "don't render when logged out" (`null`), since both are falsy:

```tsx
<ul>
  {user && (
    <li>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isSigningOut}
        aria-busy={isSigningOut}
        className="btn"
      >
        <LogOut size={20} strokeWidth={1.67} />
        Log Out
      </button>
    </li>
  )}
  <li>
    <Link href="/heists/create" className="btn">
      <Plus size={20} strokeWidth={1.67} />
      Create Heist
    </Link>
  </li>
</ul>
{errorMessage && <Toast message={errorMessage} />}
```

Reuses `.btn` verbatim (already defined in `app/globals.css`, same class the Create Heist link uses) — the spec's Figma note says exact colors/typography couldn't be retrieved and to fall back to `.btn`. `LogOut` icon from `lucide-react` (already a dependency) mirrors the existing `Plus`/`Clock8` icon usage and the Figma's icon-then-label layout note.

Add a small local `getSignOutErrorMessage` helper above the component, same shape as `AuthForm.tsx`'s `getSignupErrorMessage` but with a much shorter switch (sign-out's realistic failure surface is basically just network errors):

```tsx
function getSignOutErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "auth/network-request-failed"
  ) {
    return "Network error. Please check your connection and try again."
  }
  return "Something went wrong signing out. Please try again."
}
```

Keep it local/unexported, not moved to a shared `lib/` util — mirrors `AuthForm.tsx`'s decision to keep its own error mapper local rather than shared. No unrelated refactor to extract a common Firebase-error-mapping helper.

`components/Navbar/index.ts` and `Navbar.module.css` need no changes — the CSS module has no `ul`/`li` rules to touch, and no new classes are needed since the button reuses `.btn`.

### 3. `tests/components/Navbar.test.tsx`

Follow `AuthForm.test.tsx`'s existing mocking convention, adapted for `useUser` + `signOut`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { signOut } from "firebase/auth"

import Navbar from "@/components/Navbar"
import { auth } from "@/lib/firebase"
import { useUser } from "@/lib/user-context"

vi.mock("firebase/auth", () => ({ signOut: vi.fn() }))
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }))
vi.mock("@/lib/user-context", () => ({ useUser: vi.fn() }))

const mockedSignOut = vi.mocked(signOut)
const mockedUseUser = vi.mocked(useUser)
const fakeUser = { uid: "abc123", email: "a@b.com", displayName: "SilentVaultFalcon" }

describe("Navbar", () => {
  beforeEach(() => {
    mockedSignOut.mockReset().mockResolvedValue(undefined)
    mockedUseUser.mockReset().mockReturnValue(fakeUser)
  })

  // existing 2 tests unchanged in assertions — they just need the useUser mock
  // in place so render(<Navbar />) doesn't throw "must be used within a UserProvider"
  it("renders the main heading", () => { ... })
  it("renders the Create Heist link", () => { ... })

  it("renders a logout button when the user is authenticated", () => {
    render(<Navbar />)
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument()
  })

  it("does not render a logout button when the user is not authenticated", () => {
    mockedUseUser.mockReturnValue(null)
    render(<Navbar />)
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument()
  })

  it("calls Firebase signOut when the logout button is clicked", async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByRole("button", { name: /log out/i }))
    expect(mockedSignOut).toHaveBeenCalledWith(auth)
  })
})
```

This covers exactly the 3 cases the spec's Testing Guidelines call for, plus fixes the 2 pre-existing tests (which will otherwise break once `Navbar` calls `useUser()`). Per "without going too heavy," skip extra cases (loading-state auth flash, toast-on-error, rapid-click guard) — they're either structurally covered by the same `{user && ...}` check or would meaningfully bloat the file beyond the spec's requested scope.

## Verification

1. `npx vitest run tests/components/Navbar.test.tsx` — all 5 tests pass.
2. `npm run lint` — no new errors.
3. `npm run dev`, log in via `/signup` or `/login`, visit `/heists`: confirm the logout button appears before "Create Heist", click it, confirm the button disappears (Navbar re-renders as logged-out) with no page reload/redirect. Then check `/login` or `/signup` (public route group) to confirm Navbar isn't rendered there at all (structural — `(public)/layout.tsx` never mounts it).
4. To exercise the error/toast path manually: temporarily disable network in devtools before clicking logout, confirm the toast appears with the network-error message and the button re-enables.

## Critical Files

- `components/Navbar/Navbar.tsx` — main changes
- `components/Toast/Toast.tsx`, `components/Toast/Toast.module.css`, `components/Toast/index.ts` — new
- `tests/components/Navbar.test.tsx` — updated + new tests
- Reference only, no changes: `lib/user-context.tsx`, `lib/firebase.ts`, `components/AuthForm/AuthForm.tsx` (pattern source), `app/globals.css` (`.btn`, `--color-error` already defined)
