"use client";

import { INPUT_FIELD_CLASS } from "@/components/ui/inputFieldStyles";

type Props = {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  id?: string;
  disabled?: boolean;
  min?: string;
};

function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function FlightChangeDateField({
  label,
  value,
  onChange,
  id,
  disabled,
  min,
}: Props) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="date"
        min={min ?? todayYmdLocal()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={INPUT_FIELD_CLASS}
      />
    </div>
  );
}
