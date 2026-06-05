"use client";

import type { ReactNode } from "react";
import { useVisualViewportBottomInset } from "@/hooks/use-visual-viewport-bottom-inset";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Scrollable auth form column — native overflow for reliable touch/keyboard scrolling on mobile.
 */
export function AuthFormScrollPane({ children, className }: Props) {
  const keyboardInset = useVisualViewportBottomInset();

  return (
    <div
      className={cn(
        "min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y",
        "[-webkit-overflow-scrolling:touch]",
        className,
      )}
      style={{
        scrollPaddingBottom: "max(6rem, env(safe-area-inset-bottom, 0px))",
        paddingBottom:
          keyboardInset > 0
            ? `calc(${keyboardInset}px + max(1.5rem, env(safe-area-inset-bottom, 0px)))`
            : undefined,
      }}
    >
      <div
        className={cn(
          "mx-auto flex w-full min-w-0 max-w-xl flex-col justify-start overflow-x-hidden px-4 py-4 md:px-8 lg:min-h-full lg:justify-center lg:py-8 xl:px-12",
          keyboardInset === 0 &&
            "pb-[max(12rem,calc(env(safe-area-inset-bottom,0px)+6rem))] md:pb-8 lg:pb-8",
        )}
      >
        <div className="w-full min-w-0 rounded-2xl border border-white/25 bg-card/93 p-5 shadow-2xl backdrop-blur-md sm:p-6 md:p-7 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
          {children}
        </div>
      </div>
    </div>
  );
}
