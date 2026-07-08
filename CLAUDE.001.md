# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Pocket Heist** — a Next.js app for creating and managing playful office "heists" (tiny missions). Starter project for the Claude Code Masterclass; most pages are UI stubs without a data layer yet.

## Commands

```bash
npm run dev      # Start the dev server at http://localhost:3000
npm run build    # Production build
npm start        # Serve the production build
npm run lint     # ESLint (eslint-config-next: core-web-vitals + typescript)
npm test         # Run the Vitest suite
```

Run a single test file or test by name:

```bash
npx vitest run tests/components/Navbar.test.tsx   # one file
npx vitest -t "renders the Create Heist link"     # by test name
npx vitest                                         # watch mode
```

## Architecture

Next.js 16 **App Router** with React 19, TypeScript (strict), and Tailwind CSS 4.

- **Route groups drive layout, not URLs.** `app/(public)/` and `app/(dashboard)/` each own a `layout.tsx` but contribute nothing to the path. `(public)` wraps pages in `<main class="public">` for unauthenticated views (splash, login, signup, preview); `(dashboard)` renders the `Navbar` + `<main>` shell for the authenticated heists area. `app/layout.tsx` is the root `<html>`/`<body>` shell and holds site `metadata`.
- **Auth-based routing is intended but not implemented.** `app/(public)/page.tsx` is documented as a splash page meant to redirect to `/heists` when logged in and `/login` when not — the redirect logic does not exist yet.
- **Heists feature** lives under `app/(dashboard)/heists/`: list (`page.tsx`), `create/`, and dynamic detail `[id]/`. These are currently heading-only stubs.
- **Components** are folder-based: a directory under `components/` with the component `.tsx`, a co-located `*.module.css` (CSS Modules for scoped styles), and a barrel `index.ts` re-export. Import via the barrel (e.g. `@/components/Navbar`).
- **Styling** is split: global styles in `app/globals.css` + Tailwind 4 (configured through `@tailwindcss/postcss`, no `tailwind.config`), and CSS Modules for component-scoped styles.

## Conventions

- Path alias `@/*` maps to the project root (see `tsconfig.json`) — prefer it over relative imports.
- No semicolons; double quotes (match existing files).
- Tests use Vitest with `globals: true` and jsdom; Testing Library matchers come from `@testing-library/jest-dom/vitest` loaded in `vitest.setup.ts`. Prefer role-based queries (`getByRole`) as in `tests/components/Navbar.test.tsx`.

## Additional Codding Preferences
- Do NOT use semicolons for JavaScript or TypeScript code.
- Do NOT apply tailwind classes directly in componet templates unless essential or just 1 at most. If an element needs more than a single tailwind class, combine them into a custom class using the `@apply` directive.
- Use minimal project dependencies where possible.
- Use the `git switch -c` command to siwthc to new branches, not the `git checlout`.
