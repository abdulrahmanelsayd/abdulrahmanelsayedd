import { waitForRuntime } from "../support/runtime-ready";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { identity } from "../../src/content/identity";

const name = (page: Page) => page.locator('input[name="name"]');
const email = (page: Page) => page.locator('input[name="email"]');
const brief = (page: Page) => page.locator('textarea[name="goal"]');
const budget = (page: Page) => page.locator('input[name="budget"]');
const date = (page: Page) => page.locator('input[name="date"]');
const status = (page: Page) => page.locator("[data-contact-status]");
async function ready(page: Page) {
  await page.goto("/contact"); await waitForRuntime(page); await expect(page.getByRole("button", { name: "Prepare email" })).toBeEnabled();
}
async function valid(page: Page, goal = "A new shop & booking flow.\nKeep every line.") {
  await name(page).fill("أحمد 😀 &?cc=outside@example.com"); await email(page).fill("reply+team@example.com"); await brief(page).fill(goal);
}
async function details(page: Page) { await page.getByRole("group", { name: "Your project details" }).locator("details > summary").click(); }
async function prepare(page: Page) { await page.getByRole("button", { name: "Prepare email", exact: true }).click(); }
async function shot(page: Page, info: TestInfo, label: string) {
  await info.attach(label, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

test("required values, invalid email, associated errors and retained entries", async ({ page }) => {
  await ready(page); await prepare(page);
  await expect(name(page)).toBeFocused(); await expect(page.locator('[aria-invalid="true"]')).toHaveCount(3);
  const errorId = await name(page).getAttribute("aria-describedby"); await expect(page.locator(`[id="${errorId}"]`)).toHaveText("Enter your name.");
  await name(page).fill("Kept name"); await email(page).fill("invalid"); await brief(page).fill("Kept brief"); await prepare(page);
  await expect(email(page)).toBeFocused(); await expect(name(page)).toHaveValue("Kept name"); await expect(brief(page)).toHaveValue("Kept brief");
  await expect(page.getByRole("link", { name: "Open email app" })).toHaveCount(0);
  await expect(name(page)).toHaveAttribute("maxlength", "100"); await expect(email(page)).toHaveAttribute("maxlength", "254"); await expect(brief(page)).toHaveAttribute("maxlength", "2000");
});

test("budget text accepts empty, zero, decimals and both Arabic digit sets without wheel changes", async ({ page }) => {
  await ready(page); await valid(page); await details(page);
  await expect(budget(page)).toHaveValue(""); await expect(budget(page)).toHaveAttribute("type", "text"); await expect(budget(page)).toHaveAttribute("inputmode", "decimal");
  await expect(budget(page)).toHaveAttribute("placeholder", "Enter an amount");
  for (const [input, output] of [["", ""], ["0", "0"], ["1.25", "1.25"], ["١٥٠٠٫٥٠", "1500.50"], ["۱۵۰۰٫۵۰", "1500.50"], ["99999999999999999999.99", "99999999999999999999.99"]]) {
    await budget(page).fill(input); await budget(page).hover(); await page.mouse.wheel(0, 100); await expect(budget(page)).toHaveValue(input);
    await prepare(page); const text = await page.locator("pre").innerText();
    if (input) expect(text).toContain(`Budget: ${output} USD`); else expect(text).not.toContain("Budget:");
  }
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("invalid budget in closed details opens it before focus; all values survive", async ({ page }) => {
  await ready(page); await valid(page); await details(page);
  for (const input of ["-1", "NaN", "Infinity", "1e3", "1.", ".", "1.234", "+100", "1,000"]) {
    await budget(page).fill(input); await details(page); await prepare(page);
    await expect(budget(page)).toBeFocused(); await expect(budget(page)).toHaveValue(input); await expect(budget(page)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("pre")).toHaveCount(0); await expect(email(page)).toHaveValue("reply+team@example.com");
  }
});

test("date validation uses the local day across opposite UTC boundaries", async ({ browser }) => {
  for (const [timezoneId, time, today] of [["Pacific/Kiritimati", "2026-10-11T10:30:00Z", "2026-10-12"], ["Pacific/Honolulu", "2026-10-12T02:00:00Z", "2026-10-11"]]) {
    const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, timezoneId, reducedMotion: "reduce" }); const page = await context.newPage();
    try {
      await page.clock.setSystemTime(new Date(time)); await page.goto("/contact"); await valid(page); await details(page);
      await date(page).fill(today); await prepare(page); await expect(page.locator("pre")).toContainText(today);
      for (const value of ["2026-02-29", "2026-04-31", "2026-10-10"]) { await date(page).fill(value); await prepare(page); await expect(date(page)).toBeFocused(); await expect(date(page)).toHaveAttribute("aria-invalid", "true"); }
      await date(page).fill("2028-02-29"); await prepare(page); await expect(page.locator("pre")).toContainText("2028-02-29");
    } finally { await context.close(); }
  }
});

test("full Arabic and emoji draft stays plain text and href has only the fixed recipient, subject and body", async ({ page }) => {
  const outgoing: string[] = [];
  page.on("request", request => { if (request.method() !== "GET" || !request.url().startsWith("http://127.0.0.1:")) outgoing.push(request.url()); });
  await ready(page); await valid(page, "مشروع 🛒\nA&B?x=1 #tag\n<script>alert(1)</script>"); await details(page); await budget(page).fill("١٥٠٠٫٥٠");
  await prepare(page); await expect(status(page)).toHaveText("Email draft ready. Open your email app to review and send it.");
  const text = await page.locator("pre").textContent(); expect(text).toContain("<script>alert(1)</script>"); await expect(page.locator("pre script")).toHaveCount(0);
  const href = await page.getByRole("link", { name: "Open email app" }).getAttribute("href"), url = new URL(href!);
  expect(url.pathname).toBe(identity.email); expect([...url.searchParams.keys()]).toEqual(["subject", "body"]);
  expect(url.searchParams.get("subject")).toBe("Project enquiry — أحمد 😀 &?cc=outside@example.com");
  expect(url.searchParams.get("body")).toContain("Budget: 1500.50 USD"); expect(url.searchParams.get("body")).toContain("مشروع 🛒\r\nA&B?x=1 #tag");
  await page.evaluate(() => document.addEventListener("click", event => { if ((event.target as Element)?.closest('a[href^="mailto:"]')) event.preventDefault(); }, { once: true }));
  await page.getByRole("link", { name: "Open email app" }).click(); await expect(page).toHaveURL(/\/contact$/);
  expect(outgoing).toEqual([]); expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test("mailto CRLF preserves the complete preview and clipboard including literal percent sequences", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { copiedText: "" });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text: string) => {
      (window as unknown as { copiedText: string }).copiedText = text;
      return Promise.resolve();
    } } });
  });
  await ready(page);
  for (const goal of ["العربية 😀\n&? # + = %0A\nKeep every line.\n", "متجر 🛒 & %0A\n".repeat(100)]) {
    await valid(page, goal);
    await expect(page.getByRole("link", { name: "Open email app" })).toHaveCount(0);
    await prepare(page);
    const subject = "Project enquiry — أحمد 😀 &?cc=outside@example.com";
    const body = `Name: أحمد 😀 &?cc=outside@example.com\nReply email: reply+team@example.com\n\nProject brief:\n${goal}`;
    const message = `To: ${identity.email}\nSubject: ${subject}\n\n${body}`;
    expect(await page.locator("pre").textContent()).toBe(message);
    const href = await page.getByRole("link", { name: "Open email app" }).getAttribute("href");
    const expectedHref = `mailto:${identity.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\r\n|\r|\n/g, "\r\n"))}`;
    expect(href).toBe(expectedHref.length > 1800 ? `mailto:${identity.email}` : expectedHref);
    if (expectedHref.length <= 1800) {
      const url = new URL(href!);
      expect(url.pathname).toBe(identity.email);
      expect([...url.searchParams.keys()]).toEqual(["subject", "body"]);
      expect(url.searchParams.get("body")).toContain("%0A");
      expect(url.searchParams.get("body")).not.toMatch(/\r(?!\n)|(?<!\r)\n|\r\r\n/);
    }
    await page.getByRole("button", { name: "Copy message" }).click();
    expect(await page.evaluate(() => (window as unknown as { copiedText: string }).copiedText)).toBe(message);
  }
});

