import "server-only";
import { getDuffelConfig } from "./config";
import { DuffelApiError, isRetryableDuffelStatus, type DuffelErrorItem } from "./errors";

export type DuffelVersion = "v2" | "beta";

export type DuffelFetchOptions = RequestInit & {
  duffelVersion?: DuffelVersion;
};

function duffelHeaders(apiKey: string, duffelVersion: DuffelVersion): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Duffel-Version": duffelVersion,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip",
  };
}

function parseDuffelErrors(body: unknown): DuffelErrorItem[] {
  if (!body || typeof body !== "object") return [];
  const rec = body as { errors?: unknown };
  if (!Array.isArray(rec.errors)) return [];
  return rec.errors.map((e) => {
    if (!e || typeof e !== "object") return {};
    const o = e as Record<string, unknown>;
    return {
      title: typeof o.title === "string" ? o.title : undefined,
      message: typeof o.message === "string" ? o.message : undefined,
      code: typeof o.code === "string" ? o.code : undefined,
      type: typeof o.type === "string" ? o.type : undefined,
    };
  });
}

async function readDuffelJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

async function duffelRequestOnce<T>(
  url: string,
  apiKey: string,
  timeoutMs: number,
  duffelVersion: DuffelVersion,
  options: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        ...duffelHeaders(apiKey, duffelVersion),
        ...(options.headers as Record<string, string>),
      },
    });
  } catch (cause) {
    const isTimeout = cause instanceof Error && cause.name === "TimeoutError";
    throw new DuffelApiError(
      504,
      [],
      isTimeout,
      isTimeout
        ? "Flight supplier request timed out. Please try again."
        : "Flight supplier is unreachable. Please try again.",
    );
  }

  if (!res.ok) {
    const body = await readDuffelJson(res);
    return { ok: false, status: res.status, body };
  }

  const data = (await res.json()) as T;
  return { ok: true, data };
}

/**
 * Low-level HTTP client for api.duffel.com (Bearer + Duffel-Version).
 * @throws DuffelApiError on non-OK responses; throws on network/timeout
 */
export async function duffelFetch<T>(path: string, options: DuffelFetchOptions = {}): Promise<T> {
  const { apiKey, baseUrl, timeoutMs } = getDuffelConfig();
  const { duffelVersion = "v2", ...fetchOpts } = options;
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (fetchOpts.method ?? "GET").toUpperCase();

  const maxAttempts = method === "GET" ? 3 : 1;
  let lastFail: { status: number; body: unknown } | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await duffelRequestOnce<T>(url, apiKey, timeoutMs, duffelVersion, fetchOpts);
    if (result.ok) {
      return result.data;
    }
    lastFail = { status: result.status, body: result.body };
    const retryable = isRetryableDuffelStatus(result.status);
    if (method !== "GET" || !retryable || attempt === maxAttempts - 1) {
      break;
    }
    const delayMs = 500 * (attempt + 1);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  const status = lastFail?.status ?? 502;
  const duffelErrors = parseDuffelErrors(lastFail?.body);
  if (process.env.NODE_ENV !== "production" && duffelErrors.length > 0) {
    console.error("Duffel API error:", status, duffelErrors);
  }
  throw new DuffelApiError(status, duffelErrors, isRetryableDuffelStatus(status));
}

/** Payment Intents and other beta-version endpoints */
export function duffelFetchBeta<T>(path: string, options: Omit<DuffelFetchOptions, "duffelVersion"> = {}) {
  return duffelFetch<T>(path, { ...options, duffelVersion: "beta" });
}

export { isDuffelConfigured } from "./config";
