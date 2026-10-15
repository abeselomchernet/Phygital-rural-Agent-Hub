import { closeSync, fsyncSync, openSync } from "node:fs";

export type DirectoryFsyncResult = "SYNCED" | "UNSUPPORTED_WINDOWS";

/**
 * Flush a directory entry after atomic rename where the host/runtime supports
 * directory fsync. Node on Windows rejects fsync on directory handles with
 * EPERM, so the Windows path deliberately records the limitation instead of
 * converting a successful file fsync + rename into a false persistence
 * failure. This helper does not make a production durability guarantee.
 */
export function fsyncDirectoryEntrySync(directory: string): DirectoryFsyncResult {
  if (process.platform === "win32") return "UNSUPPORTED_WINDOWS";

  let descriptor: number | undefined;
  try {
    descriptor = openSync(directory, "r");
    fsyncSync(descriptor);
    return "SYNCED";
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
