#!/usr/bin/env node
// Scaffold a standalone Next.js app for one cloned site under clones/<name>.
// Usage: npm run new-clone <name>      (works the same in PowerShell, cmd and bash)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((a) => a !== "--");
const raw = args[0];

if (!raw || raw === "-h" || raw === "--help") {
  console.log("Usage: npm run new-clone <name>\nCreates clones/<name>/ as its own Next.js app.");
  process.exit(raw ? 0 : 1);
}

const name = raw
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

if (!name) {
  console.error(`"${raw}" does not contain any letters or digits to name the folder.`);
  process.exit(1);
}

const dest = path.join(root, "clones", name);
if (fs.existsSync(dest)) {
  console.error(`clones/${name} already exists. Pick another name or work inside it.`);
  process.exit(1);
}

// Scaffold files only. Never copy installs, build output or other clones.
const files = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "eslint.config.mjs",
  "postcss.config.mjs",
  "components.json",
  ".gitignore",
  ".nvmrc",
];
const dirs = ["src", "public"];
const skip = new Set(["node_modules", ".next", "sites"]);

fs.mkdirSync(dest, { recursive: true });
for (const f of files) {
  const from = path.join(root, f);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dest, f));
}
for (const d of dirs) {
  fs.cpSync(path.join(root, d), path.join(dest, d), {
    recursive: true,
    filter: (src) => !skip.has(path.basename(src)),
  });
}

// Own package name, so npm and Next treat it as a separate app.
const pkgName = `clone-${name}`;
for (const f of ["package.json", "package-lock.json"]) {
  const p = path.join(dest, f);
  if (!fs.existsSync(p)) continue;
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  json.name = pkgName;
  if (json.packages?.[""]) json.packages[""].name = pkgName;
  if (f === "package.json") {
    delete json.repository;
    delete json.homepage;
    delete json.bugs;
    delete json.scripts["new-clone"];
  }
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n");
}

// The root stylesheet skips clones/; that line means nothing inside a clone.
const css = path.join(dest, "src", "app", "globals.css");
if (fs.existsSync(css)) {
  fs.writeFileSync(
    css,
    fs
      .readFileSync(css, "utf8")
      .replace(/\/\* Cloned sites in clones\/[^\n]*\n@source not "[^"]*";\n\n?/, ""),
  );
}

// Pin the app root to this folder. Without it Next sees the template's
// lockfile one level up and treats the template as the workspace root.
fs.writeFileSync(
  path.join(dest, "next.config.ts"),
  `import path from "node:path";
import type { NextConfig } from "next";

const appRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: appRoot,
  turbopack: { root: appRoot },
};

export default nextConfig;
`,
);

fs.writeFileSync(
  path.join(dest, "README.md"),
  `# ${name}

Cloned site, built as its own Next.js app from the website cloner template.

\`\`\`bash
npm install
npm run dev
npm run check
\`\`\`

Site files live in \`src/app/\`, \`src/components/sites/${name}/\`, \`public/sites/${name}/\` and \`docs/research/${name}/\`.
`,
);
fs.mkdirSync(path.join(dest, "docs", "research", name), { recursive: true });
fs.writeFileSync(path.join(dest, "docs", "research", name, ".gitkeep"), "");

const rel = path.relative(root, dest).split(path.sep).join("/");
console.log(`Created ${rel}

Next:
  cd ${rel}
  npm install
  npm run dev`);
