import { SyntheticAuthError } from "./auth";

export interface SessionStartRateLimitConfig {
  rateWindowMs?: number;
  maxRequestsPerWindow?: number;
}

export class SyntheticSessionStartRateLimiter {
  private readonly counters = new Map<
    string,
    { startedAt: number; count: number }
  >();
  private readonly rateWindowMs: number;
  private readonly maxRequestsPerWindow: number;

  constructor(config: SessionStartRateLimitConfig = {}) {
    this.rateWindowMs = config.rateWindowMs ?? 60_000;
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 20;
    if (!Number.isSafeInteger(this.rateWindowMs) || this.rateWindowMs <= 0)
      throw new Error("SESSION_START_RATE_WINDOW_INVALID");
    if (
      !Number.isSafeInteger(this.maxRequestsPerWindow) ||
      this.maxRequestsPerWindow <= 0
    )
      throw new Error("SESSION_START_RATE_LIMIT_INVALID");
  }

  consume(clientKey: string) {
    const key = clientKey.trim() || "unknown";
    const now = Date.now();
    const current = this.counters.get(key);
    if (!current || now - current.startedAt >= this.rateWindowMs) {
      this.counters.set(key, { startedAt: now, count: 1 });
      return;
    }
    current.count += 1;
    if (current.count > this.maxRequestsPerWindow)
      throw new SyntheticAuthError("SESSION_START_RATE_LIMITED", 429);
  }
}
