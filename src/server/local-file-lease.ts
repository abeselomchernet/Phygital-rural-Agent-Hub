import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname } from "node:path";

import { fsyncDirectoryEntrySync } from "./local-directory-fsync";

const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
const OWNER_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LocalFileLeaseRecord = {
  schemaVersion: 1;
  owner: string;
  pid: number;
  host: string;
  createdAtMs: number;
  leaseExpiresAtMs: number;
};

export type LocalFileLease = LocalFileLeaseRecord & {
  lockPath: string;
};

export type LocalFileLeaseOptions = {
  lockPath: string;
  waitMs: number;
  leaseMs: number;
  lockedErrorCode: string;
  ownershipLostErrorCode: string;
  staleRecoveryErrorCode: string;
};

function sleepSync(milliseconds: number) {
  if (milliseconds > 0) Atomics.wait(waitBuffer, 0, 0, milliseconds);
}

function validateOptions(options: LocalFileLeaseOptions) {
  if (!Number.isSafeInteger(options.waitMs) || options.waitMs < 0 || options.waitMs > 30_000)
    throw new Error("LOCAL_FILE_LEASE_WAIT_INVALID");
  if (!Number.isSafeInteger(options.leaseMs) || options.leaseMs < 1 || options.leaseMs > 300_000)
    throw new Error("LOCAL_FILE_LEASE_TTL_INVALID");
}

function parseLeaseRecord(raw: string): LocalFileLeaseRecord | undefined {
  try {
    const candidate = JSON.parse(raw) as Record<string, unknown>;
    if (
      !candidate ||
      candidate.schemaVersion !== 1 ||
      typeof candidate.owner !== "string" ||
      !OWNER_PATTERN.test(candidate.owner) ||
      !Number.isSafeInteger(candidate.pid) ||
      (candidate.pid as number) <= 0 ||
      typeof candidate.host !== "string" ||
      candidate.host.length < 1 ||
      candidate.host.length > 255 ||
      !Number.isSafeInteger(candidate.createdAtMs) ||
      !Number.isSafeInteger(candidate.leaseExpiresAtMs) ||
      (candidate.leaseExpiresAtMs as number) <= (candidate.createdAtMs as number)
    )
      return undefined;
    return {
      schemaVersion: 1,
      owner: candidate.owner,
      pid: candidate.pid as number,
      host: candidate.host,
      createdAtMs: candidate.createdAtMs as number,
      leaseExpiresAtMs: candidate.leaseExpiresAtMs as number,
    };
  } catch {
    return undefined;
  }
}

function restoreQuarantinedLock(lockPath: string, quarantinePath: string) {
  if (existsSync(lockPath) || !existsSync(quarantinePath)) return;
  try {
    renameSync(quarantinePath, lockPath);
  } catch {
    // Fail-closed caller will surface recovery/ownership loss.
  }
}

