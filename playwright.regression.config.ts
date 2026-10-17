import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({...config,projects:[{name:"extended",testIgnore:["release.spec.ts",...config.projects!.flatMap(p=>Array.isArray(p.testMatch)?p.testMatch:typeof p.testMatch==="string"?[p.testMatch]:[])]}]});
