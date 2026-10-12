import type { SyntheticAuditSink } from "./audit";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { PartnerResult } from "./financial";

export type PartnerOperationState =
  | "PENDING_PARTNER_RESULT"
  | "AUTHORIZED_NOT_SETTLED"
  | "REJECTED"
  | "OUTCOME_UNCERTAIN"
  | "RECONCILIATION_REQUIRED"
  | "SETTLED_BY_PARTNER";

export const PartnerCallbackSchema = z
  .object({
    callbackId: z.string().uuid(),
    transactionId: z.string().uuid(),
    sequence: z.number().int().positive(),
    eventType: z.enum([
      "AUTHORIZATION_ACCEPTED",
      "AUTHORIZATION_REJECTED",
      "OUTCOME_UNCERTAIN",
      "RECONCILIATION_REQUIRED",
      "SETTLED",
    ]),
    providerReference: z.string().min(1).max(128),
    occurredAt: z.string().datetime(),
  })
  .strict();
export type PartnerCallback = z.infer<typeof PartnerCallbackSchema>;

export interface PartnerOperation {
  transactionId: string;
  customerId: string;
  state: PartnerOperationState;
  lastProviderSequence: number;
  providerReference?: string;
  updatedAt: string;
  simulated: true;
}

const PartnerOperationSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    state: z.enum([
      "PENDING_PARTNER_RESULT",
      "AUTHORIZED_NOT_SETTLED",
      "REJECTED",
      "OUTCOME_UNCERTAIN",
      "RECONCILIATION_REQUIRED",
      "SETTLED_BY_PARTNER",
    ]),
    lastProviderSequence: z.number().int().nonnegative(),
    providerReference: z.string().min(1).max(128).optional(),
    updatedAt: z.string().datetime(),
    simulated: z.literal(true),
  })
  .strict();

export const PartnerReconciliationSnapshotSchema = z
  .object({
    version: z.literal(1),
    operations: z.array(PartnerOperationSchema),
    callbacks: z.array(
      z
        .object({
          callbackId: z.string().uuid(),
          fingerprint: z.string().min(1),
          transactionId: z.string().uuid(),
        })
        .strict(),
    ),
  })
  .strict();
export type PartnerReconciliationSnapshot = z.infer<
  typeof PartnerReconciliationSnapshotSchema
>;

export interface PartnerReconciliationPersistence {
  load(): PartnerReconciliationSnapshot | undefined;
  save(snapshot: PartnerReconciliationSnapshot): void;
}

export interface PartnerCallbackVerifier {
  verify(rawBody: string, signature: string): boolean;
}

/**
 * Local-test verifier only. The caller supplies an ephemeral test secret; no
 * provider credential is hardcoded or implied. A real provider verifier must
 * be implemented from an approved partner contract before any live callback.
 */
export class MockPartnerCallbackVerifier implements PartnerCallbackVerifier {
  constructor(private readonly testSecret: string) {
    if (testSecret.length < 16) throw new Error("TEST_CALLBACK_SECRET_TOO_SHORT");
  }

  sign(rawBody: string) {
    return createHmac("sha256", this.testSecret).update(rawBody).digest("hex");
  }

  verify(rawBody: string, signature: string) {
    const expected = this.sign(rawBody),
      left = Buffer.from(expected),
      right = Buffer.from(signature);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}

function callbackFingerprint(callback: PartnerCallback) {
  return JSON.stringify(callback);
}

function initialState(result: PartnerResult): PartnerOperationState {
  switch (result.state) {
    case "PARTNER_AUTH_PENDING":
      return "PENDING_PARTNER_RESULT";
    case "PARTNER_ACCEPTED":
      return "AUTHORIZED_NOT_SETTLED";
    case "PARTNER_REJECTED":
      return "REJECTED";
    case "RECONCILIATION_REQUIRED":
      return "OUTCOME_UNCERTAIN";
  }
}

function transition(
  current: PartnerOperationState,
  event: PartnerCallback["eventType"],
): PartnerOperationState {
  if (current === "SETTLED_BY_PARTNER") {
    if (event === "SETTLED") return current;
    throw new Error("TERMINAL_PARTNER_STATE_REGRESSION");
  }
  if (current === "REJECTED") {
    if (event === "AUTHORIZATION_REJECTED") return current;
    throw new Error("TERMINAL_PARTNER_STATE_REGRESSION");
  }

  switch (event) {
    case "AUTHORIZATION_ACCEPTED":
      return "AUTHORIZED_NOT_SETTLED";
    case "AUTHORIZATION_REJECTED":
      return "REJECTED";
    case "OUTCOME_UNCERTAIN":
      return "OUTCOME_UNCERTAIN";
    case "RECONCILIATION_REQUIRED":
      return "RECONCILIATION_REQUIRED";
    case "SETTLED":
      // Settlement is represented only because this is an explicit authenticated
      // partner event; transport delivery and authorization never set this state.
      return "SETTLED_BY_PARTNER";
  }
}

export class PartnerReconciliationService {
  private operations = new Map<string, PartnerOperation>();
  private callbacks = new Map<
    string,
    { fingerprint: string; transactionId: string }
  >();

  constructor(
    private verifier: PartnerCallbackVerifier,
    private persistence?: PartnerReconciliationPersistence,
    private audit?: SyntheticAuditSink,
  ) {
    const snapshot = persistence?.load();
    if (snapshot) this.restore(snapshot);
  }

