import { z } from "zod";
import { CustomerStore, type Reason } from "./customer";

export interface IdentityVerificationProvider {
  startVerification(customerId: string): string;
  confirmVerification(verificationId: string): string;
  getVerificationStatus(verificationId: string): "PENDING" | "VERIFIED";
  requestReverification(customerId: string): string;
  verifyOfflineCredential(): { status: "UNSUPPORTED" };
}

export const MockIdentityProviderSnapshotSchema = z
  .object({
    version: z.literal(1),
    requests: z.array(
      z
        .object({
          id: z.string().uuid(),
          customerId: z.string().uuid(),
          status: z.enum(["PENDING", "VERIFIED"]),
          reference: z.string().regex(/^mock-identity:[0-9a-f-]{36}$/),
        })
        .strict(),
    ),
  })
  .strict();
export type MockIdentityProviderSnapshot = z.infer<
  typeof MockIdentityProviderSnapshotSchema
>;
export interface MockIdentityProviderPersistence {
  load(): MockIdentityProviderSnapshot | undefined;
  save(snapshot: MockIdentityProviderSnapshot): void;
}

const ReasonSchema = z.enum([
  "PHONE_CHANGE",
  "SIM_CHANGE",
  "ACCOUNT_RECOVERY",
  "KYC_REFRESH_DUE",
  "PARTNER_POLICY",
  "HIGH_RISK_TRANSACTION",
  "SUSPICIOUS_ACTIVITY",
  "IDENTITY_MISMATCH",
  "MANUAL_REVIEW",
]);
export const KycPendingSnapshotSchema = z
  .object({
    version: z.literal(1),
    pending: z.array(
      z
        .object({
          customerId: z.string().uuid(),
          id: z.string().uuid(),
          reason: ReasonSchema,
          phone: z.string().regex(/^\+251[79]\d{8}$/).optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type KycPendingSnapshot = z.infer<typeof KycPendingSnapshotSchema>;
export interface KycPendingPersistence {
  load(): KycPendingSnapshot | undefined;
  save(snapshot: KycPendingSnapshot): void;
}

// Mock contract only; no FIN/FAN input, biometrics, credentials or network calls.
export class MockFaydaAdapter implements IdentityVerificationProvider {
  private requests = new Map<
    string,
    { customerId: string; status: "PENDING" | "VERIFIED"; reference: string }
  >();

  constructor(private persistence?: MockIdentityProviderPersistence) {
    const snapshot = persistence?.load();
    if (snapshot) {
      const validated = MockIdentityProviderSnapshotSchema.parse(snapshot);
      for (const request of validated.requests) {
        if (this.requests.has(request.id))
          throw new Error("DUPLICATE_VERIFICATION_REQUEST");
        this.requests.set(request.id, {
          customerId: request.customerId,
          status: request.status,
          reference: request.reference,
        });
      }
    }
  }

  startVerification(customerId: string) {
    const id = crypto.randomUUID();
    this.requests.set(id, {
      customerId,
      status: "PENDING",
      reference: `mock-identity:${crypto.randomUUID()}`,
    });
    this.persist();
    return id;
  }

  confirmVerification(id: string) {
    const request = this.requests.get(id);
    if (!request || request.status !== "PENDING")
      throw new Error("INVALID_VERIFICATION_REQUEST");
    request.status = "VERIFIED";
    this.persist();
    return request.reference;
  }

  getVerificationStatus(id: string) {
    const request = this.requests.get(id);
    if (!request) throw new Error("VERIFICATION_NOT_FOUND");
    return request.status;
  }

  requestReverification(customerId: string) {
    return this.startVerification(customerId);
  }

  verifyOfflineCredential() {
    return { status: "UNSUPPORTED" as const };
  }

  snapshot(): MockIdentityProviderSnapshot {
    return MockIdentityProviderSnapshotSchema.parse({
      version: 1,
      requests: [...this.requests.entries()].map(
        ([id, { customerId, status, reference }]) => ({
          id,
          customerId,
          status,
          reference,
        }),
      ),
    });
  }

  private persist() {
    this.persistence?.save(this.snapshot());
  }
}

export class KycService {
  private pending = new Map<
    string,
    { id: string; reason: Reason; phone?: string }
  >();

  constructor(
    private customers: CustomerStore,
    private provider: IdentityVerificationProvider,
    private persistence?: KycPendingPersistence,
  ) {
    const snapshot = persistence?.load();
    if (snapshot) {
      const validated = KycPendingSnapshotSchema.parse(snapshot);
      for (const item of validated.pending) {
        if (this.pending.has(item.customerId))
          throw new Error("DUPLICATE_PENDING_VERIFICATION");
        // Fail closed if durable challenge state points to a customer that no
        // longer exists. This avoids silently creating a replacement identity.
        this.customers.get(item.customerId);
        this.pending.set(item.customerId, {
          id: item.id,
          reason: item.reason,
          phone: item.phone,
        });
      }
    }
  }

  start(id: string, reason: Reason = "MANUAL_REVIEW") {
    const existing = this.pending.get(id);
    if (existing) return existing.id;
    const customer = this.customers.get(id);
    if (customer.kycStatus === "UNVERIFIED")
      this.customers.transition(id, "PENDING", reason);
    else if (customer.kycStatus !== "PENDING")
      throw new Error("INVALID_KYC_TRANSITION");
    const request = this.provider.startVerification(id);
    this.pending.set(id, {
      id: request,
      reason,
      phone: this.customers.get(id).primaryPhone,
    });
    this.persist();
    return request;
  }

  requestReverification(id: string, reason: Reason) {
    const existing = this.pending.get(id);
    if (existing) return existing.id;
    const customer = this.customers.get(id);
    if (customer.kycStatus === "VERIFIED")
      this.customers.transition(id, "REVERIFICATION_REQUIRED", reason);
    else if (customer.kycStatus !== "REVERIFICATION_REQUIRED")
      throw new Error("INVALID_KYC_TRANSITION");
    const request = this.provider.requestReverification(id);
    this.pending.set(id, {
      id: request,
      reason,
      phone: this.customers.get(id).primaryPhone,
    });
    this.persist();
    return request;
  }

  confirm(id: string) {
    const request = this.pending.get(id);
    if (!request) throw new Error("VERIFICATION_NOT_STARTED");
    const customer = this.customers.get(id);
    if (customer.primaryPhone !== request.phone)
      throw new Error("VERIFICATION_ALIAS_CHANGED");
    const status = customer.kycStatus;
    if (status !== "PENDING" && status !== "REVERIFICATION_REQUIRED")
      throw new Error("INVALID_KYC_TRANSITION");
    const reference = this.provider.confirmVerification(request.id);
    this.customers.transition(id, "VERIFIED", request.reason, "MOCK_PROVIDER");
    this.pending.delete(id);
    this.persist();
    return this.customers.recordIdentityVerification(id, reference);
  }

  snapshot(): KycPendingSnapshot {
    return KycPendingSnapshotSchema.parse({
      version: 1,
      pending: [...this.pending.entries()].map(
        ([customerId, { id, reason, phone }]) => ({
          customerId,
          id,
          reason,
          ...(phone ? { phone } : {}),
        }),
      ),
    });
  }

  private persist() {
    this.persistence?.save(this.snapshot());
  }
}
