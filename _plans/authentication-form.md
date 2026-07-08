# Implementation Plan: AuthForm shared component (`/login`, `/signup`)

Spec: `_specs/authentication-form.md` · Branch: `claude/feature/authentication-form` (current branch)

## Context

`/login` and `/signup` are currently heading-only stubs (`app/(public)/login/page.tsx`, `app/(public)/signup/page.tsx`) with no actual form, and a pre-existing bug: both stub components are named `SignupPage`, and headings are inconsistent (`<h1>` on login, `<h2>` on signup) despite both using the shared `.form-title` class. The spec asks for a real, working (client-side only, console.log-driven) authentication form shared between both routes as a single reusable component, following this repo's folder-based component convention (`components/`, CSS Modules, barrel `index.ts`). This will be the **first client component** (`"use client"`) in the codebase, since it needs interactive state (password show/hide) and a submit handler.

## Key decisions

- **Prop API**: `AuthForm({ mode: "login" | "signup" })` — no callbacks. Submit purely does `console.log`, per spec (no backend, no persistence).
- **AuthForm owns heading + switch link**, not the pages. A module-level `COPY` lookup (keyed by mode) supplies heading text, submit label, switch-link href/text. This satisfies the spec's "single shared component, no duplicated form markup" requirement and, as a side effect, fixes the h1/h2 inconsistency (both pages get the same `<h1 className="form-title">` from AuthForm). Pages become thin wrappers: `<div className="center-content"><div className="page-content"><AuthForm mode="login" /></div></div>`.
- **Submit button**: new `.submit` class in `AuthForm.module.css` (not the global `.btn`, which is styled as an inline link/action utility, not a full-width form submit button). Visually reuses the same `bg-primary` / `bg-secondary` hover tokens for consistency.
- **Icons**: `lucide-react`'s `Eye`/`EyeOff` (already a project dependency — confirmed present in `node_modules/lucide-react/dist/esm/icons/eye.js` and `eye-off.js`). No new dependency.
- **Validation**: native HTML only (`required`, `type="email"`) — matches spec's assumed answer to its own Open Question.
- **Navigation between `/login`/`/signup`**: real route links via `next/link`, not an in-page toggle — matches spec's assumed answer.
- **Preview page**: add an "AuthForm" section per the `/component` skill's convention (step 5), showing both `mode="login"` and `mode="signup"` instances. This causes two extra `<h1>`s on the dev-only `/preview` route (on top of its own `<h2>Preview</h2>`) — acceptable since it's a non-navigable dev utility page, not user-facing IA.

## Show/hide password toggle (accessibility-critical details)

```tsx
const [showPassword, setShowPassword] = useState(false)
```
- Input: `type={showPassword ? "text" : "password"}` — derived from state each render, so it can never desync from the visible icon/label.
- Toggle button **must** be `type="button"` (otherwise it defaults to `type="submit"` inside the `<form>` and would trigger submission on click/Enter).
- `aria-pressed={showPassword}` + `aria-label` flips between `"Show password"` / `"Hide password"` — this doubles as the test target via `getByRole("button", { name: /show password/i })`.
- Icon: `Eye` when masked (click-to-reveal), `EyeOff` when visible (click-to-hide); icon itself gets `aria-hidden="true"` since the button's accessible name already comes from `aria-label`.
- Native `<button>` gives Enter/Space activation for free.
- Password `<input>` is **uncontrolled**; toggling `type` on a live DOM input preserves `.value`, so typed text survives visibility toggles with no extra state.

## Submit handler

