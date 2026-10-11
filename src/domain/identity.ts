import { CustomerStore, type Reason } from './customer';
export interface IdentityVerificationProvider {
  startVerification(customerId: string): string;
  confirmVerification(verificationId: string): string;
  getVerificationStatus(verificationId: string): 'PENDING' | 'VERIFIED';
  requestReverification(customerId: string): string;
  verifyOfflineCredential(): { status: 'UNSUPPORTED' };
}
// Mock contract only; no FIN/FAN input, biometrics, credentials or network calls.
export class MockFaydaAdapter implements IdentityVerificationProvider {
  private requests = new Map<string, { customerId: string; status: 'PENDING' | 'VERIFIED'; reference: string }>();
  startVerification(customerId: string) {
    const id = crypto.randomUUID();
    this.requests.set(id, {customerId, status:'PENDING', reference:`mock-identity:${crypto.randomUUID()}`});
    return id;
  }
  confirmVerification(id: string) {
    const request = this.requests.get(id);
    if (!request || request.status !== 'PENDING') throw new Error('INVALID_VERIFICATION_REQUEST');
    request.status = 'VERIFIED'; return request.reference;
  }
  getVerificationStatus(id: string) {
    const request = this.requests.get(id); if (!request) throw new Error('VERIFICATION_NOT_FOUND'); return request.status;
  }
  requestReverification(customerId: string) { return this.startVerification(customerId); }
  verifyOfflineCredential() { return {status:'UNSUPPORTED' as const}; }
}
export class KycService {
  private pending = new Map<string, { id: string; reason: Reason }>();
  constructor(private customers: CustomerStore, private provider: IdentityVerificationProvider) {}
  start(id: string, reason: Reason = 'MANUAL_REVIEW') {
    const customer = this.customers.get(id);
    if (customer.kycStatus === 'UNVERIFIED') this.customers.transition(id, 'PENDING', reason);
    else if (customer.kycStatus !== 'PENDING') throw new Error('INVALID_KYC_TRANSITION');
    const request = this.provider.startVerification(id); this.pending.set(id,{id:request,reason}); return request;
  }
  requestReverification(id: string, reason: Reason) {
    const customer = this.customers.get(id);
    if (customer.kycStatus === 'VERIFIED') this.customers.transition(id,'REVERIFICATION_REQUIRED',reason);
    else if (customer.kycStatus !== 'REVERIFICATION_REQUIRED') throw new Error('INVALID_KYC_TRANSITION');
    const request=this.provider.requestReverification(id); this.pending.set(id,{id:request,reason}); return request;
  }
  confirm(id: string) {
    const request=this.pending.get(id); if (!request) throw new Error('VERIFICATION_NOT_STARTED');
    const status=this.customers.get(id).kycStatus;
    if (status !== 'PENDING' && status !== 'REVERIFICATION_REQUIRED') throw new Error('INVALID_KYC_TRANSITION');
    const reference=this.provider.confirmVerification(request.id);
    this.customers.transition(id,'VERIFIED',request.reason,'MOCK_PROVIDER');
    this.pending.delete(id); return this.customers.recordMockVerification(id,reference);
  }
}
