import { readFile } from "node:fs/promises";

const host = "hsstrategiccfo.com";
const key = "9f4a6c18d2e74b35a8c90f1e6d3b7a52";
const keyLocation = `https://${host}/${key}.txt`;
const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
const urlList = [...sitemap.matchAll(/<loc>(https:\/\/hsstrategiccfo\.com\/[^<]*)<\/loc>/g)].map(
  ([, url]) => url,
);

if (!urlList.length) {
  throw new Error("No hsstrategiccfo.com URLs were found in sitemap.xml");
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});

if (!response.ok) {
  throw new Error(`IndexNow submission failed: ${response.status} ${await response.text()}`);
}

console.log(`Submitted ${urlList.length} URLs to IndexNow (${response.status}).`);
