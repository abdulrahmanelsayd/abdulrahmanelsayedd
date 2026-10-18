# Abdulrahman portfolio

Use Node.js 24.20.x and npm 11.19.x (see `.node-version` and `package.json`).

Copy `.env.example` to `.env.local`, or export its only application setting:
`SITE_URL=https://abdulrahmanelsayed.xyz`. This is the public metadata origin.
A local preview does not publish the site.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Build/typegen use this copy's installed Next.js and reject linked project/output
paths and redirected output configuration. No stage manifest is required.
`npm run dev` starts development mode.

With the production server running in another terminal:

```sh
npx playwright install chromium
npm run test:release
npm run test:gallery
```

The release check verifies served HTML and JavaScript against this build, then
runs HTTP metadata checks, desktop/mobile journeys and current regressions.
Results and the build identity are written to `test-results/release`.
It fails if the preview differs from this copy's production build.
Tests prepare drafts and intercept external activations; they do not send mail.

Optional test settings:

- `TEST_BASE_URL`: local production origin; default `http://127.0.0.1:3000`.
- `TEST_OUTPUT_DIR`: result directory; default `test-results/release`.
- `PLAYWRIGHT_EXECUTABLE_PATH`: explicitly selected compatible Chromium.

The gallery supplement checks mouse/touch drags and native vertical scrolling.
After a correction, `npm run test:release -- --last-failed` repeats HTTP checks
and selects the preceding failed browser cases.

The application itself only requires `SITE_URL`.
`npm run test:regression` runs retained extended regressions outside the bounded
release suite. The external `test-review.csv` records scope and exclusions.
`npm run check:install` checks local dependency resolution and locked versions.

Do not ship `node_modules`, `.next`, generated `next-env.d.ts`, caches, test
results, local protection policies or `.env.local`. Install in the target copy.

Netlify reads the build command, output directory, npm version and public
`SITE_URL` from `netlify.toml`; `.node-version` pins Node.js. Use Netlify's
automatic Next.js integration so image optimization and route handling remain
available. Verify the hosted preview before connecting the custom domain.

GitHub Actions checks the locked install, lint, types, unit tests, production
dependency audit and build. It then starts that build and checks the desktop
and mobile release journeys, HTTP metadata and gallery gestures. These checks
run on pushes to `main` and pull requests. They do not send email.

The full dependency audit currently reports the development-only `braces`
advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
which has no patched release. Its lint dependency chain uses repository-owned
patterns and is absent from the reviewed production traces. The production
audit is a blocking CI check. Keep the full audit enabled and revisit this
exception when the dependency chain, pattern inputs or upstream advisory changes.
`npm run audit:dependencies` runs the full audit and accepts only this exact
development chain and advisory. CI rejects new findings, production nodes,
changed versions or a different available fix. The exception stays visible.

`npx playwright install firefox webkit` installs the optional compatibility
engines. With the production server running, use
`npx playwright test --config playwright.compatibility.config.ts` for desktop
and mobile viewport journeys. Firefox mobile viewport tests are not Firefox
Android; WebKit on Linux is not a real Safari or iPhone device test.
