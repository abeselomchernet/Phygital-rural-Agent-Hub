import type { SyntheticAuditSink } from "./audit";
import { z } from "zod";

export type KycStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "REVERIFICATION_REQUIRED"
  | "SUSPENDED";
export type Reason =
  | "PHONE_CHANGE"
  | "SIM_CHANGE"
  | "ACCOUNT_RECOVERY"
  | "KYC_REFRESH_DUE"
  | "PARTNER_POLICY"
  | "HIGH_RISK_TRANSACTION"
  | "SUSPICIOUS_ACTIVITY"
  | "IDENTITY_MISMATCH"
  | "MANUAL_REVIEW";
export interface Customer {
  readonly customerId: string;
  partnerCustomerId?: string;
  primaryPhone?: string;
  phoneVerifiedAt?: string;
  phoneStatus:
    | "UNVERIFIED"
    | "VERIFIED"
    | "REVERIFICATION_REQUIRED"
    | "BLOCKED";
  kycStatus: KycStatus;
  kycVerifiedAt?: string;
  kycMethod?: "MOCK_FAYDA" | "PARTNER_KYC" | "OTHER";
  identityReference?: string;
  riskState: "NORMAL" | "REVIEW" | "HIGH_RISK" | "BLOCKED";
  createdAt: string;
  updatedAt: string;
}

