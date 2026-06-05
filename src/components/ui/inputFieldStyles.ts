/**
 * Unified text-field look (Contact, auth, booking, payment, filters).
 * Muted inset surface + primary focus ring — matches dark/light theme tokens.
 */
export const INPUT_FIELD_CLASS =
  "box-border h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm "
  // "auth-input-autofill w-full rounded-lg border-0 bg-card px-4 py-3.5 text-sm text-foreground  outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/35 focus:outline-none ";

/**
 * Hero search combobox (Flights/Hotels/Cars tabs): same surface as inputs, with room for floating label.
 */
export const COMBO_FIELD_SHELL_CLASS =
  "w-full border-0 rounded-lg bg-card px-4 py-3 text-sm text-foreground  ring-1 ring-border/35  h-16";

/** Same surface as combo shell, with responsive height for narrow hero rows (hotels/cars tabs). */
export const COMBO_FIELD_SHELL_RESPONSIVE_CLASS =
  "w-full border-0 rounded-lg bg-card px-3 sm:px-4 py-3 text-sm text-foreground  ring-1 ring-border/35  h-14 sm:h-16 pt-4 sm:pt-5";
