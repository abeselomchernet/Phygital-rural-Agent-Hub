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
export interface FinancialInstitutionAdapter {
  lookupPartnerCustomer(customerId: string): string;
  authorizeTransaction(request: TransactionRequest): boolean;
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
// Prototype simulation only — not a real customer liability of Wishland.
export class MockPartnerFI implements FinancialInstitutionAdapter {
  private balances = new Map<string, number>();
  private results = new Map<
    string,
    { fingerprint: string; result: PartnerResult }
  >();
  private transactionKeys = new Map<string, string>();
  constructor(private outcome: "accept" | "reject" | "reconcile" = "accept") {}
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
  postTransaction(input: TransactionRequest): PartnerResult {
    const request = TransactionSchema.parse(input),
      fingerprint = JSON.stringify(request);
    const old = this.results.get(request.idempotencyKey);
    if (old) {
      if (old.fingerprint !== fingerprint)
        throw new Error("IDEMPOTENCY_CONFLICT");
      return { ...old.result };
    }
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
    this.results.set(request.idempotencyKey, { fingerprint, result });
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
}
export class TransactionService {
  constructor(
    private customers: CustomerStore,
    private partner: FinancialInstitutionAdapter,
  ) {}
  submit(input: unknown) {
    const request = TransactionSchema.parse(input);
    assertTransactionEligible(this.customers.get(request.customerId));
    return this.partner.postTransaction(request); // No identity provider dependency or call.
  }
}
