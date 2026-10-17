import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

// Resolve absent outputs via their nearest existing ancestor, detecting links
// in every parent. A dangling link must fail closed.
export async function physical(value) {
  try { return await realpath(value); } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = path.dirname(value);
    if (parent === value) throw error;
    try {
      if ((await lstat(value)).isSymbolicLink()) throw Error("Dangling output link");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    return path.join(await physical(parent), path.basename(value));
  }
}
