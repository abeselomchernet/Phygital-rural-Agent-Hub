import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { fsyncDirectoryEntrySync } from "./local-directory-fsync";

export interface SyntheticSessionPersistence {
  readonly mode: "MEMORY" | "ATOMIC_DIRECTORY";
  readonly durable: boolean;
  load(sessionId: string): unknown | undefined;
  save(sessionId: string, expiresAtMs: number, value: unknown): void;
  remove(sessionId: string): void;
  sweepExpired(nowMs: number): number;
}

type PersistedEnvelope = {
  schemaVersion: 1;
  sessionId: string;
  expiresAtMs: number;
  value: unknown;
};

function safeSessionId(sessionId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId))
    throw new Error("SESSION_PERSISTENCE_ID_INVALID");
  return sessionId;
}

function parseEnvelope(raw: string, expectedSessionId?: string): PersistedEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SESSION_PERSISTENCE_CORRUPT");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as any).schemaVersion !== 1 ||
    typeof (parsed as any).sessionId !== "string" ||
    !Number.isSafeInteger((parsed as any).expiresAtMs) ||
    (parsed as any).expiresAtMs <= 0 ||
    !("value" in (parsed as any))
  )
    throw new Error("SESSION_PERSISTENCE_CORRUPT");
  const envelope = parsed as PersistedEnvelope;
  safeSessionId(envelope.sessionId);
  if (expectedSessionId && envelope.sessionId !== expectedSessionId)
    throw new Error("SESSION_PERSISTENCE_CORRUPT");
  return envelope;
}

export class InMemorySyntheticSessionPersistence implements SyntheticSessionPersistence {
  readonly mode = "MEMORY" as const;
  readonly durable = false;
  private records = new Map<string, PersistedEnvelope>();

  load(sessionId: string) {
    const record = this.records.get(safeSessionId(sessionId));
    return record?.value;
  }

  save(sessionId: string, expiresAtMs: number, value: unknown) {
    const id = safeSessionId(sessionId);
    if (this.records.has(id)) throw new Error("SESSION_PERSISTENCE_CONFLICT");
    this.records.set(id, { schemaVersion: 1, sessionId: id, expiresAtMs, value });
  }

  remove(sessionId: string) {
    this.records.delete(safeSessionId(sessionId));
  }

  sweepExpired(nowMs: number) {
    let removed = 0;
    for (const [sessionId, record] of this.records.entries()) {
      if (record.expiresAtMs <= nowMs) {
        this.records.delete(sessionId);
        removed += 1;
      }
    }
    return removed;
  }
}

export class AtomicDirectorySyntheticSessionPersistence implements SyntheticSessionPersistence {
  readonly mode = "ATOMIC_DIRECTORY" as const;
  readonly durable = true;

  constructor(private readonly directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }

  private file(sessionId: string) {
    return path.join(this.directory, `${safeSessionId(sessionId)}.json`);
  }

  load(sessionId: string) {
    const id = safeSessionId(sessionId);
    const file = this.file(id);
    if (!existsSync(file)) return undefined;
    return parseEnvelope(readFileSync(file, "utf8"), id).value;
  }

  save(sessionId: string, expiresAtMs: number, value: unknown) {
    const id = safeSessionId(sessionId);
    if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0)
      throw new Error("SESSION_PERSISTENCE_EXPIRY_INVALID");
    const target = this.file(id);
    if (existsSync(target)) throw new Error("SESSION_PERSISTENCE_CONFLICT");
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const temp = path.join(this.directory, `.${id}.${process.pid}.${Date.now()}.tmp`);
    const body = JSON.stringify({ schemaVersion: 1, sessionId: id, expiresAtMs, value } satisfies PersistedEnvelope);
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temp, "wx", 0o600);
      writeFileSync(descriptor, body, "utf8");
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      if (existsSync(target)) throw new Error("SESSION_PERSISTENCE_CONFLICT");
      renameSync(temp, target);
      fsyncDirectoryEntrySync(this.directory);
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      if (existsSync(temp)) rmSync(temp, { force: true });
    }
  }

  remove(sessionId: string) {
    const target = this.file(sessionId);
    if (!existsSync(target)) return;
    rmSync(target, { force: true });
    fsyncDirectoryEntrySync(this.directory);
  }

  sweepExpired(nowMs: number) {
    let removed = 0;
    for (const name of readdirSync(this.directory)) {
      if (!name.endsWith(".json")) continue;
      const file = path.join(this.directory, name);
      const envelope = parseEnvelope(readFileSync(file, "utf8"));
      if (envelope.expiresAtMs <= nowMs) {
        rmSync(file, { force: true });
        removed += 1;
      }
    }
    if (removed > 0) fsyncDirectoryEntrySync(this.directory);
    return removed;
  }
}


export function createConfiguredSyntheticSessionPersistence(input: {
  syntheticStateDir?: string;
  requireDurable: boolean;
}): SyntheticSessionPersistence | undefined {
  if (!input.syntheticStateDir) {
    if (input.requireDurable) throw new Error("DURABLE_SESSION_STORE_REQUIRED");
    return undefined;
  }
  return new AtomicDirectorySyntheticSessionPersistence(
    path.join(input.syntheticStateDir, "sessions"),
  );
}
