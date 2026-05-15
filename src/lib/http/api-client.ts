"use client";

/**
 * Generic JSON fetch for `/api/v1/**` endpoints.
 *
 * Includes `credentials: "include"` so the browser sends the Supabase session
 * cookie when present. The server decides access level via `getServerAuthz()`:
 *   - Authenticated caller with admin permission  -> admin-level data
 *   - Authenticated caller without admin permission -> user-level data
 *   - Unauthenticated caller                       -> public data
 *
 * Works for admin, self-service, AND public calls from the same helper.
 */
export async function apiJson<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, headers: hdr, ...rest } = init ?? {};
  const headers = new Headers(hdr);
  headers.set("Accept", "application/json");

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const res = await fetch(path, {
    ...rest,
    credentials: "include",
    headers,
    body: payload,
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(text || res.statusText);
  }

  if (!res.ok) {
    const o = parsed as {
      message?: string;
      issues?: Array<{ message?: string; path?: Array<string | number> }>;
      code?: string;
    };
    const issueMessages = o.issues
      ?.map((issue) => {
        if (!issue.message) return null;
        if (!issue.path?.length) return issue.message;
        return `${issue.path.join(".")}: ${issue.message}`;
      })
      .filter((message): message is string => Boolean(message));
    const msg =
      o.message ||
      (issueMessages?.length ? issueMessages.join("; ") : null) ||
      (o.issues !== undefined ? JSON.stringify(o.issues) : null) ||
      `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : String(msg));
  }

  return (parsed as { data: T }).data;
}

/**
 * Paginated API response envelope returned by list endpoints.
 */
export type PaginatedApiResponse<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

/**
 * Fetch a paginated list endpoint and return both data and meta.
 */
export async function apiPaginatedJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<PaginatedApiResponse<T>> {
  const u = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") u.set(k, String(v));
    }
  }
  const qs = u.toString();
  const url = qs ? `${path}?${qs}` : path;

  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message ?? `Request failed (${res.status})`);
  }
  return json as PaginatedApiResponse<T>;
}
