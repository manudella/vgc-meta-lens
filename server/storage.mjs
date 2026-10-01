import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs/promises";

// Desktop installs are read-only; downloaded data lives in the user's profile.
export const cacheDir = pathToFileURL(
  path.resolve(
    process.env.META_LENS_DATA_DIR ||
      fileURLToPath(new URL("../.cache/", import.meta.url)),
  ) + path.sep,
);
export async function saveJson(name, value) {
  await fs.mkdir(cacheDir, { recursive: true });
  const target = new URL(name, cacheDir);
  const temporary = new URL(`${name}.tmp`, cacheDir);
  await fs.writeFile(temporary, JSON.stringify(value));
  await fs.rename(temporary, target);
}
