#!/usr/bin/env node
// Create a standalone Next.js app for one cloned site in sites/<name>/.
//
//   npm run new-site -- <url-or-name> [--name <name>] [--source <url>] [--no-install]
//   node scripts/new-site.mjs <url-or-name> [...]   (same, without npm in between)
//
// The new folder is a copy of this template's app (src/, public/, configs, lockfile) with
// its own package.json, so it installs, runs and builds on its own and the root app stays
// untouched. Plain Node APIs only (no shell commands, symlinks or hard-coded separators),
// so it behaves the same on Windows, macOS and Linux.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TEMPLATE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Everything a site app needs to install, run, check and deploy on its own.
export const TEMPLATE_DIRS = ["src", "public"];
export const TEMPLATE_FILES = [
  ".dockerignore",
  ".gitignore",
  ".nvmrc",
  "components.json",
  "docker-compose.yml",
  "Dockerfile",
  "Dockerfile.dev",
  "eslint.config.mjs",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
];

// Root-only scripts: the generator and its test stay in the template.
const ROOT_ONLY_SCRIPTS = ["new-site", "test"];
const SITE_CHECK_SCRIPT = "npm run lint && npm run typecheck && npm run build";
// The root app tells Tailwind not to scan sites/; a site app has no sites/ folder.
const ROOT_ONLY_CSS = /^@source not "\.\.\/\.\.\/sites";\r?\n/m;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/;
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 64;

export class UsageError extends Error {}

/** Returns the URL when `value` is an http(s) URL, else null. */
export function parseSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** "https://www.Example.com:8080/pricing" -> "example-com-8080" */
export function nameFromUrl(url) {
  const host = url.hostname.replace(/^www\./i, "");
  return slugify(url.port ? `${host}-${url.port}` : host);
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_NAME_LENGTH)
    .replace(/-+$/g, "");
}

/** Throws a UsageError unless `name` is a folder name that is safe on every OS. */
export function validateName(name) {
  if (!name) throw new UsageError("Site name is empty.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new UsageError(`Site name "${name}" is longer than ${MAX_NAME_LENGTH} characters.`);
  }
  if (!NAME_PATTERN.test(name)) {
    throw new UsageError(
      `Site name "${name}" must use lowercase letters, digits and single hyphens (e.g. "example-com").`,
    );
  }
  if (WINDOWS_RESERVED.test(name)) {
    throw new UsageError(`Site name "${name}" is a reserved device name on Windows; pick another.`);
  }
  return name;
}

export function parseArgs(argv) {
  const options = { input: undefined, name: undefined, source: undefined, install: true, sitesDir: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new UsageError(`${arg} needs a value.`);
      i += 1;
      return value;
    };
    if (arg === "--no-install") options.install = false;
    else if (arg === "--name") options.name = next();
    else if (arg === "--source") options.source = next();
    else if (arg === "--sites-dir") options.sitesDir = next();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--")) throw new UsageError(`Unknown option ${arg}.`);
    else if (options.input === undefined) options.input = arg;
    else throw new UsageError(`Unexpected argument "${arg}".`);
  }
  return options;
}