const CustomerSchema = z
  .object({
    customerId: z.string().uuid(),
    partnerCustomerId: z.string().min(1).max(128).optional(),
    primaryPhone: z.string().regex(/^\+251[79]\d{8}$/).optional(),
    phoneVerifiedAt: z.string().datetime().optional(),
    phoneStatus: z.enum([
      "UNVERIFIED",
      "VERIFIED",
      "REVERIFICATION_REQUIRED",
      "BLOCKED",
    ]),
    kycStatus: z.enum([
      "UNVERIFIED",
      "PENDING",
      "VERIFIED",
      "REVERIFICATION_REQUIRED",
      "SUSPENDED",
    ]),
    kycVerifiedAt: z.string().datetime().optional(),
    kycMethod: z.enum(["MOCK_FAYDA", "PARTNER_KYC", "OTHER"]).optional(),
    identityReference: z.string().max(256).optional(),
    riskState: z.enum(["NORMAL", "REVIEW", "HIGH_RISK", "BLOCKED"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const AuditEntrySchema = z
  .object({
    customerId: z.string().uuid(),
    from: z.enum([
      "UNVERIFIED",
      "PENDING",
      "VERIFIED",
      "REVERIFICATION_REQUIRED",
      "SUSPENDED",
    ]),
    to: z.enum([
      "UNVERIFIED",
      "PENDING",
      "VERIFIED",
      "REVERIFICATION_REQUIRED",
      "SUSPENDED",
    ]),
    reason: z.enum([
      "PHONE_CHANGE",
      "SIM_CHANGE",
      "ACCOUNT_RECOVERY",
      "KYC_REFRESH_DUE",
      "PARTNER_POLICY",
      "HIGH_RISK_TRANSACTION",
      "SUSPICIOUS_ACTIVITY",
      "IDENTITY_MISMATCH",
      "MANUAL_REVIEW",
    ]),
    at: z.string().datetime(),
  })
  .strict();

export const CustomerStoreSnapshotSchema = z
  .object({
    version: z.literal(1),
    customers: z.array(CustomerSchema),
    audit: z.array(AuditEntrySchema),
  })
  .strict();
export type CustomerStoreSnapshot = z.infer<typeof CustomerStoreSnapshotSchema>;

export interface CustomerStorePersistence {
  load(): CustomerStoreSnapshot | undefined;
  save(snapshot: CustomerStoreSnapshot): void;
}

export function normalizePhone(phone: string) {
  const normalized = phone.replace(/[\s()-]/g, "").replace(/^0/, "+251");
  if (!/^\+251[79]\d{8}$/.test(normalized))
    throw new Error("INVALID_PHONE_ALIAS");
  return normalized;
}

const transitions: Record<KycStatus, KycStatus[]> = {
  UNVERIFIED: ["PENDING"],
  PENDING: ["VERIFIED"],
  VERIFIED: ["REVERIFICATION_REQUIRED", "SUSPENDED"],
  REVERIFICATION_REQUIRED: ["VERIFIED", "SUSPENDED"],
  SUSPENDED: ["VERIFIED"],
};

export class CustomerStore {
  private customers = new Map<string, Customer>();
  private aliases = new Map<string, string>();
  private partnerAliases = new Map<string, string>();
  readonly audit: {
    customerId: string;
    from: KycStatus;
    to: KycStatus;
    reason: Reason;
    at: string;
  }[] = [];

  constructor(private persistence?: CustomerStorePersistence, private auditSink?: SyntheticAuditSink) {
    const snapshot = persistence?.load();
    if (snapshot) this.restore(snapshot);
  }

  create(phone?: string): Customer {
    const primaryPhone = phone ? normalizePhone(phone) : undefined;
    if (primaryPhone && this.aliases.has(primaryPhone))
      throw new Error("DUPLICATE_PHONE");
    const now = new Date().toISOString();
    const customer: Customer = {
      customerId: crypto.randomUUID(),
      primaryPhone,
      phoneStatus: "UNVERIFIED",
      kycStatus: "UNVERIFIED",
      riskState: "NORMAL",
      createdAt: now,
      updatedAt: now,
    };
    this.customers.set(customer.customerId, customer);
    if (primaryPhone) this.aliases.set(primaryPhone, customer.customerId);
    this.persist();
    return this.get(customer.customerId);
  }

  get(id: string): Customer {
    const customer = this.customers.get(id);
    if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
    return structuredClone(customer); // callers cannot mutate canonical identity or KYC
  }

  list(): Customer[] {
    return [...this.customers.values()].map((customer) => structuredClone(customer));
  }

  resolve(phone: string) {
    const id = this.aliases.get(normalizePhone(phone));
    if (!id) throw new Error("CUSTOMER_NOT_FOUND");
    return this.get(id);
  }

  changePhone(id: string, phone: string) {
    const customer = this.get(id),
      normalized = normalizePhone(phone);
    if (normalized === customer.primaryPhone) return customer;
    if (this.aliases.has(normalized)) throw new Error("DUPLICATE_PHONE");
    if (customer.primaryPhone) this.aliases.delete(customer.primaryPhone);
    customer.primaryPhone = normalized;
    customer.phoneStatus = "REVERIFICATION_REQUIRED";
    delete customer.phoneVerifiedAt;
    this.aliases.set(normalized, id);
    customer.updatedAt = new Date().toISOString();
    this.customers.set(id, customer);
    if (customer.kycStatus === "VERIFIED")
      this.transition(id, "REVERIFICATION_REQUIRED", "PHONE_CHANGE");
    else this.persist();
    return this.get(id);
  }

  transition(
    id: string,
    to: KycStatus,
    reason: Reason,
    authority?: "MOCK_PROVIDER" | "PARTNER_ADMIN",
  ) {
    const customer = this.get(id),
      from = customer.kycStatus;
    if (!transitions[from].includes(to))
      throw new Error("INVALID_KYC_TRANSITION");
    if (from === "SUSPENDED" && authority !== "PARTNER_ADMIN") {
      this.auditSink?.record({ category: "RECOVERY", action: "ADMIN_RECOVERY_DENIED", outcome: "DENY",
        actor: { userId: "system", role: "SYSTEM" }, customerId: id,
        stateFrom: from, stateTo: from, code: "PARTNER_ADMIN_REQUIRED" });
      throw new Error("PARTNER_ADMIN_REQUIRED");
    }
    if (to === "VERIFIED" && !authority)
      throw new Error("VERIFICATION_AUTHORITY_REQUIRED");
    customer.kycStatus = to;
    customer.updatedAt = new Date().toISOString();
    if (to === "VERIFIED") customer.kycVerifiedAt = customer.updatedAt;
    this.customers.set(id, customer);
    this.audit.push({
      customerId: id,
      from,
      to,
      reason,
      at: customer.updatedAt,
    });
    this.persist();
    this.auditSink?.record({
      category: from === "SUSPENDED" ? "RECOVERY" : "KYC",
      action: from === "SUSPENDED" ? "ADMIN_RECOVERY_COMPLETED" : "KYC_TRANSITION",
      outcome: "SUCCESS", actor: authority === "PARTNER_ADMIN"
        ? { userId: "synthetic-partner-admin-01", role: "PARTNER_ADMIN" }
        : { userId: "system", role: "SYSTEM" },
      customerId: id, stateFrom: from, stateTo: to, code: reason,
    });
    return this.get(id);
  }

  recordIdentityVerification(id: string, reference: string) {
    const customer = this.get(id);
    if (
      customer.kycStatus !== "VERIFIED" ||
      !/^mock-identity:[0-9a-f-]{36}$/.test(reference)
    )
      throw new Error("INVALID_VERIFICATION");
    customer.kycMethod = "MOCK_FAYDA";
    customer.identityReference = reference;
    customer.updatedAt = new Date().toISOString();
    this.customers.set(id, customer);
    this.persist();
    return this.get(id);
  }

  recordMockPhoneVerification(id: string) {
    const customer = this.get(id);
    if (!customer.primaryPhone) throw new Error("PHONE_ALIAS_REQUIRED");
    customer.phoneStatus = "VERIFIED";
    customer.phoneVerifiedAt = new Date().toISOString();
    customer.updatedAt = customer.phoneVerifiedAt;
    this.customers.set(id, customer);
    this.persist();
    return this.get(id);
  }

  linkPartnerCustomer(id: string, partnerCustomerId: string) {
    const customer = this.get(id),
      existingOwner = this.partnerAliases.get(partnerCustomerId);
    if (
      !partnerCustomerId ||
      partnerCustomerId.length > 128 ||
      partnerCustomerId === customer.primaryPhone
    )
      throw new Error("INVALID_PARTNER_CUSTOMER_REFERENCE");
    if (existingOwner && existingOwner !== id)
      throw new Error("DUPLICATE_PARTNER_CUSTOMER");
    if (customer.partnerCustomerId)
      this.partnerAliases.delete(customer.partnerCustomerId);
    customer.partnerCustomerId = partnerCustomerId;
    this.partnerAliases.set(partnerCustomerId, id);
    customer.updatedAt = new Date().toISOString();
    this.customers.set(id, customer);
    this.persist();
    return this.get(id);
  }

  snapshot(): CustomerStoreSnapshot {
    return CustomerStoreSnapshotSchema.parse({
      version: 1,
      customers: [...this.customers.values()].map((customer) =>
        structuredClone(customer),
      ),
      audit: structuredClone(this.audit),
    });
  }

  private restore(input: CustomerStoreSnapshot) {
    const snapshot = CustomerStoreSnapshotSchema.parse(input),
      customers = new Map<string, Customer>(),
      aliases = new Map<string, string>(),
      partnerAliases = new Map<string, string>();
    for (const parsed of snapshot.customers) {
      const customer = parsed as Customer;
      if (customers.has(customer.customerId))
        throw new Error("DUPLICATE_CUSTOMER_ID");
      if (customer.primaryPhone) {
        if (aliases.has(customer.primaryPhone)) throw new Error("DUPLICATE_PHONE");
        aliases.set(customer.primaryPhone, customer.customerId);
      }
      if (customer.partnerCustomerId) {
        if (partnerAliases.has(customer.partnerCustomerId))
          throw new Error("DUPLICATE_PARTNER_CUSTOMER");
        partnerAliases.set(customer.partnerCustomerId, customer.customerId);
      }
      customers.set(customer.customerId, structuredClone(customer));
    }
    for (const entry of snapshot.audit)
      if (!customers.has(entry.customerId))
        throw new Error("AUDIT_CUSTOMER_NOT_FOUND");
    this.customers = customers;
    this.aliases = aliases;
    this.partnerAliases = partnerAliases;
    this.audit.splice(0, this.audit.length, ...structuredClone(snapshot.audit));
  }

  private persist() {
    this.persistence?.save(this.snapshot());
  }
}

export function assertTransactionEligible(customer: Customer) {
  if (
    customer.kycStatus !== "VERIFIED" ||
    customer.riskState !== "NORMAL" ||
    customer.phoneStatus === "BLOCKED" ||
    customer.phoneStatus === "REVERIFICATION_REQUIRED"
  )
    throw new Error("KYC_OR_RISK_BLOCKED");
}
