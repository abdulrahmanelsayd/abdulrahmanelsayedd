import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyContact, localDate, normalizeBudget, parseCalendarDate, validateContact } from "../../src/lib/contact-values.ts";
import { buildContactDraft, mailtoReviewLimit } from "../../src/lib/contact-draft.ts";
import { identity } from "../../src/content/identity.ts";

const valid = { ...emptyContact, name: "أحمد 😀 &?cc=other", email: "hello+team@example.com", goal: "مشروع متجر 🛒\nA&B? x=1 #tag\n<script>test</script>" };
for (const [input, expected] of [["", ""], ["0", "0"], ["000.00", "0.00"], ["1500.50", "1500.50"], ["١٥٠٠٫٥٠", "1500.50"], ["۱۵۰۰٫۵۰", "1500.50"], [".5", "0.5"], ["999999999999999999999999.99", "999999999999999999999999.99"]]) {
  test(`decimal budget ${JSON.stringify(input)}`, () => assert.equal(normalizeBudget(input), expected));
}
for (const input of ["-1", "−1", "+1", "NaN", "Infinity", "1e3", "1E+3", "1.", ".", "1.001", "1,000", "١٬٥٠٠", "1 2", "0x10", "1?cc=x"]) {
  test(`reject budget ${JSON.stringify(input)}`, () => assert.equal(normalizeBudget(input), null));
}
test("required, malformed and overlong fields stay independent", () => {
  assert.deepEqual(Object.keys(validateContact(emptyContact)), ["name", "email", "goal"]);
  for (const [field, value] of [["name", "n".repeat(101)], ["email", "a".repeat(245) + "@example.com"], ["goal", "g".repeat(2001)], ["company", "c".repeat(101)], ["email", "invalid"], ["name", "Name\nBcc: x"]]) assert.ok(validateContact({ ...valid, [field]: value })[field as keyof typeof emptyContact]);
  assert.deepEqual(validateContact(valid), {});
});
test("real Gregorian dates, leap years, and the local day", () => {
  assert.ok(parseCalendarDate("2028-02-29")); assert.ok(parseCalendarDate("2000-02-29")); assert.ok(parseCalendarDate("0001-01-01"));
  for (const date of ["2027-02-29", "1900-02-29", "2026-04-31", "2026-13-01", "0000-01-01", "2026-2-01", "2026-01-00"]) assert.equal(parseCalendarDate(date), null);
  const now = new Date(2026, 9, 12, 0, 15);
  assert.equal(localDate(now), "2026-10-12");
  assert.deepEqual(validateContact({ ...valid, date: "2026-10-12" }, now), {});
  assert.ok(validateContact({ ...valid, date: "2026-10-11" }, now).date);
  assert.deepEqual(validateContact({ ...valid, date: "2028-02-29" }, now), {});
});
test("timezone boundary uses getters, never UTC serialization", () => {
  const zone = process.env.TZ;
  try {
    process.env.TZ = "Pacific/Kiritimati";
    const now = new Date("2026-10-11T10:30:00Z");
    assert.equal(localDate(now), "2026-10-12"); assert.ok(validateContact({ ...valid, date: "2026-10-11" }, now).date);
    process.env.TZ = "Pacific/Honolulu";
    assert.equal(localDate(new Date("2026-10-12T02:00:00Z")), "2026-10-11");
  } finally { if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone; }
});
test("draft safely encodes the full Unicode message into only subject and body", () => {
  const draft = buildContactDraft({ ...valid, budget: "١٥٠٠٫٥٠", company: "Studio & Co", date: "2028-02-29" }, "fixed@example.com");
  assert.equal(draft.manual, false);
  const url = new URL(draft.href);
  assert.equal(url.pathname, "fixed@example.com"); assert.deepEqual([...url.searchParams.keys()], ["subject", "body"]);
  assert.equal(url.searchParams.get("subject"), `Project enquiry — ${valid.name}`);
  assert.equal(url.searchParams.get("body"), draft.body.replace(/\r\n|\r|\n/g, "\r\n"));
  assert.ok(draft.body.includes("1500.50 USD")); assert.ok(draft.body.endsWith(valid.goal));
});

