# Spec for firebase-auth-signup

branch: claude/feature/firebase-auth-signup
figma_component (if used): none

## Summary
Wire the existing signup form (`app/(public)/signup/`, via the shared `AuthForm` component) to real Firebase authentication using the Web SDK exports from `lib/firebase.ts`. On successful account creation, generate a random, unique-sounding "codename" for the user in PascalCase, set it as the Firebase Auth `displayName`, and persist it (along with the user's uid) to a `users` collection document in Firestore. The user's email must never be written to Firestore.

## Functional Requirements
- On signup form submission, create a new Firebase Auth user with the submitted email and password using the Firebase Web SDK (`firebase/auth`), via the `auth` export already available in `lib/firebase.ts`.
- Generate a random codename by picking one word from each of three distinct, curated word sets (unique wordsoining the three chosen words together with no s within each set, e.g. adjectives, nouns, animals — exact sets to be defined during implementation) and jeparator, each word capitalized (PascalCase), e.g. `SilentCrimsonFalcon`.
- After the Auth user is created, set the user's `displayName` to the generated codename (via Firebase Auth profile update).
- Create a document in the Firestore `users` collection for the new user containing only:
  - the generated codename (field name: `codename`)
  - the user's id (uid)
- Do NOT store the user's email or any other PII in the Firestore `users` document.
- This flow applies only to the `signup` mode of `AuthForm`; the `login` mode's behavior is out of scope for this spec.
- Use only the Firebase Web SDK (`firebase/auth`, `firebase/firestore`) — no Admin SDK, no server-side/API route calls.
- On success, the user should end up authenticated (Firebase Auth session established client-side).
- On failure (e.g. email already in use, weak password, network error), the form should surface an error to the user instead of failing silently.

## Figma Design Reference (only if referenced)
- Not applicable — no Figma link provided.

## Possible Edge Cases
- Signup with an email that's already registered.
- Weak/invalid password rejected by Firebase Auth.
- Firestore write fails after Auth user creation succeeds (partial success — user exists in Auth but has no `users` doc).
- Network/Firebase service unavailable during either the Auth call or the Firestore write.
- Word-set collision odds: unlikely but two different users could end up with the same generated codename since sets are fixed; consider whether collisions matter for this app.
- Rapid double-submit of the signup form creating duplicate requests.

## Acceptance Criteria
- Submitting the signup form with a valid email/password creates a new Firebase Auth user.
- The created user's `displayName` is a PascalCase string composed of exactly three words, each drawn from a different word set.
- A corresponding document exists in the Firestore `users` collection containing exactly `codename` and the user's `id` — no email or other PII.
- Submitting with an already-registered email (or other Auth error) shows a visible error message and does not create a Firestore document.
- No use of the Firebase Admin SDK or any non-Web-SDK Firebase API.

## Open Questions
- What should the three word sets actually contain (themes, size, tone — e.g. heist/spy-flavored to match the "Pocket Heist" concept)? Response: Heist/spy-flavored is a good idea.
- Should the field name for the document id in Firestore be the auto uid as the document ID itself, or a separate `id` field (or both)?. Response: It can be the auto uid as the document ID itself.
- Where should signup errors be displayed in the UI (inline under the form, toast, etc.) — `AuthForm` currently has no error-display affordance?. Response: Inline is ok.
- Should the user be redirected somewhere (e.g. `/heists`) immediately after successful signup, given the splash-page redirect logic described in CLAUDE.md doesn't exist yet?. Response: Redirect them to `/heists`
- Should codename uniqueness be enforced (e.g. retry on collision), or is a collision acceptable?. Response: Not uniqueness enforce is needed at the moment for this app due to small user base.

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- Codename generator produces a PascalCase string composed of one word from each of the three word sets, joined with no separator.
- Successful signup calls Firebase Auth user creation, sets the generated `displayName`, and writes a `users` doc containing only `codename` and `id` (mocking the Firebase SDK).
- Firestore document written on signup never contains an `email` field.
- Signup failure (e.g. Auth rejects the request) surfaces an error and does not attempt the Firestore write.
