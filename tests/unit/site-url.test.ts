import assert from "node:assert/strict";
import { test } from "node:test";
import { getSiteUrl, parseSiteUrl } from "../../src/lib/site-url.ts";

const accepted = [
  ["http://127.0.0.1:3060", "http://127.0.0.1:3060"],
  ["http://localhost:3060/", "http://localhost:3060"],
  ["http://[::1]:3060", "http://[::1]:3060"],
  ["https://example.com", "https://example.com"],
  ["https://example.com:8443/", "https://example.com:8443"],
];
for (const [input, expected] of accepted) {
  test("SITE_URL accepts origin " + input, () => assert.equal(parseSiteUrl(input).origin, expected));
}

const rejected = [
  "", "example.com", "/", "https://", "ftp://example.com", "http://example.com", "http://192.168.1.5:3060",
  "http://127.1:3060", "http://0.0.0.0:3060", "http://localhost.evil.test", " http://127.0.0.1:3060",
  "https://example.com ", "https://user:pass@example.com", "https://@example.com", "https://user@example.com",
  "https://example.com/work", "https://example.com/../", "https://example.com//", "https://example.com?x=1",
  "https://example.com?", "https://example.com#x", "https://example.com#", "https://example.com:65536",
  "https://example.com:0", "https://exa..mple.com", "https://-example.com", "https://%65xample.com",
  "https://example.com\\path", "https://example.com\n", "https://example.com/\t",
];
for (const input of rejected) {
  test("SITE_URL rejects " + JSON.stringify(input), () => assert.throws(() => parseSiteUrl(input), /SITE_URL/));
}

test("missing SITE_URL fails explicitly, including in a production environment", () => {
  assert.throws(() => getSiteUrl({ NODE_ENV: "production" }), /SITE_URL is required/);
});

test("production permits an explicitly configured local origin", () => {
  assert.equal(getSiteUrl({ SITE_URL: "http://127.0.0.1:3060", NODE_ENV: "production" }).origin, "http://127.0.0.1:3060");
});
