export type EnglishBlogSourceFields = {
  title?: string;
  excerpt?: string;
  content?: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function getEnglishBlogSourceError(source: EnglishBlogSourceFields): string | null {
  if (!source.title?.trim()) {
    return "Add an English title before using Auto Translate.";
  }
  if (!source.excerpt?.trim()) {
    return "Add an English excerpt before using Auto Translate.";
  }
  if (!stripHtml(source.content ?? "")) {
    return "Add English body content before using Auto Translate.";
  }
  return null;
}

export function buildTranslatableEnglishFields(
  source: EnglishBlogSourceFields & {
    meta_title?: string;
    meta_description?: string;
    focus_keyphrase?: string;
    image_alts?: Record<string, string>;
  },
): Record<string, string> {
  const fields: Record<string, string> = {
    title: source.title!.trim(),
    excerpt: source.excerpt!.trim(),
    content: source.content!.trim(),
  };

  if (source.meta_title?.trim()) fields.meta_title = source.meta_title.trim();
  if (source.meta_description?.trim()) fields.meta_description = source.meta_description.trim();
  if (source.focus_keyphrase?.trim()) fields.focus_keyphrase = source.focus_keyphrase.trim();

  for (const [imageId, alt] of Object.entries(source.image_alts ?? {})) {
    if (alt.trim()) fields[`image_alt_${imageId}`] = alt.trim();
  }

  return fields;
}
