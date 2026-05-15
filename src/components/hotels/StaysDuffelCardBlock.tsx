"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { DuffelCardForm, useDuffelCardFormActions,DuffelCardFormStyles  } from "@duffel/components";

export type StaysDuffelCardBlockHandle = {
  tokenizeCard: () => Promise<{ card_id: string }>;
};
type Props = {
  clientKey: string;
  onValidityChange?: (isValid: boolean) => void;
};

type PendingRequest = {
  resolve: (value: { card_id: string }) => void;
  reject: (reason: Error) => void;
};

export const StaysDuffelCardBlock = forwardRef<
  StaysDuffelCardBlockHandle,
  Props
>(function StaysDuffelCardBlock({ clientKey, onValidityChange }, ref) {
  const { ref: cardFormRef, createCardForTemporaryUse } =
    useDuffelCardFormActions();
  const pendingRef = useRef<PendingRequest | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      tokenizeCard: () =>
        new Promise<{ card_id: string }>((resolve, reject) => {
          if (pendingRef.current) {
            reject(new Error("Card tokenization is already in progress."));
            return;
          }

          pendingRef.current = { resolve, reject };
          createCardForTemporaryUse();
        }),
    }),
    [createCardForTemporaryUse],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Payment details</h3>
        <p className="text-sm text-muted-foreground">
          Secure card processing via Duffel
        </p>
      </div>
      <div className="rounded-xl bg-card p-4 border border-border/50 text-sm font-medium ">
        <DuffelCardForm
          ref={cardFormRef}
          clientKey={clientKey}
          intent="to-create-card-for-temporary-use"
          onValidateSuccess={() => onValidityChange?.(true)}
          onValidateFailure={() => onValidityChange?.(false)}
          onCreateCardForTemporaryUseSuccess={(data) => {
            const pending = pendingRef.current;
            pendingRef.current = null;
            pending?.resolve({ card_id: data.id });
          }}
          onCreateCardForTemporaryUseFailure={(error) => {
            const pending = pendingRef.current;
            pendingRef.current = null;
            pending?.reject(
              new Error(error.message || "Could not tokenize card."),
            );
          }}
          onSecurityPolicyViolation={(data) => {
            const pending = pendingRef.current;
            pendingRef.current = null;
            pending?.reject(
              new Error(
                `Security policy violation: ${data.violated_directive}`,
              ),
            );
          }}
        />
      </div>
    </div>
  );
});
