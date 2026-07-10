# Spec for navbar-logout-button

branch: claude/feature/navbar-logout-button
figma_component (if used): Logout button (Page Designs, node-id 57-18)

## Summary
Add a logout button to the Navbar component that lets an authenticated user sign out of the app. The button should only be visible when a user is logged in, and clicking it should sign the user out via Firebase Auth. No post-logout redirect is required at this stage.

## Functional Requirements
- Add a logout button/control to the `Navbar` component.
- The button is only rendered when there is an authenticated user (use the existing `useUser` auth-state hook to determine login status).
- When logged out, the button is not rendered at all (not just hidden/disabled).
- Clicking the button signs the current user out of Firebase Auth.
- No navigation or redirect occurs after logout — the user stays on the current page and the Navbar re-renders to reflect the signed-out state.
- The button follows existing Navbar styling conventions (CSS Module, `@apply` utility classes per project conventions).

## Figma Design Reference (only if referenced)
- File: https://www.figma.com/design/tELPsOMKJdcWNnJJHAwu5q/Page-Designs?node-id=57-18&m=dev
- Component name: `LogoutButton` (node 57:18), wrapping a `ButtonComponent` instance (node 57:3)
- Key visual constraints (partial — see note below):
  - Overall component size: 127 × 38px
  - Contains a single button instance made of an `Icon` frame (20 × 20px, positioned at x:16, y:10) followed by a `Text` frame (positioned at x:1, y:7, spanning the button width) — icon-then-label layout, left-aligned icon with the text filling the remaining width
  - Placement in context: within the Navbar's `Container` frame, `LogoutButton` sits at x:441 (of a 771px-wide container), immediately to the left of the existing `ButtonComponent` node (21:4, x:585, 187×40) which corresponds to the current "Create Heist" button in `components/Navbar/Navbar.tsx`. Both sit at roughly the same vertical position (y:12–14) inside the 65px-tall Navbar, alongside the "Pocket Heist" heading (x:0). This indicates the logout button belongs in the Navbar's nav list, positioned before the "Create Heist" button.
  - The logout button (127×38) is narrower than the "Create Heist" button (187×40), consistent with a shorter label and/or icon-only-leaning treatment.
- Note: Fills, colors, typography, and effects still could not be retrieved after a third attempt. `get_metadata` reliably returns layout/structure, but `get_design_context`, `get_node`, `get_nodes`, and screenshot exports fail (either a `dynamic-page` document-access error resolving component styling, or blank renders) for this node. `get_styles` and `get_variable_defs` return no local styles or tokens for the file. See Figma manually for exact colors, font, and icon details before implementing — likely reuse the existing `.btn` utility class conventions already used by the "Create Heist" button.

## Possible Edge Cases
- Auth state is still loading (`useUser` in a loading state) — button should not flash incorrectly before the auth state resolves.
- Sign-out call fails (e.g. network error) — button click should not crash the Navbar; consider how/whether an error is surfaced.
- Rapid repeated clicks on the logout button while the sign-out request is in flight.
- Navbar renders on both public and dashboard route groups — confirm the button only ever appears in the authenticated (dashboard) context.

## Acceptance Criteria
- [ ] Logged-in users see a logout button in the Navbar.
- [ ] Logged-out users do not see the logout button in the Navbar.
- [ ] Clicking the logout button signs the user out of Firebase Auth.
- [ ] After logout, the Navbar immediately reflects the signed-out state (button disappears) without a page reload.
- [ ] No redirect happens as part of this feature.

## Open Questions
- Should the logout button show a loading/disabled state while the sign-out request is in flight?. Answer: Yes.
- Should sign-out errors be surfaced to the user (e.g. toast/message), or silently logged? Answer: surfaced to the user via "toast".


## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- Navbar renders a logout button when the user is authenticated.
- Navbar does not render a logout button when the user is not authenticated.
- Clicking the logout button triggers the sign-out action.
