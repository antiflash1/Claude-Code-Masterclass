# Spec for create-heist-form

branch: claude/feature/create-heist-form
figma_component (if used): none

## Summary
The "Create a New Heist" page (`app/(dashboard)/heists/create/page.tsx`) is currently a heading-only stub. This feature turns it into a working form that lets a signed-in user create a new heist, assign it to another user (chosen by codename), and submit it. On successful submission, a new document is written to the Firestore `heists` collection using the existing `CreateHeistInput` shape, and the user is redirected to the heists list page.

## Functional Requirements
- Render a form with fields for the heist `title` and `description`.
- Render an "assign to" selector that lets the current user pick another user to assign the heist to, identified by that user's codename (not their raw user id).
- Populate the assignee selector by reading user documents from the Firestore `users` collection (codename + document id/uid per user). Exclude the current signed-in user from the assignable list.
- On submit, build a `CreateHeistInput` object and write it to the Firestore `heists` collection:
  - `title`, `description` — from the form fields.
  - `createdBy` — the current signed-in user's uid.
  - `createdByCodename` — the current signed-in user's codename.
  - `assignedTo` — the selected user's uid.
  - `assignedToCodeName` — the selected user's codename.
  - `createdAt` — set programmatically at submission time (server timestamp), not user-editable.
  - `deadline` — set programmatically at submission time, not user-editable.
  - `finalStatus` — set programmatically to `null`.
- After a successful write, redirect the user to the heists list page.
- Show a loading/submitting state on the form while the write is in progress, and disable re-submission during that time.
- Surface a clear error message on the form if the Firestore write fails, without losing the user's entered input.
- Validate that required fields (title, description, assignee) are filled before allowing submission.

## Figma Design Reference (only if referenced)
Not applicable — no Figma reference was provided for this feature.

## Possible Edge Cases
- No other users exist yet (assignee list is empty) — form should communicate this rather than allowing submission with no assignee.
- The users collection is slow to load — assignee selector should show a loading state rather than appearing empty/broken.
- The current user's codename or uid is unavailable when the form loads (auth state not yet resolved) — form should not allow submission until this resolves.
- User navigates away or double-submits before the write completes — must not create duplicate heist documents.
- Firestore write fails (permissions, network) — user sees an error and can retry without re-entering data.
- Very long title/description input — form should handle gracefully (e.g. reasonable max length or wrapping) without breaking layout.

## Acceptance Criteria
- Visiting `/heists/create` shows a form with title, description, and assignee fields.
- The assignee field lists other users by codename, sourced from the Firestore `users` collection.
- Submitting a valid form creates exactly one new document in the Firestore `heists` collection matching the `CreateHeistInput` shape, with `createdAt`, `deadline`, and `finalStatus` set programmatically rather than by the user.
- After a successful submission, the user is redirected to the heists list page.
- Submitting with missing required fields does not create a document and shows a validation message instead.
- A failed submission shows an error message and preserves the user's entered form data.

## Open Questions
- What is the exact `deadline` rule (e.g. fixed offset from `createdAt` such as 48 hours, or user-configurable in a future iteration)? Confirm the intended default before implementation. Answer: Fixed 48hours after creation.
- Should the assignee selector allow assigning a heist to yourself, or must `assignedTo` always differ from `createdBy`?. Answer: Always differ from `createdBy`.
- Is there an existing typed interface for `users` collection documents, or does one need to be introduced as part of this work?. Answer: use the `users`collection as defined @components/AuthForm/AuthForm.tsx that create users when the signup from is submitted. It also as planed @_plans/firebase-auth-signup.md
- Should the redirect target be the heists list page (`/heists`) or a specific heist detail page for the newly created heist?. Answer: It should be the `/heists` page.

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- Form renders required fields (title, description, assignee) and a submit control.
- Submitting with missing required fields shows validation feedback and does not attempt a Firestore write.
- Submitting a valid form triggers a Firestore write with the expected `CreateHeistInput` fields (mocking the Firestore call) and redirects on success.
- A failed Firestore write surfaces an error message and keeps the entered form values intact.
