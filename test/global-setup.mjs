import { rm } from "node:fs/promises";

export default function globalSetup() {
  const testTempRoot = process.env.HERMES_QVAC_TEST_TEMP_ROOT;
  if (!testTempRoot)
    throw new Error("Hermes/QVAC test temp root was not configured");
  return async function teardown() {
    await rm(testTempRoot, { recursive: true, force: true });
  };
}
