import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

const testTempRoot = mkdtempSync(join(tmpdir(), "hermes-qvac-vitest-"));
process.env.HERMES_QVAC_TEST_TEMP_ROOT = testTempRoot;
process.env.TMPDIR = testTempRoot;
process.env.TMP = testTempRoot;
process.env.TEMP = testTempRoot;

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.mjs"],
  },
});
