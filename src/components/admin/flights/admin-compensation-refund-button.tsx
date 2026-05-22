"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { compensationRefund } from "@/lib/http/admin-flights.client";
import { Button } from "@/components/admin_ui/ui/button";
import { toast } from "@/hooks/use-toast";

export function AdminCompensationRefundButton({
  duffelIntentId,
  label = "Issue compensation refund",
}: {
  duffelIntentId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRefund = () => {
    startTransition(async () => {
      try {
        await compensationRefund(duffelIntentId);
        toast({
          title: "Compensation refund submitted",
          description: "Refresh the queue to confirm status.",
        });
        router.refresh();
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Refund failed",
          description: e instanceof Error ? e.message : "Request failed.",
        });
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefund}
      disabled={pending}
      className="h-7 text-xs"
    >
      {pending ? "Working…" : label}
    </Button>
  );
}
