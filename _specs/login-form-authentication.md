# Spec for login-form-authentication

branch: claude/feature/login-form-authentication
figma_component (if used): none

## Summary
The login form at `/login` currently only logs the submitted email and password to the console — it does not authenticate the user. This feature wires the login form to real credential-based authentication so that a user submitting correct credentials is actually logged in, and sees a clear success message confirming this. No redirect to another page happens after a successful login for now; the user stays on the login page with the success state visible.

## Functional Requirements
- On submitting the login form with a valid, registered email/password combination, the user is authenticated (signed in) using the existing authentication provider already used for signup.
- On successful login, the form displays a success message to the user in place of (or alongside) the form, confirming they have been logged in.
- No navigation/redirect occurs automatically after a successful login — the user remains on the `/login` page and sees the success message.
- If the submitted credentials are incorrect or the account does not exist, the user sees a clear, human-readable error message instead of a success message.
- While the login request is in flight, the submit button is disabled to prevent duplicate submissions, consistent with existing signup behavior.
- The password visibility toggle and general form layout/behavior already present in `AuthForm` continue to work unchanged for the login mode.

## Figma Design Reference (only if referenced)
- Not applicable — no Figma design was referenced for this feature.

## Possible Edge Cases
- User submits the form with an email that has no matching account.
- User submits the form with a valid email but an incorrect password.
- User submits the form with an empty or malformed email/password (should be caught by existing required/type validation on the inputs).
- User double-clicks/submits the form rapidly before the first request resolves.
- Network failure or Firebase service error while attempting to log in.
- User successfully logs in, then submits the form again without navigating away (should be able to see a fresh success/error state per attempt).

## Acceptance Criteria
- Submitting the login form with correct credentials results in the user being signed in and a success message being shown on the page.
- Submitting the login form with incorrect or non-existent credentials results in an error message being shown, and the user is not marked as logged in.
- No redirect happens after login; the user stays on `/login` in both the success and error cases.
- The submit button is disabled during the authentication request and re-enabled once it completes (success or error).
- Existing signup functionality and shared `AuthForm` UI (password toggle, switch link, styling) are unaffected by this change.

## Open Questions
- Should the success message replace the form entirely, or remain alongside a disabled/cleared form? Answer: alogside.
- Should there be a way to dismiss the success message or retry logging in again from the same view without a page reload? Answer No.

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- Submitting the login form with valid credentials shows a success message.
- Submitting the login form with invalid/incorrect credentials shows an error message and no success message.
- The submit button is disabled while the login request is pending.
