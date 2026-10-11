export type KycStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REVERIFICATION_REQUIRED' | 'SUSPENDED';
export type Reason = 'PHONE_CHANGE' | 'SIM_CHANGE' | 'ACCOUNT_RECOVERY' | 'KYC_REFRESH_DUE' | 'PARTNER_POLICY' | 'HIGH_RISK_TRANSACTION' | 'SUSPICIOUS_ACTIVITY' | 'IDENTITY_MISMATCH' | 'MANUAL_REVIEW';
export interface Customer {
  readonly customerId: string;
  partnerCustomerId?: string;
  primaryPhone?: string;
  phoneVerifiedAt?: string;
  phoneStatus: 'UNVERIFIED' | 'VERIFIED' | 'REVERIFICATION_REQUIRED' | 'BLOCKED';
  kycStatus: KycStatus;
  kycVerifiedAt?: string;
  kycMethod?: 'MOCK_FAYDA' | 'PARTNER_KYC' | 'OTHER';
  identityReference?: string;
  riskState: 'NORMAL' | 'REVIEW' | 'HIGH_RISK' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}
export function normalizePhone(phone: string) {
  const normalized = phone.replace(/[\s()-]/g, '').replace(/^0/, '+251');
  if (!/^\+251[79]\d{8}$/.test(normalized)) throw new Error('INVALID_PHONE_ALIAS');
  return normalized;
}
const transitions: Record<KycStatus, KycStatus[]> = {
  UNVERIFIED: ['PENDING'], PENDING: ['VERIFIED'], VERIFIED: ['REVERIFICATION_REQUIRED', 'SUSPENDED'],
  REVERIFICATION_REQUIRED: ['VERIFIED', 'SUSPENDED'], SUSPENDED: ['VERIFIED'],
};
export class CustomerStore {
  private customers = new Map<string, Customer>();
  private aliases = new Map<string, string>();
  readonly audit: { customerId: string; from: KycStatus; to: KycStatus; reason: Reason; at: string }[] = [];
  create(phone?: string): Customer {
    const primaryPhone = phone ? normalizePhone(phone) : undefined;
    if (primaryPhone && this.aliases.has(primaryPhone)) throw new Error('DUPLICATE_PHONE');
    const now = new Date().toISOString();
    const customer: Customer = { customerId: crypto.randomUUID(), primaryPhone, phoneStatus: 'UNVERIFIED', kycStatus: 'UNVERIFIED', riskState: 'NORMAL', createdAt: now, updatedAt: now };
    this.customers.set(customer.customerId, customer);
    if (primaryPhone) this.aliases.set(primaryPhone, customer.customerId);
    return this.get(customer.customerId);
  }
  get(id: string): Customer {
    const customer = this.customers.get(id);
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');
    return structuredClone(customer); // callers cannot mutate canonical identity or KYC
  }
  resolve(phone: string) {
    const id = this.aliases.get(normalizePhone(phone));
    if (!id) throw new Error('CUSTOMER_NOT_FOUND');
    return this.get(id);
  }
  changePhone(id: string, phone: string) {
    const customer = this.get(id), normalized = normalizePhone(phone);
    if (normalized === customer.primaryPhone) return customer;
    if (this.aliases.has(normalized)) throw new Error('DUPLICATE_PHONE');
    if (customer.primaryPhone) this.aliases.delete(customer.primaryPhone);
    customer.primaryPhone = normalized;
    customer.phoneStatus = 'REVERIFICATION_REQUIRED';
    delete customer.phoneVerifiedAt;
    this.aliases.set(normalized, id);
    customer.updatedAt = new Date().toISOString();
    this.customers.set(id, customer);
    if (customer.kycStatus === 'VERIFIED') this.transition(id, 'REVERIFICATION_REQUIRED', 'PHONE_CHANGE');
    return this.get(id);
  }
  transition(id: string, to: KycStatus, reason: Reason, authority?: 'MOCK_PROVIDER' | 'PARTNER_ADMIN') {
    const customer = this.get(id), from = customer.kycStatus;
    if (!transitions[from].includes(to)) throw new Error('INVALID_KYC_TRANSITION');
    if (to === 'VERIFIED' && !authority) throw new Error('VERIFICATION_AUTHORITY_REQUIRED');
    if (from === 'SUSPENDED' && authority !== 'PARTNER_ADMIN') throw new Error('PARTNER_ADMIN_REQUIRED');
    customer.kycStatus = to;
    customer.updatedAt = new Date().toISOString();
    if (to === 'VERIFIED') customer.kycVerifiedAt = customer.updatedAt;
    this.customers.set(id, customer);
    this.audit.push({ customerId: id, from, to, reason, at: customer.updatedAt });
    return this.get(id);
  }
  recordMockVerification(id: string, reference: string) {
    const customer = this.get(id);
    if (customer.kycStatus !== 'VERIFIED' || !/^mock-identity:[0-9a-f-]{36}$/.test(reference)) throw new Error('INVALID_VERIFICATION');
    customer.kycMethod = 'MOCK_FAYDA'; customer.identityReference = reference;
    customer.partnerCustomerId = `mock-partner:${id}`;
    // The synthetic fixture simulates phone verification, never actual possession.
    if (customer.primaryPhone) { customer.phoneStatus = 'VERIFIED'; customer.phoneVerifiedAt = customer.updatedAt; }
    this.customers.set(id, customer);
    return this.get(id);
  }
}
export function assertTransactionEligible(customer: Customer) {
  if (customer.kycStatus !== 'VERIFIED' || customer.riskState !== 'NORMAL' || customer.phoneStatus === 'BLOCKED' || customer.phoneStatus === 'REVERIFICATION_REQUIRED') throw new Error('KYC_OR_RISK_BLOCKED');
}
