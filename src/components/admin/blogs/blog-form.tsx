"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import type { BlogPostAdminDto } from "@/lib/blog/blog.types";
import { getEnglishBlogSourceError } from "@/lib/blog/english-translation-guard";
import { createBlogPost, updateBlogPost } from "@/lib/http/blog.client";
import GenericForm, { type SubFormConfig } from "@/components/admin_ui/shared/generic-form";
import { SeoToolsSection } from "./seo-tools-section";
import {
  BlogTranslationTab,
  type BlogLocaleFormState,
} from "./blog-translation-tab";
import { useBlogAutoTranslate } from "./use-blog-auto-translate";
import {
  galleryItemsFromDto,
  galleryToApiPayload,
  normalizeGallery,
  type GalleryItem,
} from "@/components/storage/StorageGalleryField";
import Image from "next/image";
import {
  deleteStorageFile,
  uploadStorageFile,
} from "@/lib/http/storage.client";
import type { StorageVariantId } from "@/lib/storage/types";
import { locales, type AppLocale } from "@/i18n/routing";
import { Plus, Star, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/admin_ui/ui/alert";
import { Button } from "@/components/admin_ui/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin_ui/ui/tabs";

type CategoryOption = { id: string; name: string; slug: string };

export type BlogPostFormProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initial?: BlogPostAdminDto;
};

const BLOG_IMAGES_VARIANT: StorageVariantId = "blog-images";
const BLOG_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  ur: "Urdu",
  ar: "Arabic",
  fr: "French",
  ru: "Russian",
};