function recoverStaleLock(options: LocalFileLeaseOptions, nowMs: number) {
  if (!existsSync(options.lockPath)) return true;

  let observedRaw: string;
  let observedMtimeMs: number;
  try {
    observedRaw = readFileSync(options.lockPath, "utf8");
    observedMtimeMs = statSync(options.lockPath).mtimeMs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw new Error(options.staleRecoveryErrorCode);
  }

  const observed = parseLeaseRecord(observedRaw);
  const stale = observed
    ? observed.leaseExpiresAtMs <= nowMs
    : observedMtimeMs <= nowMs - options.leaseMs;
  if (!stale) return false;

  const quarantinePath = `${options.lockPath}.stale.${randomUUID()}`;
  try {
    renameSync(options.lockPath, quarantinePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return true;
    if (code === "EACCES" || code === "EPERM") return false;
    throw new Error(options.staleRecoveryErrorCode);
  }

  try {
    const quarantinedRaw = readFileSync(quarantinePath, "utf8");
    const quarantined = parseLeaseRecord(quarantinedRaw);
    const sameObservedLock = quarantinedRaw === observedRaw;
    const stillStale = quarantined
      ? quarantined.leaseExpiresAtMs <= nowMs
      : statSync(quarantinePath).mtimeMs <= nowMs - options.leaseMs;

    if (!sameObservedLock || !stillStale) {
      restoreQuarantinedLock(options.lockPath, quarantinePath);
      throw new Error(options.staleRecoveryErrorCode);
    }

    unlinkSync(quarantinePath);
    fsyncDirectoryEntrySync(dirname(options.lockPath));
    return true;
  } catch (error) {
    restoreQuarantinedLock(options.lockPath, quarantinePath);
    if (error instanceof Error && error.message === options.staleRecoveryErrorCode)
      throw error;
    throw new Error(options.staleRecoveryErrorCode);
  }
}

export function acquireLocalFileLeaseSync(
  options: LocalFileLeaseOptions,
): LocalFileLease {
  validateOptions(options);
  const directory = dirname(options.lockPath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const startedAtMs = Date.now();

  while (true) {
    const nowMs = Date.now();
    const record: LocalFileLeaseRecord = {
      schemaVersion: 1,
      owner: randomUUID(),
      pid: process.pid,
      host: hostname(),
      createdAtMs: nowMs,
      leaseExpiresAtMs: nowMs + options.leaseMs,
    };
    let descriptor: number | undefined;
    let createdByUs = false;
    try {
      descriptor = openSync(options.lockPath, "wx", 0o600);
      createdByUs = true;
      writeFileSync(descriptor, JSON.stringify(record), "utf8");
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      fsyncDirectoryEntrySync(directory);
      return { ...record, lockPath: options.lockPath };
    } catch (error) {
      if (descriptor !== undefined) {
        try {
          closeSync(descriptor);
        } catch {
          // Acquisition already fails closed below.
        }
      }
      if (createdByUs) {
        try {
          if (existsSync(options.lockPath)) unlinkSync(options.lockPath);
          fsyncDirectoryEntrySync(directory);
        } catch {
          throw new Error(options.staleRecoveryErrorCode);
        }
        throw error;
      }
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      if (recoverStaleLock(options, nowMs)) continue;
      if (Date.now() - startedAtMs >= options.waitMs)
        throw new Error(options.lockedErrorCode);
      sleepSync(Math.min(10, Math.max(1, options.waitMs)));
    }
  }
}

export function releaseLocalFileLeaseSync(
  lease: LocalFileLease,
  options: LocalFileLeaseOptions,
) {
  let observed: LocalFileLeaseRecord | undefined;
  try {
    observed = parseLeaseRecord(readFileSync(lease.lockPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(options.ownershipLostErrorCode);
    throw new Error(options.ownershipLostErrorCode);
  }
  if (!observed || observed.owner !== lease.owner)
    throw new Error(options.ownershipLostErrorCode);

  const releasePath = `${lease.lockPath}.release.${lease.owner}`;
  try {
    renameSync(lease.lockPath, releasePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(options.ownershipLostErrorCode);
    throw error;
  }

  try {
    const current = parseLeaseRecord(readFileSync(releasePath, "utf8"));
    if (!current || current.owner !== lease.owner) {
      restoreQuarantinedLock(lease.lockPath, releasePath);
      throw new Error(options.ownershipLostErrorCode);
    }
    unlinkSync(releasePath);
    fsyncDirectoryEntrySync(dirname(lease.lockPath));
  } catch (error) {
    restoreQuarantinedLock(lease.lockPath, releasePath);
    if (error instanceof Error && error.message === options.ownershipLostErrorCode)
      throw error;
    throw new Error(options.ownershipLostErrorCode);
  }
}

export function withLocalFileLeaseSync<T>(
  options: LocalFileLeaseOptions,
  action: () => T,
): T {
  const lease = acquireLocalFileLeaseSync(options);
  let actionFailed = false;
  try {
    return action();
  } catch (error) {
    actionFailed = true;
    throw error;
  } finally {
    try {
      releaseLocalFileLeaseSync(lease, options);
    } catch (error) {
      if (!actionFailed) throw error;
    }
  }
}
