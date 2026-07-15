# Plan: HeistCard + HeistCardSkeleton (`_specs/heist-card.md`)

## Context

`/heists` currently renders three plain `<ul><li>` sections built on `useHeist(mode)`: "Your Active Heists" (assigned to me), "Heists You've Assigned" (created by me), "All Expired Heists". This feature replaces the Active and Assigned sections with a 3-column, responsive grid of a new `HeistCard` component (title links to `/heists/:id`, meta shows To/By codenames + deadline + time-remaining), with a matching `HeistCardSkeleton` shown while `useHeist` is loading. The Expired section is explicitly out of scope and stays untouched (confirmed with user — the original ask was "active and assigned heist only, no cards for expired").

Design comes from Figma node `54:60` (`HeistCard`) — dark card, purple/pink accent codenames, purple time-remaining text, no skeleton reference in Figma (approximate from card proportions). 12 fresh active heists across 4 real users already exist in Firestore for live verification.

## Key decisions

- **Loading signal**: `useHeist` currently returns only `Heist[]`, no loading flag. Extend it to return `{ heists, loading }`. `loading` starts `true`, flips to `false` on the first `onSnapshot` callback (success or error) for the current subscription; reset to `true` when a new subscription starts (mode/uid change).
- **Grid CSS**: new `app/(dashboard)/heists/page.module.css` (co-located with `page.tsx`, matching the `app/(public)/page.module.css` precedent). Reference path is `@reference "../../globals.css"` (two levels: `heists/` → `(dashboard)/` → `app/`).
- **Breakpoints**: `grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` — cards are ~378px wide, so a 2-col tablet tier avoids cramming 3 cards into a too-narrow viewport (the existing `.steps` 1→3 jump isn't a good fit here).
- **Border color** `#1e2939`: no matching `@theme` token exists; use Tailwind arbitrary value `border-[#1e2939]`, following the `.btn` precedent of one-off arbitrary hex in `globals.css`.
- **Time-remaining text**: new pure utility `lib/formatTimeRemaining.ts`, no `setInterval`/live ticking (no precedent for that in this codebase, recomputes naturally on re-render). Formats: `"Overdue"` (≤0ms remaining), `"Xh Ym"` (<1 day), `"Xd Yh"` (≥1 day) — matches Figma's "4h 42m" / "2d 0h" / "Overdue" examples.
- **Icons**: `Clock`, `User`, `Calendar` from `lucide-react` (confirmed present in installed version) — `size`/`strokeWidth` props per existing `Navbar.tsx` convention.
- **Skeleton count**: fixed 3 per grid (one row), per answered open question — not derived from previous heist count.
- **Real-time expiry**: no extra client code needed — `useHeist`'s live `onSnapshot` + `where("deadline", ">", now)` handles adds/removes from writes for free. Note (not a fix): the `now` bound is fixed at subscribe time, so a card won't silently vanish purely from wall-clock time passing with no other triggering write — pre-existing `useHeist` behavior, out of scope here.

## Files to change

**`lib/useHeist.ts`** — change return type to `{ heists: Heist[], loading: boolean }`:
- Add `const [loading, setLoading] = useState(true)`.
- `setLoading(true)` when a new subscription starts inside the effect (before calling `onSnapshot`).
- `setLoading(false)` in both the `onSnapshot` success and error callbacks.
- Return `{ heists: canQuery ? heists : [], loading }`.

**`lib/formatTimeRemaining.ts`** (new) — pure function per the format above, `now` as an optional second param (defaults to `new Date()`) purely for deterministic tests.

**`components/HeistCard/`** (new folder: `HeistCard.tsx`, `HeistCard.module.css`, `index.ts`)
- Props: `{ heist: Heist }`.
- Title (`<Link href={/heists/${heist.id}}>`) + clock icon in a title row; meta rows for "To: {assignedToCodeName}" (purple), "By: {createdByCodename}" (pink), and "{formatted deadline} · {formatTimeRemaining(heist.deadline)}" (purple), each prefixed with a `User`/`User`/`Calendar` icon.
- `heist.assignedToCodeName` casing (capital C) used verbatim — do not "fix".
- CSS module uses `@reference "../../app/globals.css"` + `@apply` combining Tailwind utilities per class (per `HeistForm.module.css` convention): `bg-lighter`, `border-[#1e2939]`, `rounded-[10px]`, `p-[21px]`, `text-heading`/`text-body`/`text-primary`/`text-secondary`, `break-words` (wrap, not truncate) on title/meta text.

**`components/HeistCardSkeleton/`** (new folder: `HeistCardSkeleton.tsx`, `HeistCardSkeleton.module.css`, `index.ts`)
- No props. Root `aria-hidden="true"` + `data-testid="heist-card-skeleton"` (new testability hook, needed to count skeletons per grid in tests).
- CSS mirrors `components/Skeleton/Skeleton.module.css`'s exact pulse pattern (`var(--color-body)` bars at `opacity: 0.15`→`0.25`, `1.6s ease-in-out infinite`, plain CSS not `@apply`, matching that file's own style), reshaped to a title-row + 3 meta-row skeleton matching `HeistCard`'s real proportions instead of the generic avatar+lines shape.

