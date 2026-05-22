"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryFlightRefund } from "@/lib/http/admin-flights.client";
import { Button } from "@/components/admin_ui/ui/button";
import { toast } from "@/hooks/use-toast";

export function AdminFlightRefundRetryButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      try {
        await retryFlightRefund(bookingId);
        toast({ title: "Refund retry submitted", description: "Check saga timeline for updates." });
        router.refresh();
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Refund retry failed",
          description: e instanceof Error ? e.message : "Request failed.",
        });
      }
    });
  };

  return (
    <div className="mt-3">
      <Button type="button" onClick={handleRetry} disabled={pending} size="sm">
        {pending ? "Retrying…" : "Retry customer refund"}
      </Button>
    </div>
  );
}
