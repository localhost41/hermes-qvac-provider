import { describe, expect, it } from "vitest";
import { name } from "../src/index.js";

describe("hermes-qvac-provider", () => {
  it("exports the package name", () => {
    expect(name()).toBe("hermes-qvac-provider");
  });
});