**`app/(dashboard)/heists/page.module.css`** (new) — `.grid { @apply mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3; }`, shared by both Active and Assigned sections.

**`app/(dashboard)/heists/page.tsx`** — for Active and Assigned sections: destructure `{ heists, loading }` from `useHeist`, replace `<ul><li>` with `<div className={styles.grid}>` rendering 3 `HeistCardSkeleton`s while `loading`, else `heists.map(h => <HeistCard key={h.id} heist={h} />)`. Expired section stays exactly as-is (`useHeist("expired")` — its `loading` field is simply unused).

**`app/(public)/preview/page.tsx`** — add `HeistCard`/`HeistCardSkeleton` sections following the existing `Avatar`/`Skeleton` pattern, with 2 fake `Heist` objects (one normal, one overdue) inside `.preview-grid` to show both time-remaining accent states, plus a `HeistCardSkeleton` pair.

## Tests

- **`tests/lib/useHeist.test.tsx`**: update the `Probe` helper to destructure `{ heists, loading }` and expose loading via a `data-testid`; existing assertions on heists content unaffected. Add: loading starts `true`, flips `false` after first snapshot; loading stays `true` when `canQuery` is false.
- **`tests/lib/formatTimeRemaining.test.ts`** (new, mirrors `tests/lib/codenames.test.ts`): overdue, sub-day ("Xh Ym"), multi-day ("Xd Yh"), exact-now boundary → "Overdue".
- **`tests/components/HeistCard.test.tsx`** (new): title renders as a link to `/heists/:id`; assigned-to/assigned-by codenames render; deadline + time-remaining text render (use `vi.useFakeTimers()`/`vi.setSystemTime()` for a deterministic status string).
- **`tests/components/HeistCardSkeleton.test.tsx`** (new, light): renders with `aria-hidden` (via the `data-testid` hook).
- **`tests/app/(dashboard)/heists/page.test.tsx`**: update `mockHeistsByMode` to the new `{ heists, loading }` shape (default `{ heists: [], loading: false }`); Active/Assigned section assertions move from `getByText(title)` to `getByRole("link", { name: title })`; Expired section assertions unchanged. Add a new test: mock `loading: true` for active/assigned → assert 3 `heist-card-skeleton` per grid; re-render with `loading: false` + real heists → assert skeletons gone, cards present.

## Verification

1. `npm run lint` and `npm test` (whole suite, plus the specific new/changed files above) — all green.
2. `npm run dev`, sign in as one of the 4 seeded users (all have several of the 12 freshly-seeded active heists), visit `/heists`:
   - Active/Assigned sections show 3-col card grids (resize browser to confirm 3→2→1 column collapse), cards match Figma spacing/colors, title click navigates to `/heists/:id` stub.
   - Reload and briefly observe the 3-skeleton pulsing grid before cards swap in.
   - Expired section remains an untouched plain list.
3. Visit `/preview`, confirm new `HeistCard` (normal + overdue) and `HeistCardSkeleton` sections render correctly.
