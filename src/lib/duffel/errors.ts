export type DuffelErrorItem = {
  /** Duffel / JSON:API style */
  title?: string;
  message?: string;
  code?: string;
  type?: string;
};

function clientSafeMessage(status: number, errors: DuffelErrorItem[]): string {
  const first = errors[0];
  if (first?.message && typeof first.message === "string") {
    return first.message;
  }
  if (first?.title && typeof first.title === "string") {
    return first.title;
  }
  if (status === 429) {
    return "Too many requests to flight supplier. Please try again shortly.";
  }
  if (status >= 500) {
    return "Flight supplier temporarily unavailable. Please try again.";
  }
  return "Flight search or booking request could not be completed. Please try again.";
}

export class DuffelApiError extends Error {
  readonly name = "DuffelApiError";

  constructor(
    /** HTTP status from Duffel response */
    public readonly status: number,
    public readonly duffelErrors: DuffelErrorItem[],
    public readonly retryable: boolean,
    message?: string,
  ) {
    super(message ?? clientSafeMessage(status, duffelErrors));
  }

  /** Short message safe to return from our API layer */
  get clientMessage(): string {
    return clientSafeMessage(this.status, this.duffelErrors);
  }

  get firstDuffelErrorCode(): string | undefined {
    return this.duffelErrors[0]?.code;
  }

  hasDuffelErrorCode(code: string): boolean {
    return this.duffelErrors.some((e) => e.code === code);
  }
}

export function isRetryableDuffelStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
