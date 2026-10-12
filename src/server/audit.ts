import { randomUUID } from "node:crypto";
import { z } from "zod";

const auditCode = z.string().regex(/^[A-Z0-9_:-]{1,64}$/);

export const SyntheticAuditEventSchema = z
  .object({
    eventId: z.string().uuid(),
    at: z.string().datetime(),
    category: z.enum([
      "AUTH",
      "CUSTOMER",
      "KYC",
      "FINANCIAL",
      "RECONCILIATION",
      "RECOVERY",
    ]),
    action: auditCode,
    outcome: z.enum(["ALLOW", "DENY", "SUCCESS", "FAIL", "PENDING"]),
    actor: z
      .object({
        userId: z.string().min(1).max(128),
        role: z.enum([
          "AGENT",
          "SUPERVISOR",
          "PARTNER_ADMIN",
          "SYSTEM",
          "NONE",
        ]),
      })
      .strict(),
    customerId: z.string().uuid().optional(),
    transactionId: z.string().uuid().optional(),
    callbackId: z.string().uuid().optional(),
    stateFrom: auditCode.optional(),
    stateTo: auditCode.optional(),
    code: auditCode.optional(),
    simulated: z.literal(true),
  })
  .strict();
export type SyntheticAuditEvent = z.infer<typeof SyntheticAuditEventSchema>;

export const SyntheticAuditEventInputSchema = SyntheticAuditEventSchema.omit({
  eventId: true,
  at: true,
  simulated: true,
});
export type SyntheticAuditEventInput = z.infer<
  typeof SyntheticAuditEventInputSchema
>;

export const SyntheticAuditSnapshotSchema = z
  .object({
    version: z.literal(1),
    events: z.array(SyntheticAuditEventSchema),
  })
  .strict();
export type SyntheticAuditSnapshot = z.infer<
  typeof SyntheticAuditSnapshotSchema
>;

export interface SyntheticAuditPersistence {
  load(): SyntheticAuditSnapshot | undefined;
  save(snapshot: SyntheticAuditSnapshot): void;
}

/**
 * Synthetic-development audit trail. Entries intentionally allow only stable
 * UUID references and bounded enum/code-like metadata. Raw identity payloads,
 * phone numbers, FIN/FAN, biometrics, session IDs, CSRF tokens, idempotency
 * keys and provider references have no schema field and therefore fail closed.
 */
export class SyntheticAuditLog {
  private events: SyntheticAuditEvent[] = [];

  constructor(
    private persistence?: SyntheticAuditPersistence,
    private maxEntries = 1_000,
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1)
      throw new Error("INVALID_AUDIT_RETENTION_LIMIT");
    const snapshot = persistence?.load();
    if (snapshot) {
      const validated = SyntheticAuditSnapshotSchema.parse(snapshot);
      this.events = validated.events.slice(-this.maxEntries).map((event) => ({
        ...event,
        actor: { ...event.actor },
      }));
      if (validated.events.length > this.maxEntries) this.persist();
    }
  }

  record(input: SyntheticAuditEventInput) {
    const parsed = SyntheticAuditEventInputSchema.parse(input),
      event = SyntheticAuditEventSchema.parse({
        ...parsed,
        eventId: randomUUID(),
        at: new Date().toISOString(),
        simulated: true,
      });
    this.events.push(event);
    if (this.events.length > this.maxEntries)
      this.events.splice(0, this.events.length - this.maxEntries);
    this.persist();
    return structuredClone(event);
  }

  list() {
    return structuredClone(this.events);
  }

  snapshot(): SyntheticAuditSnapshot {
    return SyntheticAuditSnapshotSchema.parse({
      version: 1,
      events: this.events,
    });
  }

  private persist() {
    this.persistence?.save(this.snapshot());
  }
}