function titleToSlug(raw: string): string {
  if (!raw.trim()) return "";
  const s = raw
    .toLowerCase()
    .trim()
    .replace(/[''`"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "post";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

function estimateReadMinutesFromHtml(html: string): number {
  const text = stripHtml(html).replace(/\s+/g, " ").trim();
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function emptyLocaleState(): BlogLocaleFormState {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "<p></p>",
    meta_title: "",
    meta_description: "",
    focus_keyphrase: "",
    canonical_url: "",
    image_alts: {},
  };
}

function initialImagesFromPost(initial?: BlogPostAdminDto): GalleryItem[] {
  if (!initial?.images?.length) return [];
  return normalizeGallery(galleryItemsFromDto(initial.images, BLOG_IMAGES_VARIANT));
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type BlogPostFormValues = {
  category_id: string;
  status: string;
  tags: string[];
  read_time: number;
  robots_meta: string;
  published_at: string;
  images: GalleryItem[];
  translations: Record<AppLocale, BlogLocaleFormState>;
};

function buildDefaults(
  initial: BlogPostAdminDto | undefined,
  categories: CategoryOption[],
): BlogPostFormValues {
  const translations = Object.fromEntries(
    locales.map((locale) => {
      const translation = initial?.translations?.[locale];
      return [
        locale,
        translation
          ? {
              title: translation.title,
              slug: translation.slug,
              excerpt: translation.excerpt,
              content: translation.content,
              meta_title: translation.seo.metaTitle,
              meta_description: translation.seo.metaDescription,
              focus_keyphrase: translation.seo.focusKeyphrase ?? "",
              canonical_url: translation.seo.canonicalUrl ?? "",
              image_alts: { ...translation.imageAlts },
            }
          : emptyLocaleState(),
      ];
    }),
  ) as Record<AppLocale, BlogLocaleFormState>;

  return {
    category_id: initial?.category.id ?? categories[0]?.id ?? "",
    status: initial?.status ?? "draft",
    tags: initial?.tags?.length ? [...initial.tags] : [],
    read_time:
      initial?.readTime ??
      estimateReadMinutesFromHtml(initial?.translations.en?.content ?? ""),
    robots_meta: initial?.seo.robotsMeta ?? "index,follow",
    published_at: initial?.publishedAt ? toDatetimeLocalValue(new Date(initial.publishedAt)) : "",
    images: initialImagesFromPost(initial),
    translations,
  };
}

type BlogPostMediaSectionProps = {
  value: GalleryItem[];
  onChange: (next: GalleryItem[]) => void;
  disabled: boolean;
};

function BlogPostMediaSection({ value, onChange, disabled }: BlogPostMediaSectionProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);

  const withUrl = useMemo(() => value.filter((i) => i.url.trim()), [value]);

  const runFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || disabled) return;
      setLineError(null);
      setUploadBusy(true);
      try {
        const files = Array.from(fileList);
        const additions: GalleryItem[] = await Promise.all(
          files.map(async (file) => {
            const data = await uploadStorageFile(file, BLOG_IMAGES_VARIANT);
            return {
              clientId: crypto.randomUUID(),
              url: data.publicUrl ?? data.signedUrl ?? "",
              alt: "",
              isFeatured: false,
              storagePath: data.path,
            } satisfies GalleryItem;
          }),
        );
        onChange(normalizeGallery([...value, ...additions]));
      } catch (e) {
        setLineError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploadBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, onChange, value],
  );

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    void runFiles(e.target.files);
  };

  const remove = (clientId: string) => {
    const target = value.find((i) => i.clientId === clientId);
    if (target?.storagePath) {
      void deleteStorageFile(BLOG_IMAGES_VARIANT, target.storagePath).catch(() => {});
    }
    const next = value.filter((i) => i.clientId !== clientId);
    onChange(normalizeGallery(next));
  };

  const setFeatured = (clientId: string) => {
    onChange(
      value.map((i) => ({
        ...i,
        isFeatured: i.clientId === clientId && i.url.trim().length > 0,
      })),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <h2 className="text-lg font-semibold text-foreground">Media</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add one or more images. Mark the cover with the star. Alt text is set per language in the translation tabs.
          </p>
        </div>
        <div className="flex flex-col flex-wrap items-start justify-end gap-2 sm:shrink-0 sm:pl-2">
          <input
            ref={inputRef}
            type="file"
            accept={BLOG_IMAGE_ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            disabled={disabled || uploadBusy}
            onChange={onPick}
          />
          <Button
            type="button"
            variant="default"
            size="default"
            disabled={disabled || uploadBusy}
            onClick={() => inputRef.current?.click()}
          >
            {uploadBusy ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4 shrink-0" />
            )}
            Add image
          </Button>
        </div>
      </div>

      {lineError ? <p className="text-sm text-destructive">{lineError}</p> : null}

      <ul className="flex flex-wrap gap-3 p-0">
        {withUrl.map((item) => (
          <li key={item.clientId} className="flex min-w-0 w-[150px] flex-col gap-2">
            <div className="group relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm">
              <Image
                src={item.url}
                alt="Blog image"
                width={150}
                height={150}
                unoptimized
                className="object-cover"
              />
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-[2px] transition-all",
                  "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                )}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className={cn(
                    "h-9 w-9 border border-border bg-background/90 shadow",
                    item.isFeatured && "border-amber-500/50 bg-amber-500/10",
                  )}
                  disabled={disabled}
                  title={item.isFeatured ? "Cover image" : "Set as cover image"}
                  aria-pressed={item.isFeatured}
                  onClick={() => setFeatured(item.clientId)}
                >
                  <Star className={cn("h-4 w-4", item.isFeatured && "fill-amber-500 text-amber-500")} />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-9 w-9"
                  disabled={disabled}
                  title="Remove image"
                  onClick={() => remove(item.clientId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {item.isFeatured ? (
                <span className="absolute left-2 top-2 rounded bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-amber-950">
                  Cover
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlogPostForm({ mode, categories, initial }: BlogPostFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState<AppLocale>("en");
  const prevEnglishTitle = useRef(initial?.translations.en?.title ?? "");
  const { autoTranslate, loadingLocale, error: translateError, clearError } = useBlogAutoTranslate();

  const form = useForm<BlogPostFormValues>({
    defaultValues: buildDefaults(initial, categories),
  });

  useEffect(() => {
    void form.register("images");
    void form.register("translations");
  }, [form]);

  const imagesW = useWatch({ control: form.control, name: "images" });
  const translationsW = useWatch({ control: form.control, name: "translations" });
  const { dirtyFields } = useFormState({ control: form.control });
  const readTimeTouched = Boolean(dirtyFields.read_time);
  const english = translationsW?.en ?? emptyLocaleState();
  const activeTranslation = translationsW?.[activeLocale] ?? emptyLocaleState();
  const englishAutoTranslateError = useMemo(
    () => getEnglishBlogSourceError(english),
    [english],
  );

  useEffect(() => {
    const title = english.title ?? "";
    const slug = english.slug ?? "";
    if (!title.trim()) {
      form.setValue("translations.en.slug", "", { shouldDirty: true });
      prevEnglishTitle.current = title;
      return;
    }
    const fromPrev = titleToSlug(prevEnglishTitle.current);
    if (slug === fromPrev || slug === "") {
      form.setValue("translations.en.slug", titleToSlug(title), { shouldDirty: true });
    }
    prevEnglishTitle.current = title;
  }, [english.title, english.slug, form]);

  useEffect(() => {
    if (mode === "edit") return;
    if (readTimeTouched) return;
    form.setValue("read_time", estimateReadMinutesFromHtml(english.content ?? ""), {
      shouldValidate: true,
    });
  }, [english.content, readTimeTouched, form, mode]);

  const formFields: SubFormConfig[] = useMemo(() => {
    const catOptions = categories.map((c) => ({ label: c.name, value: c.id }));
    const baseStatus: { label: string; value: string }[] = [
      { label: "Draft", value: "draft" },
      { label: "Published", value: "published" },
    ];
    const statusOptions =
      initial?.status === "archived" ? [...baseStatus, { label: "Archived", value: "archived" }] : baseStatus;

    return [
      {
        subform_title: "Basics",
        collapse: true,
        fields: [
          {
            name: "category_id",
            label: "Category",
            type: "select",
            required: true,
            options: catOptions,
            cols: 12,
            mdCols: 4,
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            options: statusOptions,
            cols: 12,
            mdCols: 4,
          },
          {
            name: "published_at",
            label: "Published at",
            type: "datetime",
            description: "Set when the post should show as published (for Published status).",
            cols: 12,
            mdCols: 4,
          },
          {
            name: "robots_meta",
            label: "Robots meta tag",
            type: "select",
            options: [
              { label: "Index, Follow (Default)", value: "index,follow" },
              { label: "NoIndex, Follow", value: "noindex,follow" },
              { label: "Index, NoFollow", value: "index,nofollow" },
              { label: "NoIndex, NoFollow", value: "noindex,nofollow" },
            ],
            cols: 12,
            mdCols: 6,
          },
          {
            name: "tags",
            label: "Tags",
            type: "array-input",
            cols: 12,
            mdCols: 6,
            placeholder: "Comma or type and add",
          },
          {
            name: "read_time",
            label: "Read time (minutes)",
            type: "number",
            cols: 12,
            mdCols: 6,
          },
        ],
      },
    ];
  }, [categories, initial?.status]);

  const onSubmit = async (formData: BlogPostFormValues) => {
    setSubmitError(null);
    clearError();

    const data: BlogPostFormValues = {
      ...formData,
      images: (form.getValues("images") ?? formData.images) ?? [],
      tags: (form.getValues("tags") ?? formData.tags) ?? [],
      translations: form.getValues("translations") ?? formData.translations,
    };

    const englishTranslation = data.translations.en;
    if (!englishTranslation?.title.trim()) {
      setSubmitError("English title is required.");
      return;
    }

    if (!data.images.some((i) => i.url.trim())) {
      setSubmitError("Add at least one image.");
      return;
    }

    const imagesPayload = galleryToApiPayload(data.images).map(({ alt: _alt, ...image }) => image);
    if (imagesPayload.length < 1) {
      setSubmitError("Add at least one image.");
      return;
    }
    if (imagesPayload.filter((i) => i.is_featured).length !== 1) {
      setSubmitError("Set exactly one cover image using the star on an image.");
      return;
    }

    const apiSlug = titleToSlug((englishTranslation.slug || englishTranslation.title).trim());
    form.setValue("translations.en.slug", apiSlug, { shouldDirty: true });

    for (const locale of locales) {
      const translation = data.translations[locale];
      if (!translation?.title.trim()) continue;
      for (const image of data.images.filter((item) => item.url.trim())) {
        if (!translation.image_alts[image.clientId]?.trim()) {
          setSubmitError(`Every image must have alt text for ${LOCALE_LABELS[locale]}.`);
          return;
        }
      }
    }

    const trimSeoField = (value: string, max: number): string | null => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
    };

    const translationsPayload: Record<string, {
      title: string;
      slug: string;
      content: string;
      excerpt: string;
      meta_title: string | null;
      meta_description: string | null;
      focus_keyphrase: string | null;
      canonical_url: string | null;
      image_alts: Record<string, string>;
    }> = {};

    for (const locale of locales) {
      const translation = data.translations[locale];
      if (!translation?.title.trim()) continue;
      translationsPayload[locale] = {
        title: translation.title,
        slug: locale === "en" ? apiSlug : titleToSlug(translation.slug || translation.title),
        content: translation.content,
        excerpt: translation.excerpt,
        meta_title: trimSeoField(translation.meta_title, 60),
        meta_description: trimSeoField(translation.meta_description, 160),
        focus_keyphrase: translation.focus_keyphrase.trim()
          ? translation.focus_keyphrase.trim()
          : null,
        canonical_url: translation.canonical_url.trim()
          ? translation.canonical_url.trim()
          : null,
        image_alts: translation.image_alts,
      };
    }

    const body = {
      translations: translationsPayload,
      images: imagesPayload,
      tags: data.tags,
      status: data.status,
      featured: initial?.featured ?? false,
      views_count: initial?.viewsCount ?? 0,
      read_time: Number(data.read_time) || 0,
      robots_meta: data.robots_meta || "index,follow",
      published_at:
        data.status === "published" && data.published_at
          ? new Date(data.published_at).toISOString()
          : null,
      category_id: data.category_id,
      author_id: null,
    };

    try {
      if (mode === "create") {
        await createBlogPost(body);
      } else if (initial) {
        await updateBlogPost(initial.id, body);
      }
      router.push("/admin/blogs");
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleAutoTranslate = async (locale: AppLocale) => {
    clearError();
    const source = form.getValues("translations.en");
    const translated = await autoTranslate(locale, {
      title: source.title,
      slug: source.slug,
      excerpt: source.excerpt,
      content: source.content,
      meta_title: source.meta_title,
      meta_description: source.meta_description,
      focus_keyphrase: source.focus_keyphrase,
      image_alts: source.image_alts,
    });
    if (!translated) return;
    form.setValue(`translations.${locale}`, {
      ...translated,
      canonical_url: form.getValues(`translations.${locale}.canonical_url`) ?? "",
    }, { shouldDirty: true });
  };

  if (categories.length === 0) {
    return (
      <p className="text-destructive">
        No blog categories in the database. Run{" "}
        <code className="text-sm">npm run db:seed</code> (or add categories) before creating posts.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {(submitError || translateError) && (
        <Alert variant="destructive">
          <AlertDescription>{submitError ?? translateError}</AlertDescription>
        </Alert>
      )}
      <GenericForm
        form={form}
        fields={formFields}
        onSubmit={onSubmit}
        submitText={mode === "create" ? "Create post" : "Save changes"}
        submittingText={mode === "create" ? "Creating…" : "Saving…"}
        showCancel
        cancelText="Cancel"
        onCancel={() => router.push("/admin/blogs")}
        className="w-full min-w-0 space-y-8"
      >
        <div className="w-full min-w-0 space-y-6 border-t border-border pt-6">
          <BlogPostMediaSection
            value={imagesW ?? []}
            onChange={(next) => form.setValue("images", next, { shouldDirty: true })}
            disabled={form.formState.isSubmitting}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Translations</h2>
            <p className="text-sm text-muted-foreground">
              English is required. Other languages can be filled manually or with Auto Translate.
            </p>
          </div>
          <Tabs value={activeLocale} onValueChange={(value) => setActiveLocale(value as AppLocale)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              {locales.map((locale) => (
                <TabsTrigger key={locale} value={locale}>
                  {LOCALE_LABELS[locale]}
                </TabsTrigger>
              ))}
            </TabsList>
            {locales.map((locale) => (
              <TabsContent key={locale} value={locale} className="pt-4">
                <BlogTranslationTab
                  locale={locale}
                  value={translationsW?.[locale] ?? emptyLocaleState()}
                  images={imagesW ?? []}
                  disabled={form.formState.isSubmitting}
                  showAutoTranslate={locale !== "en"}
                  autoTranslateLoading={loadingLocale === locale}
                  autoTranslateDisabledReason={locale !== "en" ? englishAutoTranslateError : null}
                  onAutoTranslate={() => void handleAutoTranslate(locale)}
                  onChange={(next) =>
                    form.setValue(`translations.${locale}`, next, { shouldDirty: true })
                  }
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <SeoToolsSection
          title={activeTranslation.title}
          metaTitle={activeTranslation.meta_title}
          metaDescription={activeTranslation.meta_description}
          slug={activeTranslation.slug}
          content={activeTranslation.content}
          excerpt={activeTranslation.excerpt}
          focusKeyphrase={activeTranslation.focus_keyphrase}
          tags={form.getValues("tags") ?? []}
          postId={initial?.id}
          isSubmitting={form.formState.isSubmitting}
        />
      </GenericForm>
    </div>
  );
}
