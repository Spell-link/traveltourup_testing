/** Normalize Next.js searchParams values (string | string[] | undefined). */
export function firstSearchParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
