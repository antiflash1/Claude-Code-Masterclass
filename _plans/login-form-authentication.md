# Plan: Wire Real Firebase Login into `AuthForm`

Spec: `_specs/login-form-authentication.md`
Branch: `claude/feature/login-form-authentication` (already checked out)

## Context

The login form at `/login` renders `AuthForm mode="login"`, but `handleSubmit` currently just `console.log`s the email/password and returns — there is no real authentication. Signup (`mode="signup"`) already wires up Firebase (`createUserWithEmailAndPassword` → `updateProfile` → `setDoc` → `router.push("/heists")`), so login should follow the same shape but diverge in two ways the spec calls for: it authenticates with `signInWithEmailAndPassword` instead of creating an account, and it shows a success message **alongside** the form with **no redirect** (confirmed with user: success message shows alongside the form, not replacing it; no dismiss/retry-without-reload needed). Because there's no navigation away on success, the submit button must re-enable after a successful login too — unlike signup, which never re-enables because it navigates away.

The global `useUser()` hook (`lib/user-context.tsx`) already subscribes to `onAuthStateChanged` at the root layout, so a successful `signInWithEmailAndPassword` call automatically updates app-wide auth state — `AuthForm` doesn't need to touch that itself.

Firebase SDK is `firebase@12.15.0` (confirmed in `node_modules/firebase/node_modules/@firebase/auth`). In this version, `signInWithEmailAndPassword` returns the unified `auth/invalid-credential` code for both wrong password and unknown email (verified this code, plus `auth/invalid-email`, `auth/network-request-failed`, `auth/too-many-requests`, and legacy `auth/user-not-found`/`auth/wrong-password`, all exist in the installed bundle).

## Implementation

### 1. `components/AuthForm/AuthForm.tsx`

- Import `signInWithEmailAndPassword` from `firebase/auth` alongside the existing `createUserWithEmailAndPassword, updateProfile`.
- Rename `getSignupErrorMessage` → `getAuthErrorMessage(error: unknown): string` (drop the signup-specific name since it now serves both flows; no `mode` param needed — signup and login error codes never overlap, so one flat `switch` is enough). Add login-relevant cases, grouped by fallthrough where the message is identical:
  ```
  auth/email-already-in-use    -> "An account with this email already exists."   (existing, signup)
  auth/weak-password           -> "Password is too weak. Please choose a stronger password."  (existing, signup)
  auth/invalid-email           -> "Please enter a valid email address."          (existing, shared)
  auth/network-request-failed  -> "Network error. Please check your connection and try again."  (existing, shared)
  auth/invalid-credential
  auth/user-not-found
  auth/wrong-password           -> "Incorrect email or password. Please try again."  (new, login)
  auth/too-many-requests       -> "Too many attempts. Please wait a moment and try again."  (new, login)
  default                      -> "Something went wrong. Please try again."     (existing)
  ```
  Update the signup branch's `catch` to call `getAuthErrorMessage(error)` (same behavior, new name).
- Add new state: `const [successMessage, setSuccessMessage] = useState<string | null>(null)`.
- Replace the login branch's placeholder:
  ```ts
  if (mode === "login") {
    console.log({ mode, email, password })
    return
  }
  ```
  with a real `try/catch/finally` flow — using `finally` because, unlike signup, the button must re-enable on *both* outcomes since there's no navigation away:
  ```ts
  if (mode === "login") {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setSuccessMessage("Welcome back! You're logged in.")
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
    return
  }
  ```
  No `router.push` — that's the key divergence from signup, and the returned `UserCredential` doesn't need to be used since `useUser()` reacts globally.
- Leave the signup branch's control flow untouched (only the error-helper's name changes there) — no functional reason to restructure code that isn't in scope.
- JSX: add a success paragraph right after the existing error paragraph, inside the `<form>`, after the submit button (mirrors where the error message already lives — this satisfies "alongside the form"):
  ```tsx
  {errorMessage && (
    <p className={styles.error} role="alert">
      {errorMessage}
    </p>
  )}
  {successMessage && (
    <p className={styles.success} role="status">
      {successMessage}
    </p>
  )}
  ```
  Use `role="status"` (not `role="alert"`) for the success message — `alert` is an assertive live region meant for urgent/error announcements; `status` is the correct ARIA role for a polite, non-urgent confirmation like this. This doesn't conflict with any existing convention (the codebase has no prior `role="status"` usage to be inconsistent with) and is standard WAI-ARIA practice.

### 2. `components/AuthForm/AuthForm.module.css`

Add, directly after `.error`, following the exact same pattern with the success color token (`--color-success` is already defined in `app/globals.css`, same mechanism as `text-error`):
```css
.success {
  @apply mt-2 text-center text-sm text-success;
}
```

### 3. `tests/components/AuthForm.test.tsx`

- Add `signInWithEmailAndPassword: vi.fn()` to the existing `vi.mock("firebase/auth", ...)` factory, import it, and extract `const mockedSignIn = vi.mocked(signInWithEmailAndPassword)`; reset it in `beforeEach` alongside the other mocks (`mockedSignIn.mockReset()`).
- **Delete** the two obsolete login tests that assert the old `console.log` placeholder behavior and "no Firebase/router APIs called" — this behavior no longer exists and the second assertion becomes actively false.
- Add new tests for login mode, matching the file's existing style (`render`, `screen.getByLabelText`, `userEvent`, `waitFor`/`findByRole`):
  1. **Successful login** — `mockedSignIn.mockResolvedValueOnce(...)` (return value unused by the component, so a minimal stub is fine), fill + submit, assert `signInWithEmailAndPassword` called with `(auth, email, password)`, assert success message appears (`findByRole("status")`), assert no error (`queryByRole("alert")` is null), assert submit button is enabled again, and — the key behavioral check — assert `routerPushMock` was **not** called.
  2. **Failed login** — `mockedSignIn.mockRejectedValueOnce({ code: "auth/invalid-credential" })`, fill + submit, assert error message "Incorrect email or password. Please try again." appears (`findByRole("alert")`), assert no success message (`queryByRole("status")` is null), assert button re-enabled.
  3. **Pending state** — `mockedSignIn.mockReturnValueOnce(new Promise(() => {}))` (or a manually-resolvable deferred promise to also verify re-enable-after-resolve in the same test), fill + submit, assert submit button is disabled immediately after submitting.

### 4. No changes needed

- `app/(public)/login/page.tsx` — just renders `AuthForm`, unaffected.
- `lib/user-context.tsx` / `lib/firebase.ts` — already fully support this; `auth` export and the root `onAuthStateChanged` listener work as-is.
- No new dependencies — `signInWithEmailAndPassword` is already part of the installed `firebase/auth` package.

## Verification

- `npx vitest run tests/components/AuthForm.test.tsx` — all login and signup tests pass.
- `npm run lint` — no new lint errors (particularly no unused-var warnings from the renamed error helper).
- Manual check: `npm run dev`, visit `/login`, submit with a real/test Firebase account's correct credentials → success message appears alongside the form, button re-enables, no navigation; submit with wrong credentials → error message appears instead.
