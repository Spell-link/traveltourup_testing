import { describe, expect, it } from "vitest";
import { splitHtmlIntoChunks } from "./translate-html-chunks";

describe("splitHtmlIntoChunks", () => {
  it("returns a single chunk for short html", () => {
    const html = "<p>Hello</p><p>World</p>";
    expect(splitHtmlIntoChunks(html, 100)).toEqual([html]);
  });

  it("splits long html across block boundaries", () => {
    const html = `<p>${"a".repeat(1500)}</p><p>${"b".repeat(1500)}</p>`;
    const chunks = splitHtmlIntoChunks(html, 1800);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(html);
  });
});
