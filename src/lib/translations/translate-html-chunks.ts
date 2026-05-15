const DEFAULT_HTML_CHUNK_CHARS = 2_800;

export function splitHtmlIntoChunks(html: string, maxChars = DEFAULT_HTML_CHUNK_CHARS): string[] {
  const trimmed = html.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const chunks: string[] = [];
  let buffer = "";
  const parts = trimmed.split(/(?<=<\/(?:p|h[1-6]|li|blockquote|td|th)>)/i);

  for (const part of parts) {
    if (!part) continue;
    if (buffer.length + part.length <= maxChars) {
      buffer += part;
      continue;
    }
    if (buffer.trim()) chunks.push(buffer);
    if (part.length <= maxChars) {
      buffer = part;
      continue;
    }
    for (let i = 0; i < part.length; i += maxChars) {
      chunks.push(part.slice(i, i + maxChars));
    }
    buffer = "";
  }

  if (buffer.trim()) chunks.push(buffer);
  return chunks.length > 0 ? chunks : [trimmed];
}
