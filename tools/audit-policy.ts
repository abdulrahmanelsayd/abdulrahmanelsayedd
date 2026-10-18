type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue =>
  !!value && typeof value === "object" && !Array.isArray(value);
const advisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const chain: Record<string, string> = {
  "eslint-config-next": "@next/eslint-plugin-next",
  "@next/eslint-plugin-next": "fast-glob",
  "fast-glob": "micromatch",
  "micromatch": "braces",
};
const known = [...Object.keys(chain), "braces"];
const reject = (reason: string): never => {
  throw new Error("Dependency audit rejected: " + reason);
};

/** Keep the one reviewed development exception visible; never allow new findings. */
export function reviewDependencyAudit(report: unknown, lock: unknown) {
  if (!object(report) || report.error || report.auditReportVersion !== 2 || !object(report.vulnerabilities) ||
      !object(report.metadata) || !object(report.metadata.vulnerabilities) || !object(lock) || !object(lock.packages)) {
    return reject("missing or failed audit/lock data");
  }
  const findings = Object.entries(report.vulnerabilities);
  if (report.metadata.vulnerabilities.total !== findings.length) return reject("inconsistent finding count");
  if (!findings.length) return {status:"clean",packages:[] as string[]};
  if (findings.length !== known.length || findings.some(([name])=>!known.includes(name))) return reject("unreviewed dependency finding");
  const root = lock.packages[""];
  if (!object(root) || !object(root.devDependencies) || !root.devDependencies["eslint-config-next"]) return reject("lint tool is not a development dependency");
  const productionDependencies = root.dependencies;
  if (object(productionDependencies) && known.some(name=>name in productionDependencies)) return reject("reviewed toolchain entered production dependencies");
  for (const [name, finding] of findings) {
    if (!object(finding) || finding.name !== name || finding.severity !== "high" || !Array.isArray(finding.nodes) || !finding.nodes.length || !Array.isArray(finding.via) || finding.via.length !== 1) return reject("changed finding: "+name);
    for (const node of finding.nodes) {
      const installed = typeof node === "string" ? lock.packages[node] : undefined;
      if (!object(installed) || installed.dev !== true || (name === "braces" && installed.version !== "3.0.3")) return reject("unreviewed or production node: "+name);
    }
    const via = finding.via[0];
    if (name === "braces") {
      if (!object(via) || via.url !== advisory || via.name !== "braces" || via.range !== "<=3.0.3" || via.severity !== "high") return reject("changed braces advisory");
    } else if (via !== chain[name]) return reject("changed dependency chain: "+name);
    const fix = finding.fixAvailable;
    // npm currently proposes downgrading Next's lint configuration two majors.
    // A different or nonbreaking fix must be reviewed and applied, not ignored.
    if (fix !== false && !(object(fix) && fix.name === "eslint-config-next" && fix.version === "14.2.35" && fix.isSemVerMajor === true)) return reject("a different fix is available: "+name);
  }
  return {status:"known-development-exception",packages:known,advisory,reason:"Unpatched stack-exhaustion parser in the dev-only Next lint chain. Patterns are repository-owned; production audit remains a separate blocking check. This is an explicit exception, not zero vulnerabilities."};
}
