import { describe, expect, it } from "vitest";
import { shouldSkipTranslationKey } from "./rules";

describe("shouldSkipTranslationKey", () => {
  it("skips stable identifiers and urls", () => {
    expect(shouldSkipTranslationKey("id", "payload.id")).toBe(true);
    expect(shouldSkipTranslationKey("slug", "payload.slug")).toBe(true);
    expect(shouldSkipTranslationKey("currency", "offer.currency")).toBe(true);
    expect(shouldSkipTranslationKey("title", "payload.title")).toBe(false);
  });

  it("honors includePaths", () => {
    expect(
      shouldSkipTranslationKey("title", "payload.title", {
        includePaths: ["payload.description"],
      }),
    ).toBe(true);
    expect(
      shouldSkipTranslationKey("description", "payload.description", {
        includePaths: ["payload.description"],
      }),
    ).toBe(false);
  });
});
