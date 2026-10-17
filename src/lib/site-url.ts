export function parseSiteUrl(value: string | undefined): URL {
  if (!value) throw new Error("SITE_URL is required. Set an explicit origin in the environment.");
  const invalid = () => new Error(
    "SITE_URL must be an HTTP(S) origin without credentials, paths, query or fragment. Public origins require HTTPS.",
  );
  const match = /^(https?):\/\/(\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::([0-9]{1,5}))?\/?$/i.exec(value);
  if (!match || match[0] !== value) throw invalid();
  let url: URL;
  try { url = new URL(value); } catch { throw invalid(); }
  if (match[3] && (Number(match[3]) < 1 || Number(match[3]) > 65535)) throw invalid();
  const host = match[2].toLowerCase();
  if (!host.startsWith("[") && host.split(".").some(label => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw invalid();
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(host);
  if (url.protocol === "http:" && !local) throw invalid();
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw invalid();
  return url;
}

export function getSiteUrl(environment: Readonly<Record<string, string | undefined>> = process.env): URL {
  return parseSiteUrl(environment.SITE_URL);
}

