"use client";

import { useCallback, useState } from "react";
import { useIsMobile } from "@/components/admin_ui/shared/use-mobile";

export type MobileFieldKey = string;

export function useMobileFullscreenInteraction() {
  const isMobile = useIsMobile();
  const [activeField, setActiveField] = useState<MobileFieldKey | null>(null);

  const openField = useCallback(
    (key: MobileFieldKey) => {
      if (!isMobile) return;
      setActiveField(key);
    },
    [isMobile],
  );

  const closeField = useCallback(() => {
    setActiveField(null);
  }, []);

  const isFieldOpen = useCallback(
    (key: MobileFieldKey) => isMobile && activeField === key,
    [activeField, isMobile],
  );

  const showInlinePanel = useCallback(
    (legacyOpen: boolean) => legacyOpen && !isMobile,
    [isMobile],
  );

  return {
    isMobile,
    activeField,
    openField,
    closeField,
    isFieldOpen,
    showInlinePanel,
  };
}
