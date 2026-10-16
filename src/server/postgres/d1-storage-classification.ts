import { z } from "zod";

export const D1StorageClassSchema = z.enum([
  "TRANSACTIONAL_STATE",
  "APPEND_ONLY_EVIDENCE",
  "AUDIT_EVENT",
  "EPHEMERAL_CACHE",
  "OFFLINE_EDGE_STATE",
  "DERIVED_PROJECTION",
  "CONFIGURATION",
  "CONTENT_BUNDLE",
  "EXTERNAL_REFERENCE",
]);

export type D1StorageClass = z.infer<typeof D1StorageClassSchema>;

export const D1_STORAGE_CLASSES = D1StorageClassSchema.options;

export const D1_STORAGE_CLASS_TARGETS: Readonly<Record<D1StorageClass, string>> = {
  TRANSACTIONAL_STATE: "postgresql-transactional",
  APPEND_ONLY_EVIDENCE: "postgresql-append-only",
  AUDIT_EVENT: "postgresql-append-only",
  EPHEMERAL_CACHE: "runtime-ephemeral",
  OFFLINE_EDGE_STATE: "edge-local",
  DERIVED_PROJECTION: "derived",
  CONFIGURATION: "postgresql-versioned",
  CONTENT_BUNDLE: "governed-content-store",
  EXTERNAL_REFERENCE: "postgresql-append-only",
};
