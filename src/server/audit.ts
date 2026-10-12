import { randomUUID } from "node:crypto";
import {
  SyntheticAuditEventSchema, SyntheticAuditEventInputSchema, SyntheticAuditSnapshotSchema,
  type SyntheticAuditEvent, type SyntheticAuditEventInput, type SyntheticAuditSnapshot,
  type SyntheticAuditPersistence,
} from "../domain/audit";
export * from "../domain/audit";

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
