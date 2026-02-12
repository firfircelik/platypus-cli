import { describe, expect, it } from "vitest";
import {
  renderPlatypusBanner,
  shouldShowPlatypusBanner,
} from "../src/cli/banner.js";

describe("banner", () => {
  it("can be disabled by env", () => {
    const prev = process.env.PLATYPUS_BANNER;
    process.env.PLATYPUS_BANNER = "0";
    expect(shouldShowPlatypusBanner()).toBe(false);
    if (prev === undefined) delete process.env.PLATYPUS_BANNER;
    else process.env.PLATYPUS_BANNER = prev;
  });

  it("renders wide and compact variants", () => {
    const out = renderPlatypusBanner({ color: false });
    expect(out).toContain("Platypus CLI");
    expect(out).toContain("▄▄▄▄▄");
  });
});
