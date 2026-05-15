"use client";

import type { ChangeEvent } from "react";
import type { AppLocale } from "@/i18n/routing";
import type { GalleryItem } from "@/components/storage/StorageGalleryField";
import { Input } from "@/components/admin_ui/ui/input";
import { Label } from "@/components/admin_ui/ui/label";
import { Textarea } from "@/components/admin_ui/ui/textarea";
import { Button } from "@/components/admin_ui/ui/button";
import { Loader2 } from "lucide-react";
import RichTextEditor from "@/components/admin_ui/shared/rich-text-editor";

export type BlogLocaleFormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  focus_keyphrase: string;
  canonical_url: string;
  image_alts: Record<string, string>;
};

type BlogTranslationTabProps = {
  locale: AppLocale;
  value: BlogLocaleFormState;
  images: GalleryItem[];
  disabled: boolean;
  showAutoTranslate: boolean;
  autoTranslateLoading: boolean;
  autoTranslateDisabledReason?: string | null;
  onAutoTranslate: () => void;
  onChange: (next: BlogLocaleFormState) => void;
};

export function BlogTranslationTab({
  locale,
  value,
  images,
  disabled,
  showAutoTranslate,
  autoTranslateLoading,
  autoTranslateDisabledReason,
  onAutoTranslate,
  onChange,
}: BlogTranslationTabProps) {
  const update = (patch: Partial<BlogLocaleFormState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-6">
      {showAutoTranslate ? (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || autoTranslateLoading || Boolean(autoTranslateDisabledReason)}
              onClick={onAutoTranslate}
            >
              {autoTranslateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Auto Translate
            </Button>
          </div>
          {autoTranslateDisabledReason ? (
            <p className="text-right text-sm text-muted-foreground">{autoTranslateDisabledReason}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-12">
        <div className="space-y-2 md:col-span-6">
          <Label htmlFor={`title-${locale}`}>Title</Label>
          <Input
            id={`title-${locale}`}
            value={value.title}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update({ title: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-6">
          <Label htmlFor={`slug-${locale}`}>Slug</Label>
          <Input
            id={`slug-${locale}`}
            value={value.slug}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update({ slug: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-4">
          <Label htmlFor={`canonical-${locale}`}>Canonical URL</Label>
          <Input
            id={`canonical-${locale}`}
            value={value.canonical_url}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update({ canonical_url: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-4">
          <Label htmlFor={`focus-${locale}`}>Focus keyphrase</Label>
          <Input
            id={`focus-${locale}`}
            value={value.focus_keyphrase}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update({ focus_keyphrase: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-4">
          <Label htmlFor={`meta-title-${locale}`}>SEO title</Label>
          <Input
            id={`meta-title-${locale}`}
            value={value.meta_title}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLInputElement>) => update({ meta_title: e.target.value })}
          />
        </div>
        
        <div className="space-y-2 md:col-span-6">
          <Label htmlFor={`excerpt-${locale}`}>Excerpt</Label>
          <Textarea
            id={`excerpt-${locale}`}
            value={value.excerpt}
            disabled={disabled}
            rows={3}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update({ excerpt: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-6">
          <Label htmlFor={`meta-description-${locale}`}>SEO description</Label>
          <Textarea
            id={`meta-description-${locale}`}
            value={value.meta_description}
            disabled={disabled}
            rows={2}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              update({ meta_description: e.target.value })
            }
          />
        </div>
        
      </div>

      <div className="space-y-2">
        <Label htmlFor={`content-${locale}`}>Body</Label>
        <RichTextEditor
          columns={3}
          value={value.content}
          onChange={(content) => update({ content })}
          disabled={disabled}
          // height="220px"
        />
      </div>

      <div className="space-y-3">
        <Label>Image alt text</Label>
        {images.filter((image) => image.url.trim()).map((image) => (
          <div key={image.clientId} className="space-y-1">
            <Label htmlFor={`alt-${locale}-${image.clientId}`} className="text-xs text-muted-foreground">
              {image.isFeatured ? "Cover image" : "Gallery image"}
            </Label>
            <Input
              id={`alt-${locale}-${image.clientId}`}
              value={value.image_alts[image.clientId] ?? ""}
              disabled={disabled}
              placeholder="Alt text"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update({
                  image_alts: {
                    ...value.image_alts,
                    [image.clientId]: e.target.value,
                  },
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
