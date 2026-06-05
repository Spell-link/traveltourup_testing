"use client";

import React, { Children, forwardRef, isValidElement, useMemo } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { INPUT_FIELD_CLASS } from "./inputFieldStyles";

export type NativeSelectProps = {
  label?: string;
  error?: string;
  errorId?: string;
  wrapperClassName?: string;
  /** Extra classes on the outer wrapper (e.g. sm:col-span-2) */
  className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
    children: React.ReactNode;
  };

/** Radix Select items cannot use an empty string as `value`. */
const EMPTY_ITEM_VALUE = "__native_select_empty__";

type ParsedOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

function toRadixValue(value: string): string {
  return value === "" ? EMPTY_ITEM_VALUE : value;
}

function fromRadixValue(value: string): string {
  return value === EMPTY_ITEM_VALUE ? "" : value;
}

function parseOptions(children: React.ReactNode): ParsedOption[] {
  const options: ParsedOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string; disabled?: boolean; children?: React.ReactNode }>(child)) {
      return;
    }
    if (child.type !== "option") {
      return;
    }
    options.push({
      value: child.props.value == null ? "" : String(child.props.value),
      label: child.props.children,
      disabled: child.props.disabled,
    });
  });
  return options;
}

function createChangeEvent(
  value: string,
  name: string | undefined,
): React.ChangeEvent<HTMLSelectElement> {
  const target = { value, name } as HTMLSelectElement;
  return { target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>;
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  {
    label,
    error,
    errorId,
    wrapperClassName = "",
    className = "",
    id,
    children,
    disabled,
    value,
    defaultValue,
    onChange,
    name,
    ...props
  },
  ref,
) {
  const options = useMemo(() => parseOptions(children), [children]);
  const selectId =
    id || (typeof name === "string" ? name : label?.toLowerCase().replace(/\s+/g, "-")) || "select";
  const errorMessageId = errorId ?? (error ? `${selectId}-error` : undefined);

  const stringValue = value == null ? undefined : String(value);
  const isControlled = value !== undefined;

  const handleValueChange = (next: string) => {
    onChange?.(createChangeEvent(fromRadixValue(next), name));
  };

  const radixValue =
    isControlled && stringValue !== undefined ? toRadixValue(stringValue) : undefined;

  return (
    <div className={cn("flex w-full min-w-0 max-w-full flex-col gap-1", wrapperClassName)}>
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground dark:text-white">
          {label}
        </label>
      ) : null}
      <div className="relative min-w-0 max-w-full">
        <SelectPrimitive.Root
          value={radixValue}
          defaultValue={
            !isControlled && defaultValue != null ? toRadixValue(String(defaultValue)) : undefined
          }
          onValueChange={handleValueChange}
          disabled={disabled}
          name={name}
        >
          <SelectPrimitive.Trigger
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? (errorMessageId ?? undefined) : undefined}
            className={cn(
              INPUT_FIELD_CLASS,
              "flex cursor-pointer items-center justify-between gap-2 pr-10 text-left",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "[&>span]:line-clamp-1 [&>span]:min-w-0",
              error && "ring-2 ring-destructive/60",
              className,
            )}
          >
            <SelectPrimitive.Value />
            <SelectPrimitive.Icon asChild>
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              >
                <ChevronDown className="h-4 w-4" />
              </span>
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className={cn(
                "z-50 max-h-60 overflow-hidden rounded-md border border-input bg-card text-foreground shadow-md",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[side=bottom]:slide-in-from-top-2",
              )}
            >
              <SelectPrimitive.Viewport className="w-[var(--radix-select-trigger-width)] p-1">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value === "" ? EMPTY_ITEM_VALUE : option.value}
                    value={toRadixValue(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none",
                      "focus:bg-primary/10 data-[highlighted]:bg-primary/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-4 w-4 text-primary" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText className="truncate">
                      {option.label}
                    </SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {/* Hidden native select for ref + progressive enhancement */}
        <select
          ref={ref}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          disabled={disabled}
          value={stringValue ?? ""}
          name={name}
          onChange={() => {}}
          {...props}
        >
          {children}
        </select>
      </div>
      {error ? (
        <p id={errorMessageId} className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
});
