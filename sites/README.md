# Cloned sites

Each folder here is one cloned site: a standalone Next.js app created from the template with

```bash
npm run new-site -- https://example.com   # run at the template root -> sites/example-com/
```

Run, check and deploy a site from its own folder (`cd sites/example-com`, then `npm run dev` or `npm run check`). The template app at the root ignores this folder in its lint, typecheck, Tailwind scan, build and Docker context.
