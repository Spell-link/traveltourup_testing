"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ExternalLink, Loader2, Trash2, Plane, Building2, Car } from "lucide-react";
import type { WishlistItemDto } from "@/lib/wishlist/wishlist.types";
import type { WishlistType } from "@/lib/wishlist/wishlist.constants";
import { WISHLIST_TYPES, wishlistTypeLabel } from "@/lib/wishlist/wishlist.constants";
import { wishlistDetailHref, wishlistVerticalHref } from "@/lib/wishlist/wishlist.routes";
import { removeFromWishlist } from "@/lib/http/wishlist.client";
import { revalidateWishlistQueries, useWishlistItemsQuery } from "@/lib/http/wishlist-swr";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { NativeSelect } from "@/components/ui/NativeSelect";

function typeIcon(t: WishlistType) {
  switch (t) {
    case "flight":
      return Plane;
    case "hotel":
      return Building2;
    case "car":
      return Car;
    default: {
      const _e: never = t;
      return _e;
    }
  }
}

export function WishlistPanel() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const scope = useMemo<"all" | WishlistType>(() => {
    if (typeFilter && WISHLIST_TYPES.includes(typeFilter as WishlistType)) {
      return typeFilter as WishlistType;
    }
    return "all";
  }, [typeFilter]);

  const { data: items = [], error, isLoading: loading, mutate } = useWishlistItemsQuery(
    scope,
    user?.id,
  );

  const load = () => mutate();
  const loadError = error instanceof Error ? error.message : error ? "Failed to load wishlist" : null;

  const onRemove = async (item: WishlistItemDto) => {
    setRemovingId(item.id);
    setActionError(null);
    try {
      await removeFromWishlist(item.type, item.ref_id);
      await revalidateWishlistQueries();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not remove item");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">Wishlist</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved flights, hotels, and cars. Flight offers can expire — open the listing to search again if needed.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <NativeSelect
          id="wishlist-type-filter"
          label="Type"
          wrapperClassName="sm:max-w-[200px]"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="" className="text-foreground bg-card">All types</option>
          {WISHLIST_TYPES.map((t) => (
            <option key={t} value={t} className="text-foreground bg-card">
              {wishlistTypeLabel(t)}s
            </option>
          ))}
        </NativeSelect>
        <Button type="button" variant="outline" size="md" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loadError || actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError ?? actionError}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          <span>Loading your wishlist…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground bg-card">
          Nothing saved yet. Browse{" "}
          <Link href="/flights" className="font-medium text-primary underline-offset-4 hover:underline">
            flights
          </Link>
          ,{" "}
          <Link href="/hotels" className="font-medium text-primary underline-offset-4 hover:underline">
            hotels
          </Link>
          , or{" "}
          <Link href="/cars" className="font-medium text-primary underline-offset-4 hover:underline">
            cars
          </Link>{" "}
          and tap Save on a detail page.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const Icon = typeIcon(item.type);
            const detailHref = wishlistDetailHref(item.type, item.ref_id);
            const verticalHref = wishlistVerticalHref(item.type);
            const headline =
              item.title?.trim() ||
              `${wishlistTypeLabel(item.type)} · ${item.ref_id.length > 48 ? `${item.ref_id.slice(0, 48)}…` : item.ref_id}`;

            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{headline}</p>
                    {item.subtitle ? (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {wishlistTypeLabel(item.type)} · saved {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button variant="outline" size="sm" href={detailHref}>
                    Open
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  </Button>
                  <Button variant="ghost" size="sm" href={verticalHref}>
                    Browse {wishlistTypeLabel(item.type)}s
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void onRemove(item)}
                    disabled={removingId === item.id}
                    aria-label={`Remove ${headline} from wishlist`}
                  >
                    {removingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