test("long draft keeps every line and offers copy plus recipient-only mailto", async ({ page }) => {
  await ready(page); const goal = "متجر 🛒 &\n".repeat(170); await valid(page, goal); await prepare(page);
  await expect(page.locator("pre")).toContainText(goal.trim()); await expect(page.getByRole("link", { name: "Open email app" })).toHaveAttribute("href", `mailto:${identity.email}`);
  await expect(page.getByText("This message is long, and email apps support different link lengths.", { exact: false })).toBeVisible();
  expect((await page.locator("pre").textContent())?.endsWith(goal)).toBe(true);
});

for (const mode of ["success", "failure", "late-success", "late-failure"]) test(`clipboard ${mode} keeps the full text and suppresses obsolete feedback`, async ({ page }) => {
  await page.addInitScript(mode => {
    Object.assign(window, { copiedText: "", settle: () => {} });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text: string) => {
      (window as unknown as { copiedText: string }).copiedText = text;
      if (mode === "success") return Promise.resolve(); if (mode === "failure") return Promise.reject(new Error("Denied"));
      return new Promise<void>((resolve, reject) => { (window as unknown as { settle: () => void }).settle = mode === "late-success" ? resolve : () => reject(new Error("Denied")); });
    } } });
  }, mode);
  await ready(page); await valid(page); await prepare(page); const text = await page.locator("pre").textContent(); await page.getByRole("button", { name: "Copy message" }).click();
  if (mode.startsWith("late")) { await brief(page).fill("New current brief"); await page.evaluate(() => (window as unknown as { settle: () => void }).settle()); await expect(status(page)).toHaveText(""); await expect(page.locator("pre")).toHaveCount(0); }
  else {
    await expect(status(page)).toContainText(mode === "success" ? "Message copied." : "Clipboard unavailable.");
    expect(await page.evaluate(() => (window as unknown as { copiedText: string }).copiedText)).toBe(text);
    if (mode === "failure") await expect(page.locator("pre")).toBeFocused();
  }
});

