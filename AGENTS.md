<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Website Reverse-Engineer Template

## What This Is
A reusable template for reverse-engineering any website into a clean, modern Next.js codebase using AI coding agents. The Next.js + shadcn/ui + Tailwind v4 base is pre-scaffolded — just run `/clone-website <url1> [<url2> ...]`.

Every cloned site lives in its own folder, `sites/<site>/`, as a standalone Next.js app (own `package.json`, lockfile and `node_modules`) created by `npm run new-site -- <url>`. The root app is the clean template the site apps are copied from: never put a clone's routes, components, assets or research in the root `src/`, `public/` or `docs/`.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Base UI primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (default — will be replaced/supplemented by extracted SVGs)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **Deployment:** Vercel

## Commands
At the template root:
- `npm run new-site -- <url>` — Create `sites/<host>/` from the template and install it (`--name <site>` to pick the folder name; `node scripts/new-site.mjs <url> [--name <site>]` works the same without npm in between)
- `npm run check` — Run lint + typecheck + tests + build for the template app (ignores `sites/`)
- `npm test` — Tests for `scripts/new-site.mjs`

Inside `sites/<site>/`:
- `npm run dev` — Start that site's dev server (`npm run dev -- --port 3001` to run beside another)
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build

Scripts must run on Windows, macOS and Linux: use Node scripts in `scripts/` rather than shell commands in `package.json`, `path.join` rather than hard-coded separators, and no symlinks.

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utilities or scoped CSS; avoid inline styles unless behavior needs dynamic values
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography exactly
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure
```
src/                # Template app (kept clean; copied into each new site)
  app/              # Next.js routes
  components/ui/    # shadcn/ui primitives
  lib/utils.ts      # cn() utility (shadcn)
  types/            # TypeScript interfaces
  hooks/            # Custom React hooks
public/             # Template static files
scripts/
  new-site.mjs      # Creates sites/<site>/ from the template (cross-platform Node)
  new-site.test.mjs # Its tests (npm test)
sites/
  <site>/           # One standalone Next.js app per cloned site
    src/app/        # That site's routes
    src/components/ # That site's components, including extracted SVGs
    public/         # That site's images, fonts, video and other assets
    docs/research/  # Page brief, asset map, and inspection evidence
    docs/design-references/ # Source and comparison screenshots
    scripts/        # Asset download scripts
docs/design-references/ # Template README images
.agents/
  skills/
    clone-website/  # Canonical cross-agent cloning workflow
.claude/
  commands/
    clone-website.md # Thin Claude Code invocation bridge
```

## Agent Workflow
- Edit `.agents/skills/clone-website/` for cloning-workflow changes. It is the canonical skill used by Codex, Cursor, and OpenCode.
- Keep `.claude/commands/clone-website.md` as a thin Claude Code bridge to the canonical skill; do not duplicate the workflow there.
- Template changes (scaffold, configs, dependencies) go in the root app; existing site apps keep the copy they were created from.