Read values via `FormData` at submit time (uncontrolled inputs — simpler than controlled state since there's no live validation UI to drive):

```tsx
function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const formData = new FormData(event.currentTarget)
  console.log({ mode, email: formData.get("email"), password: formData.get("password") })
}
```

- `preventDefault()` first — no reload, no navigation, no network call (fetch is never invoked, so no network request exists regardless).
- Logs one object `{ mode, email, password }` — easy to assert on with `expect(consoleSpy).toHaveBeenCalledWith(expect.objectContaining({...}))`.
- No `.reset()` call after submit — nothing in the spec asks for it, and clearing would work against the edge case "logged value must match what the user typed regardless of visibility state" if a test inspects the DOM post-submit.
- `FormData.get()` reads `.value` regardless of the input's current `type`, so the show/hide toggle state has no effect on what's captured — satisfies that edge case directly.

## Files

**New:**
- `components/AuthForm/AuthForm.tsx` — `"use client"`; `COPY` lookup table; renders `<h1 className="form-title">`, `<form>` (email field, password field + toggle, submit button), and switch-link `<p>`. Use `useId()` for the email/password `id`/`htmlFor` pairs so multiple instances (e.g. on `/preview`) don't collide.
- `components/AuthForm/AuthForm.module.css` — `@reference "../../app/globals.css";` at top (matches `Navbar.module.css` pattern), then `@apply`-based classes: `.title`, `.form`, `.field`, `.label`, `.input`, `.passwordRow` (relative-positioned wrapper so `.toggle` can sit absolutely inside it), `.toggle`, `.submit`, `.switch`. All JSX classNames are CSS-module references (`styles.*`) plus the pre-existing global `form-title` string — zero raw Tailwind utility classes appear directly in JSX, satisfying the "max 1 inline Tailwind class" rule with room to spare.
- `components/AuthForm/index.ts` — `export { default } from "./AuthForm"` (+ re-export `AuthFormMode`/`AuthFormProps` types).
- `tests/components/AuthForm.test.tsx` — see Testing section below.

**Modified:**
- `app/(public)/login/page.tsx` — replace stub with thin wrapper (also fixes `SignupPage` → `LoginPage` naming bug):
  ```tsx
  import AuthForm from "@/components/AuthForm"

  export default function LoginPage() {
    return (
      <div className="center-content">
        <div className="page-content">
          <AuthForm mode="login" />
        </div>
      </div>
    )
  }
  ```
- `app/(public)/signup/page.tsx` — same shape, `mode="signup"`.
- `app/(public)/preview/page.tsx` — add an `<h3>AuthForm</h3>` + `.preview-grid` section rendering `<AuthForm mode="login" />` and `<AuthForm mode="signup" />`, following the existing Avatar/Skeleton section pattern.

## Testing (`tests/components/AuthForm.test.tsx`)

Follows `tests/components/Navbar.test.tsx` / `Avatar.test.tsx` conventions (role-based queries, one `describe` block). Uses `@testing-library/user-event` (already a devDependency) for interaction. ~6 focused tests, mapped to the spec's Testing Guidelines:

1. Login mode renders email/password fields + a "Log In" submit button.
2. Signup mode renders email/password fields + a "Sign Up" submit button.
3. Toggle switches the password input's `type` between `password`/`text` and updates `aria-pressed`/accessible name.
4. Submitting logs `{ mode, email, password }` via `console.log` (spy) with the typed values — verifies no real submission side effects.
5. Login mode renders a link to `/signup`.
6. Signup mode renders a link to `/login`.

No separate `tests/pages/*` files — page components are trivial pass-throughs with no independent logic once AuthForm owns the heading/switch link, so testing them would just re-test AuthForm through an extra layer.

## Sequencing

1. Write `tests/components/AuthForm.test.tsx` first (TDD, per the `/component` skill convention) — expect it to fail (no component yet).
2. Create `components/AuthForm/{AuthForm.tsx,AuthForm.module.css,index.ts}`.
3. `npx vitest run tests/components/AuthForm.test.tsx` — iterate until green.
4. Update `login/page.tsx` and `signup/page.tsx`.
5. Update `preview/page.tsx`.
6. Run full suite (`npm test`) and `npm run lint`.
7. Manually verify in the dev server: both routes render correct heading/copy, tab order (email → password → toggle → submit → switch link), toggle works via mouse and keyboard (Space/Enter), console logs correct values on submit, switch links navigate correctly.

## Risks / things to double-check while implementing

- This is the first `"use client"` component in the repo — confirm nothing else (lint rule, build config) assumes an all-server-component tree. Expected to be a non-issue; Next.js App Router supports server pages importing client components natively.
- Double-check `@apply`/`@reference` resolves correctly from `components/AuthForm/AuthForm.module.css` — same relative depth (`../../app/globals.css`) as the existing `Navbar.module.css`, so should behave identically.