test("changing each field invalidates the prepared href and copy action", async ({ page }) => {
  await ready(page); await valid(page); await details(page);
  for (const [field, value] of [["name", "Current name"], ["email", "new@example.com"], ["goal", "New brief"], ["company", "New company"], ["date", "2028-02-29"], ["budget", "12.50"]]) {
    await prepare(page); await expect(page.locator("pre")).toBeVisible(); await page.locator(`[name="${field}"]`).fill(value);
    await expect(page.locator("pre")).toHaveCount(0); await expect(page.getByRole("link", { name: "Open email app" })).toHaveCount(0); await expect(page.getByRole("button", { name: "Copy message" })).toHaveCount(0);
  }
});

test("calendar keyboard grid, writing, selection, clear, dismissal, menu lock and navigation", async ({ page }) => {
  await ready(page); await details(page); await date(page).fill("2028-02-29"); await date(page).focus(); await page.keyboard.press("ArrowDown");
  const calendar = page.getByRole("dialog", { name: "Choose preferred date" });
  await expect(calendar).toBeVisible(); await expect(calendar).not.toHaveAttribute("aria-modal", "true");
  await expect(calendar.locator('[data-date][tabindex="0"]')).toHaveCount(1); await expect(calendar.locator('[data-date="2028-02-29"]')).toBeFocused();
  await page.keyboard.press("ArrowRight"); await expect(calendar.locator('[data-date="2028-03-01"]')).toBeFocused();
  await page.keyboard.press("PageDown"); await expect(calendar.locator('[data-date="2028-04-01"]')).toBeFocused(); await page.keyboard.press("Enter");
  await expect(date(page)).toHaveValue("2028-04-01"); await expect(page.getByRole("button", { name: "Open calendar" })).toBeFocused();
  await page.getByRole("button", { name: "Open calendar" }).click(); await page.keyboard.press("Escape"); await expect(calendar).toHaveCount(0); await expect(page.getByRole("button", { name: "Open calendar" })).toBeFocused();
  await page.getByRole("button", { name: "Open calendar" }).click(); await calendar.getByRole("button", { name: "Clear", exact: true }).click(); await expect(date(page)).toHaveValue("");
  await page.getByRole("button", { name: "Open calendar" }).click(); await details(page); await expect(calendar).toHaveCount(0);
  await details(page); await page.getByRole("button", { name: "Open calendar" }).click(); await page.locator("[data-menu-toggle]").click(); await expect(calendar).toHaveCount(0);
  await page.keyboard.press("Escape"); await page.getByRole("button", { name: "Open calendar" }).click();
  await page.locator("[data-menu-toggle]").click(); await page.locator("[data-menu-panel]").getByRole("link", { name: "Work", exact: true }).click(); await expect(page).toHaveURL(/\/work$/);
  await page.goBack(); await expect(page.locator("main")).toHaveAttribute("data-route", "/contact"); await expect(calendar).toHaveCount(0);
});

