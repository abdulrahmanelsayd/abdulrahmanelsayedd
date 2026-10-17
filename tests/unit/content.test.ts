import assert from "node:assert/strict";
import { test } from "node:test";
import { projects, menuProjectIds, workProjectIds, getProject } from "../../src/content/projects.ts";
import { routes, primaryRouteIds, menuRouteIds, footerRouteIds, getRoute, isInternalPath } from "../../src/content/routes.ts";
import { identity } from "../../src/content/identity.ts";

test("ten projects have unique stable IDs and valid destinations", () => {
  assert.equal(projects.length, 10);
  assert.equal(new Set(projects.map(project => project.id)).size, 10);
  assert.equal(new Set(projects.map(project => project.href)).size, 10);
  for (const project of projects) {
    assert.match(project.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const url = new URL(project.href);
    assert.equal(url.protocol, "https:");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
    assert.ok(project.name.trim());
    assert.ok(project.preview.alt.trim());
  }
});

test("Menu and Work selections resolve by ID in their approved order", () => {
  assert.deepEqual(menuProjectIds.map(id => getProject(id).name), ["Rifq Shop", "Jood Plus Pharmacy", "U-Richi", "Dehaz Skincare"]);
  assert.deepEqual(workProjectIds.map(id => getProject(id).name), ["Rifq Shop", "Jood Plus Pharmacy", "U-Richi", "Dehaz Skincare", "Next Gen", "Al Wesam Decor", "GOAT Marketing Agency", "Lawrence Shop", "Proline", "Sonoa"]);
  for (const selection of [menuProjectIds, workProjectIds]) {
    assert.equal(new Set(selection).size, selection.length);
    for (const id of selection) assert.ok(projects.some(project => project.id === id));
  }
  assert.deepEqual(new Set(workProjectIds), new Set(projects.map(project => project.id)));
});

test("the five internal routes and navigation orders remain valid", () => {
  assert.deepEqual(routes.map(route => route.href), ["/", "/work", "/about", "/services", "/contact"]);
  assert.equal(new Set(routes.map(route => route.id)).size, 5);
  assert.equal(new Set(routes.map(route => route.href)).size, 5);
  assert.deepEqual(primaryRouteIds.map(id => getRoute(id).href), ["/work", "/about", "/services", "/contact"]);
  assert.deepEqual(menuRouteIds.map(id => getRoute(id).href), ["/", "/work", "/about", "/services"]);
  assert.deepEqual(footerRouteIds.map(id => getRoute(id).href), ["/", "/services", "/work", "/about", "/contact"]);
  for (const route of routes) assert.equal(isInternalPath(route.href), true);
  for (const invalid of ["//example.com", "https://example.com", "/missing", "/work/", "/work?x=1", "/about#x"]) {
    assert.equal(isInternalPath(invalid), false);
  }
});

test("contact and social destinations preserve the current identity", () => {
  assert.equal(identity.name, "Abdulrahman Elsayed");
  assert.equal(identity.email, "abdulrahmaanelsayd@gmail.com");
  assert.equal(identity.phoneUri, "tel:+201114672369");
  assert.equal(identity.whatsappUri, "https://wa.me/201114672369");
  assert.deepEqual(identity.socials.map(item => item.href), ["https://www.instagram.com/abdulrahmanelsaydd/", "https://www.tumblr.com/blog/abduulrahman"]);
  for (const social of identity.socials) assert.equal(new URL(social.href).protocol, "https:");
});
