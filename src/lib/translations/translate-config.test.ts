import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAGING_LIBRE_TRANSLATE_URL,
  resolveLibreTranslateEndpoint,
} from "./translate-config";

describe("resolveLibreTranslateEndpoint", () => {
  it("uses the staging mirror when the managed host is configured without an API key", () => {
    const endpoint = resolveLibreTranslateEndpoint({
      url: "https://libretranslate.com",
    });
    expect(endpoint.baseUrl).toBe(DEFAULT_STAGING_LIBRE_TRANSLATE_URL);
    expect(endpoint.usesStagingMirror).toBe(true);
  });

  it("keeps a custom self-hosted URL without an API key", () => {
    const endpoint = resolveLibreTranslateEndpoint({
      url: "http://localhost:5000",
    });
    expect(endpoint.baseUrl).toBe("http://localhost:5000");
    expect(endpoint.usesStagingMirror).toBe(false);
  });

  it("uses the managed host when an API key is configured", () => {
    const endpoint = resolveLibreTranslateEndpoint({
      url: "https://libretranslate.com",
      apiKey: "secret",
    });
    expect(endpoint.baseUrl).toBe("https://libretranslate.com");
    expect(endpoint.usesStagingMirror).toBe(false);
  });
});
