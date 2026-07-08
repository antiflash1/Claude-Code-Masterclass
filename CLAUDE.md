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
- **Auth-based routing is intended but not implemented.** `app/(public)/page.tsx` is documented as a splash page meant to redirect to `/heists` when logged in and `/login` when not — the redirect logic does not exist yet. `/login` and `/signup` both render the shared `AuthForm` component (`mode="login"` / `mode="signup"`) but submission only logs form data to the console — there's no real auth or data layer.
- **Heists feature** lives under `app/(dashboard)/heists/`: list (`page.tsx`), `create/`, and dynamic detail `[id]/`. These are currently heading-only stubs.
- **Components** are folder-based: a directory under `components/` with the component `.tsx`, a co-located `*.module.css` (CSS Modules for scoped styles), and a barrel `index.ts` re-export. Import via the barrel (e.g. `@/components/Navbar`).
- **Styling** is split: global styles + custom utility classes (`.page-content`, `.center-content`, `.form-title`, `.btn`, etc., built with `@apply`) live in `app/globals.css`, alongside Tailwind 4 (configured through `@tailwindcss/postcss`, no `tailwind.config`). Component-specific styles go in the component's CSS Module.

## Slash commands

- `/spec <idea>` — turns a short idea into a feature spec. Aborts if the working tree isn't clean, creates a `claude/feature/<slug>` branch via `git switch -c`, and writes `_specs/<slug>.md` from `_specs/template.md`.
- `/component <description>` — scaffolds a component test-first: writes `tests/components/[Name].test.tsx`, confirms it fails, creates `components/[Name]/` (component + CSS Module + barrel), confirms tests pass, then adds a demo section to `app/(public)/preview/page.tsx`.
- `/commit-message` — analyzes staged changes and proposes a commit message (see emoji/type convention below); never auto-commits.

## Conventions

- Path alias `@/*` maps to the project root (see `tsconfig.json`) — prefer it over relative imports.
- No semicolons; double quotes (enforced by `.prettierrc`, match existing files).
- Do NOT apply more than one Tailwind utility class directly in a component template — if an element needs more, combine them into a custom class in `globals.css` using `@apply`.
- Use minimal project dependencies where possible.
- Use `git switch -c` to create/switch branches, not `git checkout`.
- Tests use Vitest with `globals: true` and jsdom; Testing Library matchers come from `@testing-library/jest-dom/vitest` loaded in `vitest.setup.ts`. Prefer role-based queries (`getByRole`) as in `tests/components/Navbar.test.tsx`.
- Commit messages follow `<emoji> <type>: <description>` (e.g. `✨ feat:`, `🐛 fix:`, `🔨 refactor:`, `📝 docs:`, `🎨 style:`, `✅ test:`, `⚡ perf:`) and explain *why*, not just *what* — see `.claude/commands/commit-message.md`.

## Checking Documentation

**important:** When implementing any lib/framework-specific features, ALWAYS check the appropiate lib/framework documentation using the Context7 MCP server before writing code.

