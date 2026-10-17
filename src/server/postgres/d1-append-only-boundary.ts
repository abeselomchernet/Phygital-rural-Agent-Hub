import type { Pool } from "pg";
import { SyntheticAuditEventSchema } from "../../domain/audit";
import { d1CanonicalPayloadSha256 } from "./d1-async-boundary";

export class PostgresD1AppendOnlyBoundary {
  constructor(private readonly pool: Pool) {}

  async appendSyntheticAuditEvent(event: unknown) {
    const payload = SyntheticAuditEventSchema.parse(event);
    const digest = d1CanonicalPayloadSha256(payload);
    const result = await this.pool.query(
      "INSERT INTO enawuga.audit_event (event_digest, payload) " +
        "VALUES ($1, $2::jsonb) ON CONFLICT (event_digest) DO NOTHING RETURNING sequence",
      [digest, JSON.stringify(payload)],
    );
    return { inserted: result.rowCount === 1, digest };
  }

  async loadSyntheticAuditEventByDigest(digest: string) {
    const result = await this.pool.query(
      "SELECT payload FROM enawuga.audit_event WHERE event_digest = $1",
      [digest],
    );
    if (!result.rowCount) return undefined;
    const payload = SyntheticAuditEventSchema.parse(result.rows[0]?.payload);
    if (d1CanonicalPayloadSha256(payload) !== digest)
      throw new Error("D1_POSTGRES_AUDIT_DIGEST_MISMATCH");
    return payload;
  }
}
