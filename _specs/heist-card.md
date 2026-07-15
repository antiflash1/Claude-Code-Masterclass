# Spec for Heist Card Component

branch: claude/feature/heist-card
figma_component (if used): HeistCard

## Summary
Add a `HeistCard` component that renders a single heist as a clickable card, and use it to populate the `/heists` page in a 3-column grid. Only active heists that are assigned to the current user should render a card — expired heists are excluded. While heist data is loading, the grid should render matching `HeistCardSkeleton` placeholders instead of the real cards.

## Functional Requirements
- Create a `HeistCard` component that displays a single heist's title, assigned-to and assigned-by codenames, due date, and remaining-time/status text.
- The heist title on each card links to `/heists/:id` using the heist's document id. The linked detail page itself does not need any new content — it can remain the existing stub.
- Create a `HeistCardSkeleton` component that mirrors the `HeistCard` layout as a pulsing placeholder, for use while heist data is loading.
- Update the `/heists` page to render heist data in a 3-column grid layout using `HeistCard`.
- While heist data is loading, render the same 3-column grid populated with `HeistCardSkeleton` placeholders instead of `HeistCard`s.
- Only render cards for heists that are both active (not expired) and assigned to the current signed-in user. Expired heists must not render a card, whether or not they are assigned to the user.
- Reuse the existing `useHeist` hook (or equivalent existing data layer) for fetching/filtering heists rather than introducing a new data-fetching mechanism, if it already covers this need.

## Figma Design Reference (only if referenced)
- File: "Page Designs", page "Dashboard", frame "Heists Dashboard for Pocket Heist"
- Component name: `HeistCard` (node `54:60`)
- Link: https://www.figma.com/design/tELPsOMKJdcWNnJJHAwu5q/Page-Designs?node-id=54-60&m=dev&t=x24b9D8CCinurqPF-1
- Key visual constraints:
  - Card: ~378×178px, dark surface background `#101828` with a ~1px `#1e2939` border and 10px border-radius; ~21px content padding (top/left/right); ~12px gap between title row and meta block, ~8px between meta rows; ~16px grid gap between cards.
  - Title: Inter 16px/24px, weight 400, `-0.3125px` letter-spacing, white text, wraps to 2 lines; small clock icon badges the top-right corner of the title row.
  - Meta text ("To:", "By:", date): Inter 14px/20px, weight 400, `-0.15px` letter-spacing, gray (`#99a1af`); person and calendar line icons prefix the "To:"/"By:" and date rows respectively.
  - Semantic accent colors: recipient ("To:") handle in purple `#c27aff`, assigner ("By:") handle in pink `#fb64b6`; the trailing time-remaining/status text (e.g. "Overdue", "4h 42m") is also purple `#c27aff` in all sampled cards — no separate color variant per status was found in Figma.
  - No design tokens/variables are defined in the Figma file; values above are raw hex/px reads, not resolved tokens.
  - No skeleton/loading state exists in Figma for this card — the skeleton should approximate this layout's proportions rather than match a Figma reference.

## Possible Edge Cases
- User has zero active, assigned heists — the grid should render with no cards and no leftover skeletons (empty state, not specced further here beyond "no cards").
- A heist's status flips from active to expired while the page is open (real-time listener) — its card should disappear from the grid without a page reload.
- Heist is active but assigned to a different user — must not appear in the current user's grid.
- Very long heist titles or codenames should not break the 3-column grid layout (wrapping vs. truncation to be decided during implementation).
- Loading state with a small number of heists (e.g. 1) should not look broken in a 3-column grid.
- Screen widths narrower than desktop — grid column count behavior on smaller viewports is not specified here and should degrade gracefully.

## Acceptance Criteria
- `/heists` renders a 3-column grid of `HeistCard`s for the signed-in user's active, assigned heists only.
- Expired heists never render a card, regardless of assignment.
- Heists assigned to other users never render a card.
- Each card's title is a link to `/heists/:id` and navigates to the (still-stub) detail page.
- While heist data is loading, the grid shows `HeistCardSkeleton` placeholders in the same 3-column layout, then swaps to real cards once data arrives.
- Card visuals (spacing, typography, colors) match the Figma reference above.

## Open Questions
- Should the 3-column grid collapse to fewer columns on smaller viewports, or is desktop-only in scope for this spec? Answer: Yes, make it responsive.
- Is truncation or wrapping preferred for long titles/codenames that exceed the card's fixed width? Answer: Wrapping preferred.
- Should the time-remaining/status text ever change color (e.g. red for overdue) despite Figma only showing purple, or is a single accent color intentional?. Answer: Single accent is ok.
- How many skeleton placeholders should render while loading (a fixed count, or based on a previous/cached heist count)? Answer: One row of cards in the grid.

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful test for the following cases, whithout going too heavy:
- `HeistCard` renders the heist title as a link pointing to `/heists/:id`.
- `HeistCard` renders assigned-to, assigned-by, and date/status text from the heist data passed in.
- `/heists` page excludes expired heists and heists not assigned to the current user from the rendered grid.
- `/heists` page renders `HeistCardSkeleton` placeholders while heist data is loading, and swaps to `HeistCard`s once loaded.