/** Works out the site's folder name and source URL from the parsed arguments. */
export function resolveSite({ input, name, source }) {
  const inputUrl = input ? parseSourceUrl(input) : null;
  let sourceUrl = null;
  if (source) {
    sourceUrl = parseSourceUrl(source);
    if (!sourceUrl) throw new UsageError(`--source "${source}" is not an http(s) URL.`);
  } else if (inputUrl) {
    sourceUrl = inputUrl;
  }
  let siteName = name;
  if (!siteName && input) siteName = inputUrl ? nameFromUrl(inputUrl) : input;
  if (!siteName && sourceUrl) siteName = nameFromUrl(sourceUrl);
  if (!siteName) throw new UsageError("Give a source URL or a site name.");
  return { name: validateName(siteName), source: sourceUrl ? sourceUrl.href : null };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function rootAgentRulesBlock(templateRoot) {
  const agents = fs.readFileSync(path.join(templateRoot, "AGENTS.md"), "utf8");
  const match = agents.match(/<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->/);
  return match ? `${match[0]}\n\n` : "";
}

function sitePage(name, source) {
  const label = JSON.stringify(source ?? name);
  return `export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        Clone of <code className="font-mono text-foreground">{${label}}</code> not yet built.
      </p>
    </main>
  );
}
`;
}

function siteReadme(name, source) {
  return `# ${name}

${source ? `Clone of <${source}>, built` : "Built"} with the AI Website Cloner Template. This folder is a standalone Next.js app: it has its own \`package.json\`, lockfile and \`node_modules\`, and does not depend on the template app around it.

## Commands

Run these inside this folder (\`sites/${name}\`):

\`\`\`bash
npm install       # first time only (new-site already ran npm ci)
npm run dev       # dev server; add -- --port 3001 when another app uses 3000
npm run check     # lint + typecheck + production build
\`\`\`

## Layout

\`\`\`
src/app/              # Routes for this site
src/components/       # This site's components (ui/ holds shadcn/ui primitives)
public/               # This site's images, fonts, video and other assets
docs/research/        # Page brief, asset map and inspection evidence
docs/design-references/ # Source and comparison screenshots
scripts/              # Asset download scripts
\`\`\`

To deploy it on its own, use this folder as the project root (for example Vercel's Root Directory setting, or \`docker compose up app --build\` from here).
`;
}

function siteAgents(name, templateRoot) {
  return `${rootAgentRulesBlock(templateRoot)}# ${name}

A standalone Next.js app for one cloned site, created by \`npm run new-site\` in the template root two folders up. Follow the template's \`AGENTS.md\` and \`.agents/skills/clone-website/SKILL.md\` there; run every command for this site from this folder. Keep this site's routes, components, assets, research and screenshots inside this folder.
`;
}

/**
 * Creates sites/<name>/ (or <sitesDir>/<name>/) from the template. Returns the new folder.
 * Refuses to touch an existing folder.
 */
export function createSite({ name, source = null, sitesDir, templateRoot = TEMPLATE_ROOT }) {
  validateName(name);
  const targetParent = path.resolve(sitesDir ?? path.join(templateRoot, "sites"));
  const target = path.join(targetParent, name);
  if (fs.existsSync(target)) {
    throw new UsageError(`${target} already exists. Pick another name or work in that folder.`);
  }
  fs.mkdirSync(targetParent, { recursive: true });
  fs.mkdirSync(target);

  try {
    for (const dir of TEMPLATE_DIRS) {
      fs.cpSync(path.join(templateRoot, dir), path.join(target, dir), { recursive: true });
    }
    for (const file of TEMPLATE_FILES) {
      fs.copyFileSync(path.join(templateRoot, file), path.join(target, file));
    }

    const pkgFile = path.join(target, "package.json");
    const pkg = readJson(pkgFile);
    const sitePkg = {
      name,
      version: "0.1.0",
      private: true,
      description: source ? `Clone of ${source}` : `Cloned site ${name}`,
      engines: pkg.engines,
      scripts: { ...pkg.scripts, check: SITE_CHECK_SCRIPT },
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies,
    };
    for (const script of ROOT_ONLY_SCRIPTS) delete sitePkg.scripts[script];
    writeJson(pkgFile, sitePkg);

    const lockFile = path.join(target, "package-lock.json");
    const lock = readJson(lockFile);
    lock.name = name;
    lock.version = sitePkg.version;
    if (lock.packages?.[""]) {
      lock.packages[""].name = name;
      lock.packages[""].version = sitePkg.version;
      delete lock.packages[""].license;
    }
    writeJson(lockFile, lock);

    const cssFile = path.join(target, "src", "app", "globals.css");
    fs.writeFileSync(cssFile, fs.readFileSync(cssFile, "utf8").replace(ROOT_ONLY_CSS, ""));

    const composeFile = path.join(target, "docker-compose.yml");
    fs.writeFileSync(
      composeFile,
      fs.readFileSync(composeFile, "utf8").replaceAll("ai-website-cloner", `${name}-clone`),
    );

    writeText(path.join(target, "src", "app", "page.tsx"), sitePage(name, source));
    writeText(path.join(target, "README.md"), siteReadme(name, source));
    writeText(path.join(target, "AGENTS.md"), siteAgents(name, templateRoot));
    writeText(path.join(target, "CLAUDE.md"), "@AGENTS.md\n");
    for (const dir of ["docs/research", "docs/design-references", "scripts"]) {
      writeText(path.join(target, ...dir.split("/"), ".gitkeep"), "");
    }
  } catch (error) {
    fs.rmSync(target, { recursive: true, force: true });
    throw error;
  }
  return target;
}

/** Runs `npm ci` in the new folder. One command string + shell works for npm.cmd on Windows. */
export function installSite(target) {
  const result = spawnSync("npm ci --no-audit --no-fund", { cwd: target, stdio: "inherit", shell: true });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const HELP = `Create a standalone app for one cloned site in sites/<name>/.

Usage:
  npm run new-site -- <url-or-name> [--name <name>] [--source <url>] [--no-install]
  node scripts/new-site.mjs <url-or-name> [options]

  <url-or-name>   Source URL (the name is derived from its host) or a folder name
  --name <name>   Folder name to use instead of the derived one
  --source <url>  Source URL to record when <url-or-name> is a name
  --no-install    Skip npm ci in the new folder

Examples:
  npm run new-site -- https://www.example.com      -> sites/example-com
  npm run new-site -- https://example.com --name example-docs
`;

export function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.help || argv.length === 0) {
      console.log(HELP);
      return options.help ? 0 : 1;
    }
    const site = resolveSite(options);
    const target = createSite({ ...site, sitesDir: options.sitesDir });
    const shown = path.relative(process.cwd(), target) || ".";
    console.log(`Created ${shown}${site.source ? ` for ${site.source}` : ""}.`);
    if (options.install) {
      console.log(`Installing dependencies in ${shown} ...`);
      const status = installSite(target);
      if (status !== 0) {
        console.error(`npm ci failed in ${shown}. Run "npm install" there, then "npm run check".`);
        return status;
      }
    }
    // One command per line: Windows PowerShell 5.1 has no "&&".
    const steps = [`cd ${shown}`, ...(options.install ? [] : ["npm install"]), "npm run dev"];
    console.log(`\nNext:\n${steps.map((step) => `  ${step}`).join("\n")}`);
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`new-site: ${error.message}\n\n${HELP}`);
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
