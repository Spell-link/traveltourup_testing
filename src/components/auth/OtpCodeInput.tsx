"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/Input";
import { authInputClass } from "@/components/auth/authFormStyles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  name?: string;
};

export function OtpCodeInput({ value, onChange, disabled, error, name = "token" }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      <Input
        ref={ref}
        id="otp-code"
        name={name}
        label="Verification code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        pattern="\d{6}"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, 6))
        }
        disabled={disabled}
        className={`${authInputClass} text-center text-lg tracking-[0.35em]`}
        error={error}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">Enter the 6-digit code sent to your phone.</p>
    </div>
  );
}
