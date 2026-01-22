import { describe, it, expect } from "vitest";

import { placeholder } from "../src/index.js";

describe("upload package", () => {
  it("placeholder exists", () => {
    expect(placeholder).toBe("upload package pending implementation");
  });
});