  registerPartnerResult(result: PartnerResult) {
    const existing = this.operations.get(result.transactionId);
    if (existing) {
      if (existing.customerId !== result.customerId)
        throw new Error("PARTNER_OPERATION_CUSTOMER_CONFLICT");
      return structuredClone(existing);
    }
    const operation: PartnerOperation = {
      transactionId: result.transactionId,
      customerId: result.customerId,
      state: initialState(result),
      lastProviderSequence: 0,
      updatedAt: new Date().toISOString(),
      simulated: true,
    };
    this.operations.set(result.transactionId, operation);
    this.persist();
    this.audit?.record({ category: "RECONCILIATION", action: "PARTNER_OPERATION_REGISTERED", outcome: "SUCCESS",
      actor: { userId: "system", role: "SYSTEM" }, customerId: operation.customerId,
      transactionId: operation.transactionId, stateTo: operation.state });
    return structuredClone(operation);
  }

  handleAuthenticatedCallback(rawBody: string, signature: string) {
    try { return this.applyAuthenticatedCallback(rawBody, signature); }
    catch (error) {
      // Storage/audit failures are not evidence that the partner rejected an operation.
      const validationFailure = error instanceof z.ZodError || (error instanceof Error && [
        "PARTNER_CALLBACK_AUTH_FAILED", "INVALID_PARTNER_CALLBACK", "PARTNER_CALLBACK_REPLAY_CONFLICT",
        "PARTNER_OPERATION_NOT_FOUND", "STALE_PARTNER_CALLBACK", "TERMINAL_PARTNER_STATE_REGRESSION",
      ].includes(error.message));
      if (!validationFailure) throw error;
      // Never include unverified payload fields, signatures or provider errors.
      this.audit?.record({ category: "RECONCILIATION", action: "PARTNER_CALLBACK_REJECTED", outcome: "DENY",
        actor: { userId: "system", role: "SYSTEM" }, code: "CALLBACK_REJECTED" });
      throw error;
    }
  }

  private applyAuthenticatedCallback(rawBody: string, signature: string) {
    if (!this.verifier.verify(rawBody, signature))
      throw new Error("PARTNER_CALLBACK_AUTH_FAILED");
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new Error("INVALID_PARTNER_CALLBACK");
    }
    const callback = PartnerCallbackSchema.parse(parsed),
      fingerprint = callbackFingerprint(callback),
      prior = this.callbacks.get(callback.callbackId);
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new Error("PARTNER_CALLBACK_REPLAY_CONFLICT");
      const operation = this.getOperation(prior.transactionId);
      this.audit?.record({ category: "RECONCILIATION", action: "PARTNER_CALLBACK_DUPLICATE", outcome: "SUCCESS",
        actor: { userId: "mock-partner-provider", role: "SYSTEM" }, customerId: operation.customerId,
        transactionId: operation.transactionId, callbackId: callback.callbackId, stateTo: operation.state });
      return operation;
    }

    const current = this.operations.get(callback.transactionId);
    if (!current) throw new Error("PARTNER_OPERATION_NOT_FOUND");
    if (callback.sequence <= current.lastProviderSequence)
      throw new Error("STALE_PARTNER_CALLBACK");

    const next: PartnerOperation = {
      ...current,
      state: transition(current.state, callback.eventType),
      lastProviderSequence: callback.sequence,
      providerReference: callback.providerReference,
      updatedAt: callback.occurredAt,
    };
    this.operations.set(callback.transactionId, next);
    this.callbacks.set(callback.callbackId, {
      fingerprint,
      transactionId: callback.transactionId,
    });
    this.persist();
    this.audit?.record({ category: "RECONCILIATION", action: "PARTNER_CALLBACK_APPLIED", outcome: "SUCCESS",
      actor: { userId: "mock-partner-provider", role: "SYSTEM" }, customerId: next.customerId,
      transactionId: next.transactionId, callbackId: callback.callbackId, stateFrom: current.state, stateTo: next.state });
    return structuredClone(next);
  }

  getOperation(transactionId: string) {
    const operation = this.operations.get(transactionId);
    if (!operation) throw new Error("PARTNER_OPERATION_NOT_FOUND");
    return structuredClone(operation);
  }

  statusQuery(transactionId: string) {
    const operation = this.getOperation(transactionId);
    this.audit?.record({ category: "RECONCILIATION", action: "PARTNER_STATUS_QUERIED", outcome: "SUCCESS",
      actor: { userId: "system", role: "SYSTEM" }, customerId: operation.customerId,
      transactionId, stateTo: operation.state });
    return operation;
  }

  snapshot(): PartnerReconciliationSnapshot {
    return PartnerReconciliationSnapshotSchema.parse({
      version: 1,
      operations: [...this.operations.values()].map((value) =>
        structuredClone(value),
      ),
      callbacks: [...this.callbacks.entries()].map(
        ([callbackId, { fingerprint, transactionId }]) => ({
          callbackId,
          fingerprint,
          transactionId,
        }),
      ),
    });
  }

  private restore(input: PartnerReconciliationSnapshot) {
    const snapshot = PartnerReconciliationSnapshotSchema.parse(input),
      operations = new Map<string, PartnerOperation>(),
      callbacks = new Map<
        string,
        { fingerprint: string; transactionId: string }
      >();
    for (const operation of snapshot.operations) {
      if (operations.has(operation.transactionId))
        throw new Error("DUPLICATE_PARTNER_OPERATION");
      operations.set(operation.transactionId, structuredClone(operation));
    }
    for (const callback of snapshot.callbacks) {
      if (callbacks.has(callback.callbackId))
        throw new Error("DUPLICATE_PARTNER_CALLBACK");
      if (!operations.has(callback.transactionId))
        throw new Error("CALLBACK_OPERATION_NOT_FOUND");
      callbacks.set(callback.callbackId, {
        fingerprint: callback.fingerprint,
        transactionId: callback.transactionId,
      });
    }
    this.operations = operations;
    this.callbacks = callbacks;
  }

  private persist() {
    this.persistence?.save(this.snapshot());
  }
}
