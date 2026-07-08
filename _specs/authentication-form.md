# Spec for authentication-form

branch: claude/feature/authentication-form
figma_component (if used): n/a

## Summary

Add a working authentication form to the `/login` and `/signup` pages. Both pages
share the same form (email field, password field with a show/hide toggle, and a
submit button) but differ in their labels, heading, and submit action. The form
does not talk to any backend yet: on submit it logs the entered details to the
browser console. Users can move between the two forms easily via a link on each
page, so switching from "log in" to "sign up" (and back) is a single click.

The form is built as a reusable, folder-based component under `components/` (with
a co-located CSS Module and barrel export, per project conventions) so both the
`(public)/login` and `(public)/signup` routes can render it in "login" or "signup"
mode without duplicating markup.

## Functional Requirements

- Provide a single reusable authentication form component that can render in two
  modes: **login** and **signup**.
- The form includes:
  - An **email** input (type email, labelled, required).
  - A **password** input (type password by default, labelled, required).
  - A **show/hide password** control (icon button) that toggles the password
    field between masked and plain text.
  - A **submit** button whose label reflects the mode: "Log In" on `/login`,
    "Sign Up" on `/signup`.
- On submit, the form prevents the default browser submission and logs the
  captured details (mode, email, password) to the console. No network request is
  made and no persistence occurs.
- Each page shows a **switch link** to the other form:
  - `/login` links to `/signup` ("Need an account? Sign up").
  - `/signup` links to `/login` ("Already have an account? Log in").
- The `/login` page renders the form in login mode with the correct heading; the
  `/signup` page renders it in signup mode with the correct heading. (Note: the
  current `/login` stub heading text says "Log in to Your Account" while
  `/signup` says "Signup for an Account" — headings should be corrected so each
  page clearly matches its mode.)
- The show/hide toggle communicates its current state accessibly (e.g. accessible
  label / pressed state) so it is usable via keyboard and screen readers.
- Styling follows project conventions: component-scoped styles via CSS Modules,
  and no more than a single Tailwind class applied directly in templates (combine
  multiple utilities with `@apply` into a custom class).

## Figma Design Reference (only if referenced)

- File: n/a
- Component name: n/a
- Key visual constraints: reuse existing form/layout styling already present in
  `app/globals.css` (`center-content`, `page-content`, `form-title`).

## Possible Edge Cases

- Submitting with empty email and/or password fields.
- Email entered in an invalid format.
- Rapidly toggling show/hide password (state should stay consistent with input).
- Toggling show/hide password after typing, then submitting (logged value must
  match what the user typed, regardless of visibility state).
- Whitespace-only input in either field.
- Very long input values.
- Keyboard-only interaction: tabbing to the toggle and activating it with
  Enter/Space; submitting the form with the Enter key.
- Navigating between `/login` and `/signup` should not carry over previously typed
  values in an unexpected way (each page load starts fresh).

## Acceptance Criteria

- Visiting `/login` shows an email field, a password field, a working show/hide
  password toggle, and a "Log In" submit button, under a login-appropriate
  heading.
- Visiting `/signup` shows the same fields and toggle with a "Sign Up" submit
  button, under a signup-appropriate heading.
- Clicking the show/hide control switches the password field between masked and
  visible text, and the control reflects its current state.
- Submitting either form logs the mode, email, and password to the console and
  does **not** navigate away, reload, or hit any network endpoint.
- Each page contains a clearly labelled link that navigates to the other form.
- The form is implemented as one shared component reused by both pages (no
  duplicated form markup).
- Styling adheres to the CSS Modules + limited-inline-Tailwind conventions in
  CLAUDE.md, and code uses no semicolons and double quotes.

## Open Questions

- Should client-side validation block submission (and surface error messages) for
  empty/invalid input, or should submission always log whatever is entered for
  now? (Assumed: log whatever is entered, minimal/native validation only.)
- Should the switch between login and signup be full page navigation between the
  two routes, or an in-place mode toggle on a single page? (Assumed: keep the two
  routes and link between them.)
- Preferred icon source for the show/hide control — an inline SVG, an existing
  asset, or a lightweight approach that avoids adding a new dependency? (Assumed:
  no new dependency.)
- Exact copy for headings, button labels, and switch links.

## Testing Guidelines

Create a test file(s) in the ./test folder for the new feature, and create
meaningful test for the following cases, without going too heavy:

- The form renders email and password fields and a submit button in both login
  and signup modes, with the correct submit label per mode.
- The show/hide toggle switches the password input's type between masked and
  visible and updates its accessible state.
- Submitting the form calls `console.log` with the entered email and password (and
  mode) and does not perform a default form submission.
- Each page renders a link that points to the other authentication route.
