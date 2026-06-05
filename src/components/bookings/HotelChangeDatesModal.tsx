"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function HotelChangeDatesModal({ open, onClose }: Props) {
  const t = useTranslations("Hotels.bookingDetail");

  return (
    <Modal isOpen={open} onClose={onClose} title={t("changeDatesTitle")} className="max-w-lg">
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">{t("changeDatesIntro")}</p>
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{t("changeDatesWarning")}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("modalDismiss")}
          </Button>
          <Link
            href="/hotels"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("changeDatesCta")}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
