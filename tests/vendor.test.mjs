import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
test("vendored engine matches its pinned integrity manifest", () => {
  const root = new URL("../vendor/ncp/", import.meta.url);
  const manifest = JSON.parse(
    fs.readFileSync(new URL("manifest.json", root), "utf8"),
  );
  for (const [name, hash] of Object.entries(manifest.sha256))
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(new URL(name, root)))
        .digest("hex"),
      hash,
      name,
    );
});