for (const [label, goal] of [
  ["LF", "First line\nSecond line\n"],
  ["CRLF", "First line\r\nSecond line\r\n"],
  ["CR", "First line\rSecond line\r"],
  ["mixed", "First\rSecond\nThird\r\nFourth\r\n\nFifth"],
  ["Unicode and reserved characters", "العربية 😀 🛒\n&?cc=outside@example.com # / + = % %0A %0D%0A"],
]) test(`mailto normalizes ${label} only in the encoded body`, () => {
  const values = { ...emptyContact, name: "Review أحمد 😀", email: "review+team@example.com", goal };
  const draft = buildContactDraft(values, identity.email);
  const expectedBody = `Name: ${values.name}\nReply email: ${values.email}\n\nProject brief:\n${goal}`;
  assert.equal(draft.manual, false);
  assert.equal(draft.body, expectedBody);
  assert.equal(draft.message, `To: ${identity.email}\nSubject: Project enquiry — ${values.name}\n\n${expectedBody}`);
  const url = new URL(draft.href);
  assert.equal(url.protocol, "mailto:");
  assert.equal(url.pathname, identity.email);
  assert.deepEqual([...url.searchParams.keys()], ["subject", "body"]);
  assert.equal(url.searchParams.get("subject"), `Project enquiry — ${values.name}`);
  const encodedBody = url.searchParams.get("body")!;
  assert.equal(encodedBody, expectedBody.replace(/\r\n|\r|\n/g, "\r\n"));
  assert.doesNotMatch(encodedBody, /\r(?!\n)|(?<!\r)\n/);
  assert.doesNotMatch(encodedBody, /\r\r\n/);
  if (goal.includes("%0A")) {
    assert.ok(draft.href.includes("%250A"));
    assert.ok(encodedBody.endsWith("&?cc=outside@example.com # / + = % %0A %0D%0A"));
  }
});

test("mailto limit applies to the complete normalized and encoded href at, below and above the boundary", () => {
  const recipient = identity.email;
  const values = { ...emptyContact, name: "Review", email: "review@example.com", goal: "\n".repeat(10) + "ع😀&?#%0A\r\nTail" };
  const subject = "Project enquiry — Review";
  const expectedHref = (goal: string) => `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: Review\nReply email: review@example.com\n\nProject brief:\n${goal}`.replace(/\r\n|\r|\n/g, "\r\n"))}`;
  const fill = mailtoReviewLimit - expectedHref(values.goal).length;
  assert.ok(fill > 0);
  for (const offset of [-1, 0, 1]) {
    const goal = values.goal + "x".repeat(fill + offset);
    const href = expectedHref(goal), draft = buildContactDraft({ ...values, goal }, recipient);
    assert.equal(href.length, mailtoReviewLimit + offset);
    assert.equal(draft.manual, offset > 0);
    assert.equal(draft.href, offset > 0 ? `mailto:${recipient}` : href);
    assert.ok(draft.body.endsWith(goal));
    assert.equal(draft.message, `To: ${recipient}\nSubject: ${subject}\n\n${draft.body}`);
    const unnormalized = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft.body)}`;
    assert.ok(unnormalized.length < mailtoReviewLimit);
  }
});

test("Unicode expansion uses recipient-only fallback while retaining every preview and copy character", () => {
  const goal = "ع😀&\r\n".repeat(100) + "%0A";
  const draft = buildContactDraft({ ...emptyContact, name: "Review", email: "review@example.com", goal }, identity.email);
  assert.ok(draft.message.length < mailtoReviewLimit);
  assert.equal(draft.manual, true);
  assert.equal(draft.href, `mailto:${identity.email}`);
  assert.ok(draft.body.endsWith(goal));
  assert.equal(draft.message, `To: ${identity.email}\nSubject: ${draft.subject}\n\n${draft.body}`);
});
test("optional empty fields are omitted, zero retained, long draft never truncated", () => {
  assert.ok(!buildContactDraft(valid, "fixed@example.com").body.includes("Budget:"));
  assert.ok(buildContactDraft({ ...valid, budget: "0" }, "fixed@example.com").body.includes("Budget: 0 USD"));
  const values = { ...valid, goal: "ع🛒&\n".repeat(350) };
  const draft = buildContactDraft(values, "fixed@example.com");
  assert.equal(draft.manual, true); assert.equal(draft.href, "mailto:fixed@example.com"); assert.ok(draft.body.endsWith(values.goal));
  assert.throws(() => buildContactDraft({ ...valid, budget: "1e3" }, "fixed@example.com"));
});
