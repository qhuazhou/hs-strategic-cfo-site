import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const rootPath = root.pathname;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

const htmlFiles = (await walk(rootPath)).filter((file) => extname(file) === ".html");
const routes = new Set(
  htmlFiles.map((file) => {
    const name = relative(rootPath, file).replace(/\\/g, "/");
    if (name === "index.html") return "/";
    return `/${name.replace(/\/index\.html$/, "").replace(/\.html$/, "")}`;
  }),
);
const errors = [];
const canonicalUrls = new Set();

for (const file of htmlFiles) {
  const name = relative(rootPath, file);
  const html = await readFile(file, "utf8");
  for (const [label, pattern] of [
    ["title", /<title>[^<]+<\/title>/],
    ["meta description", /<meta name="description" content="[^"]+">/],
    ["canonical", /<link rel="canonical" href="https:\/\/hsstrategiccfo\.com\/[^"]*">/],
    ["H1", /<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/],
  ]) {
    if (!pattern.test(html)) errors.push(`${name}: missing ${label}`);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  if (canonical) {
    if (canonicalUrls.has(canonical)) errors.push(`${name}: duplicate canonical ${canonical}`);
    canonicalUrls.add(canonical);
  }

  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch (error) {
      errors.push(`${name}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    const route = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    if (route.includes(".")) continue;
    if (!routes.has(route)) errors.push(`${name}: internal link has no page: ${href}`);
  }
}

const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
for (const canonical of canonicalUrls) {
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) errors.push(`sitemap missing ${canonical}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Audit passed: ${htmlFiles.length} pages, ${canonicalUrls.size} unique canonicals, valid JSON-LD, and no broken internal page links.`);
}
