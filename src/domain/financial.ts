import { z } from "zod";
import { CustomerStore, assertTransactionEligible } from "./customer";

export const TransactionSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    amountMinor: z.number().int().positive().max(100_000_000),
    direction: z.enum(["CASH_IN", "CASH_OUT"]),
    currency: z.literal("ETB"),
  })
  .strict();
export type TransactionRequest = z.infer<typeof TransactionSchema>;
export type FinancialState =
  | "PARTNER_AUTH_PENDING"
  | "PARTNER_ACCEPTED"
  | "PARTNER_REJECTED"
  | "RECONCILIATION_REQUIRED";

export interface PartnerResult {
  transactionId: string;
  customerId: string;
  state: FinancialState;
  accountOwner: "PartnerFI";
  simulated: true;
}

const PartnerResultSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    state: z.enum([
      "PARTNER_AUTH_PENDING",
      "PARTNER_ACCEPTED",
      "PARTNER_REJECTED",
      "RECONCILIATION_REQUIRED",
    ]),
    accountOwner: z.literal("PartnerFI"),
    simulated: z.literal(true),
  })
  .strict();

export const PartnerLedgerSnapshotSchema = z
  .object({
    version: z.literal(1),
    balances: z.record(z.string().uuid(), z.number().int()),
    results: z.array(
      z
        .object({
          idempotencyKey: z.string().uuid(),
          fingerprint: z.string().min(1),
          result: PartnerResultSchema,
        })
        .strict(),
    ),
    transactionKeys: z.array(
      z
        .object({
          transactionId: z.string().uuid(),
          idempotencyKey: z.string().uuid(),
        })
        .strict(),
    ),
  })
  .strict();
export type PartnerLedgerSnapshot = z.infer<typeof PartnerLedgerSnapshotSchema>;

export interface PartnerLedgerPersistence {
  load(): PartnerLedgerSnapshot | undefined;
  save(snapshot: PartnerLedgerSnapshot): void;
}

export interface FinancialInstitutionAdapter {
  lookupPartnerCustomer(customerId: string): string;
  authorizeTransaction(request: TransactionRequest): boolean;
  getRecordedResult(request: TransactionRequest): PartnerResult | undefined;
  postTransaction(request: TransactionRequest): PartnerResult;
  getTransactionStatus(id: string): PartnerResult | undefined;
  getAccountSummary(customerId: string): {
    accountOwner: "PartnerFI";
    simulated: true;
    balanceMinor: number;
    currency: "ETB";
  };
  reconcileTransaction(id: string): PartnerResult;
}

function fingerprint(request: TransactionRequest) {
  return JSON.stringify(request);
}

// Prototype simulation only — not a real customer liability of Wishland.
export class MockPartnerFI implements FinancialInstitutionAdapter {
  private balances = new Map<string, number>();
  private results = new Map<
    string,
    { fingerprint: string; result: PartnerResult }
  >();
  private transactionKeys = new Map<string, string>();

  constructor(
    private outcome: "accept" | "reject" | "reconcile" = "accept",
    private persistence?: PartnerLedgerPersistence,
  ) {
    const snapshot = persistence?.load();
    if (snapshot) this.restore(snapshot);
  }

  lookupPartnerCustomer(customerId: string) {
    return `mock-partner:${customerId}`;
  }

  authorizeTransaction(request: TransactionRequest) {
    return (
      this.outcome !== "reject" &&
      (request.direction === "CASH_IN" ||
        this.getAccountSummary(request.customerId).balanceMinor >=
          request.amountMinor)
    );
  }

  getRecordedResult(input: TransactionRequest) {
    const request = TransactionSchema.parse(input),
      old = this.results.get(request.idempotencyKey);
    if (!old) return undefined;
    if (old.fingerprint !== fingerprint(request))
      throw new Error("IDEMPOTENCY_CONFLICT");
    return { ...old.result };
  }

  postTransaction(input: TransactionRequest): PartnerResult {
    const request = TransactionSchema.parse(input),
      recorded = this.getRecordedResult(request);
    if (recorded) return recorded;
    if (this.transactionKeys.has(request.transactionId))
      throw new Error("TRANSACTION_REPLAY");
    const state: FinancialState = !this.authorizeTransaction(request)
      ? "PARTNER_REJECTED"
      : this.outcome === "reconcile"
        ? "RECONCILIATION_REQUIRED"
        : "PARTNER_ACCEPTED";
    const result: PartnerResult = {
      transactionId: request.transactionId,
      customerId: request.customerId,
      state,
      accountOwner: "PartnerFI",
      simulated: true,
    };
    if (state === "PARTNER_ACCEPTED") {
      const balance = this.getAccountSummary(request.customerId).balanceMinor;
      this.balances.set(
        request.customerId,
        balance +
          (request.direction === "CASH_IN"
            ? request.amountMinor
            : -request.amountMinor),
      );
    }
    this.transactionKeys.set(request.transactionId, request.idempotencyKey);
    this.results.set(request.idempotencyKey, {
      fingerprint: fingerprint(request),
      result,
    });
    this.persist();
    return { ...result };
  }

  getTransactionStatus(id: string) {
    const key = this.transactionKeys.get(id);
    const result = key ? this.results.get(key)?.result : undefined;
    return result ? { ...result } : undefined;
  }

  getAccountSummary(customerId: string) {
    return {
      accountOwner: "PartnerFI" as const,
      simulated: true as const,
      balanceMinor: this.balances.get(customerId) ?? 100_000,
      currency: "ETB" as const,
    };
  }

  reconcileTransaction(id: string) {
    const result = this.getTransactionStatus(id);
    if (!result) throw new Error("TRANSACTION_NOT_FOUND");
    return result;
  }

  snapshot(): PartnerLedgerSnapshot {
    return PartnerLedgerSnapshotSchema.parse({
      version: 1,
      balances: Object.fromEntries(this.balances),
      results: [...this.results.entries()].map(
        ([idempotencyKey, { fingerprint, result }]) => ({
          idempotencyKey,
          fingerprint,
          result,
        }),
      ),
      transactionKeys: [...this.transactionKeys.entries()].map(
        ([transactionId, idempotencyKey]) => ({
          transactionId,
          idempotencyKey,
        }),
      ),
    });
  }

  private restore(input: PartnerLedgerSnapshot) {
    const snapshot = PartnerLedgerSnapshotSchema.parse(input);
    this.balances = new Map(Object.entries(snapshot.balances));
    this.results = new Map(
      snapshot.results.map(({ idempotencyKey, fingerprint, result }) => [
        idempotencyKey,
        { fingerprint, result },
      ]),
    );
    this.transactionKeys = new Map(
      snapshot.transactionKeys.map(({ transactionId, idempotencyKey }) => [
        transactionId,
        idempotencyKey,
      ]),
    );
  }

  private persist() {
    this.persistence?.save(this.snapshot());
  }
}

export class TransactionService {
  constructor(
    private customers: CustomerStore,
    private partner: FinancialInstitutionAdapter,
  ) {}

  submit(input: unknown) {
    const request = TransactionSchema.parse(input);
    // An identical retry must be able to recover the already-recorded outcome
    // even when mutable KYC/risk state changed after the original submission.
    // Changed payloads under the same idempotency key still fail closed.
    const recorded = this.partner.getRecordedResult(request);
    if (recorded) return recorded;
    assertTransactionEligible(this.customers.get(request.customerId));
    return this.partner.postTransaction(request); // No identity provider dependency or call.
  }
}
