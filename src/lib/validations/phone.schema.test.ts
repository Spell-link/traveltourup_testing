import { describe, expect, it } from "vitest";
import { formatDuffelPhone, isE164Phone, normalizeE164Phone } from "./phone.schema";

describe("phone.schema", () => {
  it("accepts valid international numbers", () => {
    expect(formatDuffelPhone("+442080160509")).toBe("+442080160509");
    expect(formatDuffelPhone("+12025550100")).toBe("+12025550100");
    expect(formatDuffelPhone("+92 3233123210")).toBe("+923233123210");
  });

  it("rejects local format without country code", () => {
    expect(formatDuffelPhone("02080160509")).toBeNull();
    expect(formatDuffelPhone("03233123210")).toBeNull();
  });

  it("rejects numbers that look like E.164 but fail libphonenumber", () => {
    expect(formatDuffelPhone("+1234567")).toBeNull();
  });

  it("isE164Phone mirrors formatDuffelPhone", () => {
    expect(isE164Phone("+442080160509")).toBe(true);
    expect(isE164Phone("02080160509")).toBe(false);
  });

  it("normalizeE164Phone alias works", () => {
    expect(normalizeE164Phone("+44 20 8016 0509")).toBe("+442080160509");
  });
});
