import { openDB } from "idb";
import {
  EnvelopeSchema,
  type Envelope,
  type TransportState,
} from "../domain/transport";
export const remoteSyncEnabled = false;
// Legacy GhostSyncDB is left untouched: no automatic migration or upload of old PII.
const database = () =>
  openDB("EnawugaSyntheticOutbox", 1, {
    upgrade(db) {
      db.createObjectStore("outbox", { keyPath: "row_key" });
    },
  });
export interface QueuedEvent {
  row_key: string;
  type: "transaction";
  payload: Envelope;
  created_at: string;
  status: "pending" | "failed";
  retry_count: number;
  transportState: TransportState;
  financialState: "PARTNER_AUTH_PENDING";
}
export function initGhostSync() {
  void database();
}
export async function addEventToQueue(type: string, input: unknown) {
  if (type !== "transaction") throw new Error("LEGACY_PAYLOAD_DISABLED");
  const payload = EnvelopeSchema.parse(input),
    db = await database();
  const tx = db.transaction("outbox", "readwrite");
  const old = (await tx.store.get(payload.eventId)) as QueuedEvent | undefined;
  if (old && JSON.stringify(old.payload) !== JSON.stringify(payload)) {
    tx.abort();
    throw new Error("EVENT_REPLAY_CONFLICT");
  }
  if (!old)
    await tx.store.add({
      row_key: payload.eventId,
      type: "transaction",
      payload,
      created_at: payload.createdAt,
      status: "pending",
      retry_count: 0,
      transportState: "QUEUED_FOR_SYNC",
      financialState: "PARTNER_AUTH_PENDING",
    } satisfies QueuedEvent);
  await tx.done;
  return payload.eventId;
}
export async function getPendingEvents(): Promise<QueuedEvent[]> {
  return (await database()).getAll("outbox");
}
export async function clearEvent(id: string) {
  await (await database()).delete("outbox", id);
}
export async function retryEvent(id: string) {
  const db = await database(),
    tx = db.transaction("outbox", "readwrite");
  const event = (await tx.store.get(id)) as QueuedEvent | undefined;
  if (event) {
    event.status = "pending";
    event.retry_count++;
    await tx.store.put(event);
  }
  await tx.done;
}
export async function syncEvents() {
  // Reconnect never changes balances, removes records, or pretends delivery succeeded.
  return {
    enabled: false,
    reason: "AUTHENTICATED_DURABLE_RECEIVER_REQUIRED",
  } as const;
}
