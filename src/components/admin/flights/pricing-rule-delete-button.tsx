"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PricingRuleDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/admin/flights/pricing-rules/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        router.refresh();
      } catch {
        // swallow - admin will see a stale row and can retry
      }
    });
  };

  if (!confirmOpen) {
    return (
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-xs text-rose-700 hover:underline"
      >
        Delete
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(false)}
        className="text-xs text-muted-foreground hover:underline"
      >
        Cancel
      </button>
    </span>
  );
}
