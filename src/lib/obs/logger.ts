import "server-only";

/**
 * Minimal JSON structured logger for the server runtime. One JSON object per
 * line so any log aggregator (CloudWatch / Vercel logs / Datadog / Loki) can
 * parse without configuration. Keep dependencies-free.
 *
 * Always emit fields useful for grepping a booking saga:
 *  - request_id (per HTTP request, see `getRequestId` middleware)
 *  - booking_id
 *  - pit_id (Duffel `pit_*`)
 *  - error_code (your AppError.code or Duffel code)
 *
 * Never log card numbers, full PIIs, or access tokens. PII OK in dev only.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
  request_id?: string | null;
  user_id?: string | null;
  booking_id?: string | null;
  pit_id?: string | null;
  duffel_order_id?: string | null;
  duffel_refund_id?: string | null;
  duffel_cancellation_id?: string | null;
  error_code?: string | null;
  /** Free-form extension — keep values JSON-serialisable and PII-safe. */
  [key: string]: unknown;
};

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function activeMin(): number {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === "debug" || env === "info" || env === "warn" || env === "error") {
    return LEVEL_RANK[env];
  }
  return process.env.NODE_ENV === "production" ? LEVEL_RANK.info : LEVEL_RANK.debug;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ unserialisable: String(value) });
  }
}

function emit(level: LogLevel, msg: string, ctx?: LogContext): void {
  if (LEVEL_RANK[level] < activeMin()) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx ?? {}),
  };
  const out = safeJson(line);
  switch (level) {
    case "error":
      console.error(out);
      return;
    case "warn":
      console.warn(out);
      return;
    default:
      console.log(out);
  }
}

export const logger = {
  debug(msg: string, ctx?: LogContext) {
    emit("debug", msg, ctx);
  },
  info(msg: string, ctx?: LogContext) {
    emit("info", msg, ctx);
  },
  warn(msg: string, ctx?: LogContext) {
    emit("warn", msg, ctx);
  },
  error(msg: string, ctx?: LogContext) {
    emit("error", msg, ctx);
  },
  /** Returns a child logger that always merges the given context. */
  withContext(base: LogContext) {
    return {
      debug: (msg: string, ctx?: LogContext) =>
        emit("debug", msg, { ...base, ...ctx }),
      info: (msg: string, ctx?: LogContext) =>
        emit("info", msg, { ...base, ...ctx }),
      warn: (msg: string, ctx?: LogContext) =>
        emit("warn", msg, { ...base, ...ctx }),
      error: (msg: string, ctx?: LogContext) =>
        emit("error", msg, { ...base, ...ctx }),
    };
  },
};

export type Logger = typeof logger;
