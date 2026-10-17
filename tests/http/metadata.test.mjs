// Run against a production preview:
// SITE_URL=https://abdulrahmanelsayed.xyz TEST_BASE_URL=http://127.0.0.1:PORT node --test tests/http/metadata.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { parse } = require("next/dist/compiled/node-html-parser");
const preview = new URL(process.env.TEST_BASE_URL);
const site = new URL(process.env.SITE_URL);
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(preview.hostname), "Use a local preview");
assert.equal(site.protocol, "https:");
assert.ok(!["127.0.0.1", "localhost", "[::1]"].includes(site.hostname), "Metadata must use a public origin");

// Expected public metadata, independent of the application's metadata objects.
const pages = [
  { route: "/", title: "Abdulrahman Elsayed | Web Designer & Developer", description: "Abdulrahman Elsayed is a web designer and developer based in Egypt. Explore business websites, online stores and web design and development services." },
  { route: "/work", title: "Work | Abdulrahman Elsayed", description: "Explore a selection of Abdulrahman Elsayed's web projects for businesses across 3 countries." },
  { route: "/about", title: "About | Abdulrahman Elsayed", description: "Web designer and developer in Egypt, with 3+ years across 3+ countries. Design, development and technical SEO handled together, from brief to launch." },
  { route: "/services", title: "Services | Abdulrahman Elsayed", description: "Web design and development for business websites and online stores. Responsive interfaces, CMS, custom features, integrations and technical SEO, from brief to launch." },
  { route: "/contact", title: "Contact | Abdulrahman Elsayed", description: "Discuss a website project with Abdulrahman Elsayed. Prepare an email draft, find contact details and answers to common questions." },
];
const image = new URL("/images/social-preview.jpg", site).href;
const imageAlt = "Abdulrahman Elsayed — Web Designer & Developer based in Egypt, with the AE monogram.";
const values = (dom, selector, attribute) => dom.querySelectorAll(selector).map(element => element.getAttribute(attribute));

async function request(route, name, userAgent = "Mozilla/5.0 ReleaseMetadataCheck") {
  const response = await fetch(new URL(route, preview), {
    redirect: "manual", headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  if (process.env.TEST_OUTPUT_DIR) {
    await mkdir(process.env.TEST_OUTPUT_DIR, { recursive: true });
    await writeFile(path.join(process.env.TEST_OUTPUT_DIR, name + ".body"), body);
    await writeFile(path.join(process.env.TEST_OUTPUT_DIR, name + ".json"), JSON.stringify({ route, status: response.status, userAgent, headers: Object.fromEntries(response.headers) }, null, 2));
  }
  return { response, body, dom: parse(body) };
}

for (const agent of ["Mozilla/5.0 ReleaseMetadataCheck", "Twitterbot/1.0"]) {
  for (const page of pages) {
    test(`${page.route}: canonical, Open Graph and preserved metadata (${agent})`, async () => {
      const name = (page.route === "/" ? "home" : page.route.slice(1)) + (agent.startsWith("Twitterbot") ? "-twitterbot" : "");
      const { response, dom } = await request(page.route, name, agent);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /^text\/html\b/i);
      const head = dom.querySelector("head");
      assert.ok(head);
      // Next's metadata URL resolver emits the origin without the root's trailing slash.
      const url = page.route === "/" ? site.origin : new URL(page.route, site).href;
      assert.deepEqual(values(dom, 'link[rel="canonical"]', "href"), [url]);
      assert.deepEqual(values(head, 'link[rel="canonical"]', "href"), [url]);
      assert.deepEqual(values(dom, 'meta[property="og:url"]', "content"), [url]);
      assert.deepEqual(values(head, 'meta[property="og:url"]', "content"), [url]);
      assert.deepEqual(dom.querySelectorAll("title").map(element => element.text), [page.title]);
      for (const [key, expected] of [
        ["description", page.description], ["twitter:card", "summary_large_image"],
        ["twitter:title", page.title], ["twitter:description", page.description],
        ["twitter:image", image], ["twitter:image:alt", imageAlt],
      ]) assert.deepEqual(values(dom, `meta[name="${key}"]`, "content"), [expected], key);
      for (const [key, expected] of [
        ["og:title", page.title], ["og:description", page.description],
        ["og:image", image], ["og:image:alt", imageAlt], ["og:type", "website"],
        ["og:site_name", "Abdulrahman Elsayed"], ["og:locale", "en_US"],
      ]) assert.deepEqual(values(dom, `meta[property="${key}"]`, "content"), [expected], key);
      assert.ok(values(dom, 'meta[name="robots"]', "content").every(value => !/\bnoindex\b/i.test(value)));
    });
  }
}

test("robots.txt returns text, allows the public site and identifies its sitemap", async () => {
  const { response, body } = await request("/robots.txt", "robots");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/plain\b/i);
  assert.deepEqual(body.trim().split(/\r?\n/).filter(Boolean), ["User-Agent: *", "Allow: /", "Sitemap: " + new URL("/sitemap.xml", site).href]);
});

test("sitemap.xml returns exactly the five distinct public HTTPS URLs, without invented dates", async () => {
  const { response, body, dom } = await request("/sitemap.xml", "sitemap");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^(?:application|text)\/xml\b/i);
  assert.equal(dom.querySelector("urlset")?.getAttribute("xmlns"), "http://www.sitemaps.org/schemas/sitemap/0.9");
  const urls = dom.querySelectorAll("urlset > url > loc").map(element => element.text);
  assert.equal(dom.querySelectorAll("urlset > url").length, 5);
  assert.equal(new Set(urls).size, 5);
  assert.deepEqual(urls, pages.map(page => new URL(page.route, site).href));
  assert.equal(dom.querySelectorAll("loc").length, 5);
  assert.doesNotMatch(body, /<lastmod\b/i);
});

test("a missing page remains HTTP 404 and noindex without a home canonical", async () => {
  const { response, dom } = await request("/release-page-does-not-exist", "not-found");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /^text\/html\b/i);
  assert.ok(values(dom, 'meta[name="robots"]', "content").some(value => /\bnoindex\b/i.test(value)));
  assert.deepEqual(values(dom, 'link[rel="canonical"]', "href"), []);
  assert.deepEqual(values(dom, 'meta[property="og:url"]', "content"), []);
});

test("the public share image is the delivered 1200x630 JPEG", async () => {
  const response = await fetch(new URL("/images/social-preview.jpg", preview));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^image\/jpeg\b/i);
  const bytes = Buffer.from(await response.arrayBuffer());
  const { default: sharp } = await import("sharp");
  const { readFile } = await import("node:fs/promises");
  assert.deepEqual(bytes, await readFile(new URL("../../public/images/social-preview.jpg", import.meta.url)));
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 1200); assert.equal(metadata.height, 630);
});
