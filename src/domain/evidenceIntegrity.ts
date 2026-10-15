import { createHash } from "node:crypto";

export function canonicalizeEvidenceValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("EVIDENCE_CANONICALIZATION_NON_FINITE_NUMBER");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return `[${value.map(canonicalizeEvidenceValue).join(",")}]`;
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      throw new Error("EVIDENCE_CANONICALIZATION_NON_PLAIN_OBJECT");
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeEvidenceValue(record[key])}`,
      )
      .join(",")}}`;
  }
  throw new Error("EVIDENCE_CANONICALIZATION_UNSUPPORTED_VALUE");
}

export function computeCanonicalSha256(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(canonicalizeEvidenceValue(value))
    .digest("hex")}`;
}
