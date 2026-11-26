---
name: clone-website
description: Rebuild existing web pages as working local code, matching their real content, assets, responsive layout, and interactions. Use for website cloning, replication, or reverse engineering, including Framer sites and animated pages.
---

# Clone a website

Recreate the supplied pages in a site app of their own. Match the source before adding a new design direction. Deliver working, editable code: screenshots, iframes, and downloaded production bundles are references, not the implementation.

## 0. Pick the site folder

In this template every cloned site is its own standalone Next.js app in `sites/<site>/`, with its own `package.json`, lockfile, and `node_modules`. The root app is the clean template: never build a clone into the root `src/`, `public/`, or `docs/research/`, and leave the root files unchanged.

- **New site:** from the template root run `npm run new-site -- <source-url>`. It copies the template app to `sites/<host>/` (for example `https://www.example.com` → `sites/example-com/`) and runs `npm ci` there. Pass `--name <site>` for another folder name. Flags may be dropped by some shells between npm and the script; `node scripts/new-site.mjs <source-url> --name <site>` passes them directly on every OS.
- **More pages from a site that already has a folder:** work in that folder; do not create a second one.
- **Different origins:** one folder per origin, unless the user asks for a combined app.

From here on, "the app" means `sites/<site>/`. Run every command (`npm run dev`, `npm run check`, asset scripts) inside it, and give all paths relative to it. Use Node or the agent's own tools for file work rather than shell-specific commands, so the workflow runs the same on Windows, macOS, and Linux.

## 1. Map the work

Read project instructions, the site app's framework/scripts, and its existing routes. Open the source URLs with the available browser. Prefer direct HTTP, asset tools, or APIs for extraction when practical; use the browser to establish appearance and behavior.

Record a short source-to-local route map and the files each page owns. Inside the site app use `src/app/` for routes, `src/components/` for components (`src/components/ui/` holds the shadcn/ui primitives), `public/` for assets, `docs/research/` for the page brief and evidence, `docs/design-references/` for screenshots, and `scripts/` for download scripts. Give pages and downloads distinct names; add a port or URL hash when readable names collide.

- The first clone in a site app replaces its untouched placeholder homepage.
- Preserve source pathnames for multiple pages from one origin. Query/fragment variations usually represent states of the same route; reproduce those states.
- Preserve existing authored routes/assets. Update them when requested; resolve unrequested route collisions before replacing anything.
- When adding pages to an existing site app, extend its layout and global styles without replacing the styles used by existing pages.
- A combined app for several origins (only when asked) needs distinct route prefixes and scoped fonts, styles, and layout.
- Escape literal URL segments that conflict with framework syntax (`_`, `@`, brackets, parentheses) using its supported mechanism, then verify the actual requested URL.

Other site folders are useful references: compare them with the current source and record what was reused, but copy code into this site rather than importing across folders. Finish when every requested URL has a destination and file ownership is clear.

## 2. Observe before building

Inspect the whole page at desktop and mobile widths. Scroll top to bottom to load lazy media and reveal sticky/pinned scenes. Then exercise menus, tabs, accordions, carousels, hover states, and primary links. Distinguish changes driven by **scroll, click, hover, or time**; a click imitation of a scroll-driven section is a different product.

Treat each observation as one sample of a **rule**. Read declared values (computed styles, CSS variables, a library's live options) rather than inferring them from one rendering, and vary viewport width (including wider than the design), viewport height, input, and state until you know what drives each change. Drive the page with the inputs visitors use (wheel, touch, keyboard, pointer); scripted scrolling bypasses behavior attached to them, such as smooth scrolling.

Save source screenshots labeled with viewport, scroll position, and interaction state. Capture alternate-state content/assets. Keep one compact page brief: section order, typography, layout measurements, asset mapping, and interactions. Add section briefs only when they help independent builders.

Read [the inspection reference](references/inspection-guide.md) for extraction and state comparison. For **Framer-generated pages, sticky scenes, reveal animations, or animated media**, read [Framer and motion](references/framer-and-motion.md).

Use the source's real text and the files it actually loads: fonts, images, SVGs, and video. A same-named substitute from another provider or icon set has different metrics or shapes. Measure important geometry/computed styles. Inspect layered images and media elements before rebuilding a visual as HTML. Track source URL → local asset path and verify content type/dimensions: a `.png` URL may return AVIF.

Finish when every section and meaningful state has enough evidence to build, with unavailable details identified. A large DOM dump does not replace looking at the page.

## 3. Build a complete first pass

Establish fonts, page width, colors, assets, routes, page-wide behavior, and shared components first. Build each shared component with every observed state (hover, focus, breakpoints) so builders reuse it as-is. Reuse fitting components. Prefer CSS for layout/simple motion and an animation library when source behavior needs it.

Build coherent sections with real content. Delegate independent pages/sections after shared files have an owner. Give builders screenshots, relevant measurements/state notes, asset paths, destination files, and a concrete finish line. A concise brief with precise file references is enough; no fixed agent count or per-component paperwork is required.

Recreate in-scope interactions. Preserve real outbound destinations. Rewrite links to local routes when those routes are included; leave out-of-scope destinations pointing to the source and disclose them. Visible controls must perform the behavior they promise.

Run `npm run check` in the site folder after an integrated slice. Finish this pass when every requested section/route renders with actual assets and important controls work.

## 4. Compare, repair, repeat

Open source/local pages at the **same viewport, scroll position, and state**. Let fonts, media, and reveal animations settle. Review the whole page wherever step 2 found a rule changing, plus a viewport wider than the design; judge scroll and pointer behavior with real input. A side-by-side montage locates drift; full-size sections establish detail.

Fix the largest visible differences first: geometry, missing sections/layers, typography/wrapping, asset crop, then spacing and motion. Recheck affected views. Compare animated regions in initial, active, and settled states, including reverse scroll when relevant.

Exercise the real local workflow: navigation between cloned routes, mobile menu, tab/accordion states, carousel boundaries, primary actions, media controls, and observed scroll-linked transitions. Check runtime errors, missing assets, and horizontal overflow. When adding pages, verify existing routes still work. Use a few browser checks at these boundaries rather than assertions about class names.

Run `npm run check` inside the site folder, then `npm run check` at the template root to confirm the root app is still clean. Completion requires a successful build **and** rendered comparison. State remaining differences precisely instead of calling an unchecked result pixel-perfect.

## Deliver

Return the site folder, preview/run instructions (`cd sites/<site>` then `npm run dev`; add `-- --port 3001` when another app holds port 3000), the source-to-local route map, representative desktop/mobile comparisons, checks actually run, and remaining visual/functional gaps.
