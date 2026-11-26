// Tests for scripts/new-site.mjs. Run with `npm test` (node:test, no extra dependencies).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

import {
  TEMPLATE_ROOT,
  UsageError,
  createSite,
  main,
  nameFromUrl,
  parseArgs,
  resolveSite,
  validateName,
} from "./new-site.mjs";

const tempRoots = [];
function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "new-site-test-"));
  tempRoots.push(dir);
  return dir;
}
after(() => {
  for (const dir of tempRoots) fs.rmSync(dir, { recursive: true, force: true });
});

const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");

describe("site names", () => {
  it("derives a folder name from a URL's host and port", () => {
    assert.equal(nameFromUrl(new URL("https://www.Example.com/pricing?x=1")), "example-com");
    assert.equal(nameFromUrl(new URL("http://localhost:8080/")), "localhost-8080");
    assert.equal(nameFromUrl(new URL("https://docs.my_site.io")), "docs-my-site-io");
  });

  it("accepts a URL, a name, or a name plus --source", () => {
    assert.deepEqual(resolveSite({ input: "https://example.com/a" }), {
      name: "example-com",
      source: "https://example.com/a",
    });
    assert.deepEqual(resolveSite({ input: "my-site" }), { name: "my-site", source: null });
    assert.deepEqual(resolveSite({ input: "https://example.com", name: "docs" }), {
      name: "docs",
      source: "https://example.com/",
    });
    assert.deepEqual(resolveSite({ input: "docs", source: "https://example.com" }), {
      name: "docs",
      source: "https://example.com/",
    });
  });

  it("rejects names that are unsafe as folders on Windows or elsewhere", () => {
    for (const bad of ["", "My Site", "a/b", "a\\b", "..", "con", "NUL", "lpt1", "trailing-", "a".repeat(65)]) {
      assert.throws(() => validateName(bad), UsageError, `expected "${bad}" to be rejected`);
    }
    assert.equal(validateName("example-com-2"), "example-com-2");
  });

  it("parses options and rejects unknown ones", () => {
    assert.deepEqual(parseArgs(["https://x.dev", "--no-install", "--name", "x"]), {
      input: "https://x.dev",
      name: "x",
      source: undefined,
      install: false,
      sitesDir: undefined,
    });
    assert.throws(() => parseArgs(["x", "--bogus"]), UsageError);
    assert.throws(() => parseArgs(["--name"]), UsageError);
  });
});

describe("createSite", () => {
  const sitesDir = tempDir();
  const target = createSite({ name: "example-com", source: "https://example.com/", sitesDir });

  it("creates a standalone app folder from the template", () => {
    assert.equal(target, path.join(sitesDir, "example-com"));
    for (const file of [
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "next.config.ts",
      "eslint.config.mjs",
      "postcss.config.mjs",
      "components.json",
      ".gitignore",
      "Dockerfile",
      "README.md",
      "AGENTS.md",
      "CLAUDE.md",
      path.join("src", "app", "layout.tsx"),
      path.join("src", "components", "ui", "button.tsx"),
      path.join("src", "lib", "utils.ts"),
      path.join("docs", "research", ".gitkeep"),
      path.join("scripts", ".gitkeep"),
    ]) {
      assert.ok(fs.existsSync(path.join(target, file)), `missing ${file}`);
    }
    assert.ok(!fs.existsSync(path.join(target, "sites")), "a site must not contain sites/");
    assert.ok(!fs.existsSync(path.join(target, "node_modules")), "--no-install equivalent must not install");
  });

  it("gives the site its own package identity without the root-only scripts", () => {
    const pkg = JSON.parse(read(target, "package.json"));
    const rootPkg = JSON.parse(read(TEMPLATE_ROOT, "package.json"));
    assert.equal(pkg.name, "example-com");
    assert.equal(pkg.private, true);
    assert.equal(pkg.description, "Clone of https://example.com/");
    assert.deepEqual(pkg.dependencies, rootPkg.dependencies);
    assert.deepEqual(pkg.devDependencies, rootPkg.devDependencies);
    assert.equal(pkg.scripts["new-site"], undefined);
    assert.equal(pkg.scripts.test, undefined);
    assert.equal(pkg.scripts.check, "npm run lint && npm run typecheck && npm run build");

    const lock = JSON.parse(read(target, "package-lock.json"));
    assert.equal(lock.name, "example-com");
    assert.equal(lock.packages[""].name, "example-com");
  });

  it("drops the root-only Tailwind exclusion and replaces the placeholder page", () => {
    assert.match(read(TEMPLATE_ROOT, "src", "app", "globals.css"), /@source not "\.\.\/\.\.\/sites";/);
    assert.doesNotMatch(read(target, "src", "app", "globals.css"), /@source not/);
    assert.match(read(target, "src", "app", "page.tsx"), /https:\/\/example\.com\//);
    assert.doesNotMatch(read(target, "docker-compose.yml"), /ai-website-cloner/);
  });

  it("handles CRLF checkouts (git autocrlf on Windows)", () => {
    const crlfRoot = tempDir();
    fs.cpSync(TEMPLATE_ROOT, crlfRoot, {
      recursive: true,
      filter: (src) => !/[\\/](node_modules|\.next|\.git|sites)$/.test(src),
    });
    const css = path.join(crlfRoot, "src", "app", "globals.css");
    fs.writeFileSync(css, read(css).replace(/\r?\n/g, "\r\n"));
    const site = createSite({ name: "crlf-site", sitesDir: path.join(crlfRoot, "sites"), templateRoot: crlfRoot });
    assert.doesNotMatch(read(site, "src", "app", "globals.css"), /@source not/);
  });

  it("refuses to overwrite an existing folder", () => {
    assert.throws(() => createSite({ name: "example-com", sitesDir }), UsageError);
    assert.ok(fs.existsSync(path.join(target, "package.json")), "existing site must be left intact");
  });

  it("returns a usage error code from the CLI instead of throwing", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      assert.equal(main(["Not A Valid Name", "--no-install", "--sites-dir", sitesDir]), 1);
    } finally {
      console.error = originalError;
    }
  });
});
