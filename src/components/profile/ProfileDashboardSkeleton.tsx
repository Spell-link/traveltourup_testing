import { Skeleton } from "@/components/admin_ui/ui/skeleton";
import { cn } from "@/lib/utils";

function ProfileAvatarSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("shrink-0 rounded-full", className)} aria-hidden />;
}

/** Skeleton for the profile form pane (right column). */
export function ProfilePanelSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-8 w-40 bg-muted-foreground/20" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full bg-muted-foreground/20" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24 bg-muted-foreground/20" />
            <Skeleton className="h-10 w-full rounded-md bg-muted-foreground/20" />
          </div>
        ))}
        <div className="col-span-2 space-y-2">
          <Skeleton className="h-4 w-28 bg-muted-foreground/20" />
          <Skeleton className="h-10 w-full rounded-md bg-muted-foreground/20" />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Skeleton className="h-10 w-32 rounded-xl bg-muted-foreground/20" />
      </div>
    </div>
  );
}

/** Full account dashboard chrome — use for `/profile` route loading and Suspense fallback. */
export function ProfileDashboardSkeleton() {
  return (
    <div className="bg-muted/40 sm:py-8 md:py-12" aria-busy="true" aria-label="Loading account">
      <div className="container mx-auto sm:px-8">
        <div className="flex flex-col overflow-hidden sm:rounded-2xl sm:border border-border bg-card shadow-lg lg:flex-row">
          <aside className="w-full shrink-0 border-border bg-muted/50 p-4 lg:w-[280px] lg:border-r">
            <Skeleton className="h-6 w-36" />
            <div className="mt-4 flex sm:flex-col sm:items-center md:mt-6">
              <ProfileAvatarSkeleton className="h-16 w-16 sm:h-24 sm:w-24" />
              <div className="flex flex-col gap-2 px-4 sm:mt-3 sm:px-6 sm:text-center">
                <Skeleton className="h-5 w-32 sm:mx-auto" />
                <Skeleton className="h-3 w-40 sm:mx-auto" />
              </div>
            </div>
            <div className="mt-4 space-y-2 md:mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="mt-4 h-10 w-full rounded-xl md:mt-6" />
          </aside>
          <div className="min-h-[420px] flex-1 bg-muted p-4 sm:p-6 md:p-8">
            <ProfilePanelSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
