# Spec for use-heist-hook

branch: claude/feature/use-heist-hook
figma_component (if used): none

## Summary
Add a `useHeist` hook that subscribes to real-time heist data from the Firestore `heists` collection and returns an array of heist objects, filtered and scoped according to a required mode argument. Wire the hook into the heists list page (`app/(dashboard)/heists/page.tsx`) so each of the three existing sections (active, assigned, expired) renders the titles of its corresponding result set.

## Functional Requirements
- Create a `useHeist` hook that accepts one required argument, a mode of `'active' | 'assigned' | 'expired'`.
- The hook subscribes to real-time updates (not a one-time fetch) against the `heists` Firestore collection and returns an array of heist objects reflecting live changes for as long as the calling component is mounted.
- `'active'` mode returns heists where the current signed-in user is the assignee (`assignedTo`) and the `deadline` has not yet passed (relative to the current time).
- `'assigned'` mode returns heists where the current signed-in user is the creator (`createdBy`) and the `deadline` has not yet passed.
- `'expired'` mode returns all heists, regardless of who created or was assigned the heist, where the `deadline` has passed AND `finalStatus` is not null (i.e. the heist has been resolved).
- The hook must resolve the current signed-in user itself (consistent with how the rest of the app accesses the authenticated user) rather than requiring the caller to pass a user ID.
- The hook cleans up its Firestore subscription when the component unmounts or when the mode argument changes.
- Update `app/(dashboard)/heists/page.tsx` to use `useHeist` three times, once per mode, and render only the `title` of each heist as a list under the corresponding existing heading (`Your Active Heists`, `Heists You've Assigned`, `All Expired Heists`). No other heist fields need to be displayed at this stage.

## Possible Edge Cases
- No signed-in user available yet (auth state still resolving) — hook should not query with an undefined/null user id.
- User has zero results for a given mode — the corresponding section should render with no titles rather than erroring.
- A heist's `deadline` is exactly "now" at query time — treat as a boundary case, but exact tie-breaking behavior is not critical.
- Mode argument changes between renders (e.g. if reused with different modes) — subscription should re-run against the new mode rather than reusing stale results.
- Real-time updates arriving after initial mount — sections should update in place without requiring a page refresh.

## Acceptance Criteria
- `useHeist('active')`, `useHeist('assigned')`, and `useHeist('expired')` each return the correct, live-updating subset of heists per the rules above.
- The heists list page shows only heist titles under each of the three existing section headings, sourced from the corresponding hook call.
- Adding, updating, or deleting a relevant heist document in Firestore is reflected in the UI without a manual page reload.
- No heists collection is displayed in a section that violates its filter (e.g. an expired, unresolved heist never appears under "All Expired Heists").

## Open Questions
- Should sections show any empty-state messaging when a result set has zero heists, or is an empty list acceptable for this stage? Answer: Empty list is acceptable.
- Should expired heists be limited/paginated, given no user-scoping narrows that result set?. Answer: Not limited or paginated at this stage.

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- `useHeist('active')` returns only non-expired heists assigned to the current user.
- `useHeist('assigned')` returns only non-expired heists created by the current user.
- `useHeist('expired')` returns only heists past their deadline with a non-null `finalStatus`, regardless of user.
- The heists list page renders titles from each hook's result set under the correct section.