const sizes = [[320,740],[390,844],[768,1024],[992,900],[1366,600],[1440,900],[359,740],[360,740],[719,844],[720,844],[1023,900],[1024,900]];
for (const [width, height] of sizes) test(`Contact responsive states ${width}x${height}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height }); await ready(page); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1000);
  await expect(page.locator("main")).toHaveAttribute("id", "main-content"); await expect(page.locator("main")).toHaveAttribute("tabindex", "-1");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/contact$/);
  await shot(page, info, "initial"); await details(page); await shot(page, info, "details");
  await page.getByRole("button", { name: "Open calendar" }).click(); const panel = page.getByRole("dialog", { name: "Choose preferred date" });
  await expect(panel).toBeVisible(); await page.waitForTimeout(100); let box = await panel.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(height);
  await shot(page, info, "calendar"); await page.keyboard.press("Escape"); await prepare(page); await expect(name(page)).toBeFocused(); await shot(page, info, "errors");
  await valid(page); await budget(page).fill("١٥٠٠٫٥٠"); await prepare(page); await expect(page.locator("pre")).toBeVisible(); await shot(page, info, "draft");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  for (const field of [name(page), email(page), brief(page), date(page), budget(page)]) {
    await field.focus(); await expect(field).toBeFocused(); const rect = await field.boundingBox(); expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    expect(await field.evaluate(element => getComputedStyle(element).outlineStyle !== "none" || getComputedStyle(element.parentElement!).outlineStyle !== "none")).toBe(true);
  }
  await page.getByRole("button", { name: "Open calendar" }).click(); await page.mouse.wheel(0, -120); await page.waitForTimeout(600);
  await page.setViewportSize({ width: 320, height: 340 }); await page.waitForTimeout(100); box = await panel.boundingBox(); expect(box!.x + box!.width).toBeLessThanOrEqual(320); expect(box!.y + box!.height).toBeLessThanOrEqual(340);
});

test("touch calendar uses native inner scroll within a short viewport", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 400 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage(); await page.goto("/contact"); await details(page); await page.getByRole("button", { name: "Open calendar" }).tap();
    const calendar = page.getByRole("dialog", { name: "Choose preferred date" }); await expect(calendar).toHaveAttribute("data-scroll-native", "true");
    expect(await calendar.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    const cdp = await context.newCDPSession(page), box = await calendar.boundingBox(); const x = box!.x + box!.width / 2, y = box!.y + box!.height - 40;
    const before = await page.evaluate(() => scrollY);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - step * 15 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await page.waitForTimeout(500);
    expect(await calendar.evaluate(element => element.scrollTop)).toBeGreaterThan(0); expect(await page.evaluate(() => scrollY)).toBe(before);
    await calendar.getByRole("button", { name: "Clear", exact: true }).tap(); await expect(calendar).toHaveCount(0);
  } finally { await context.close(); }
});

test("SSR with delayed JavaScript, no JavaScript fallback, and reduced motion remain usable", async ({ browser, page }) => {
  await page.route("**/*.js", async route => { await new Promise(resolve => setTimeout(resolve, 1800)); await route.continue(); });
  await page.goto("/contact", { waitUntil: "domcontentloaded" }); await expect(page.getByRole("heading", { name: "Let’s talk." })).toBeVisible();
  expect(await page.locator("h1").evaluate(element => getComputedStyle(element).opacity)).toBe("1");
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 740 } });
  try {
    const fallback = await context.newPage(); await fallback.goto("/contact");
    await expect(fallback.getByRole("heading", { name: "Let’s talk." })).toBeVisible(); await expect(fallback.getByRole("button", { name: "Prepare email" })).toBeDisabled(); await expect(fallback.locator('input[name="name"]')).toBeDisabled();
    await expect(fallback.locator("form noscript p")).toBeVisible();
    await expect(fallback.locator("form noscript p")).toContainText("This form needs JavaScript");
    await expect(fallback.locator('a[href^="tel:"]')).toHaveAttribute("href", identity.phoneUri);
    await fallback.getByText("Can we improve an existing website?").click(); await expect(fallback.getByText("Yes. Send its link", { exact: false })).toBeVisible();
    await expect(fallback.locator("form")).toHaveAttribute("method", "post"); expect(new URL(fallback.url()).search).toBe("");
  } finally { await context.close(); }
  await page.unrouteAll({ behavior: "wait" }); await page.emulateMedia({ reducedMotion: "reduce" }); await ready(page); await page.waitForTimeout(200);
  expect(await page.locator("main").evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});
