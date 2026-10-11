import { z } from 'zod';
import { TransactionSchema, TransactionService, type FinancialState } from './financial';
export type TransportState = 'LOCAL_PENDING' | 'QUEUED_FOR_SYNC' | 'SYNCED_TO_SUPERVISOR' | 'RECEIVED_BY_PLATFORM';
export const EnvelopeSchema = z.object({
  eventId:z.string().uuid(), schemaVersion:z.literal(1), createdAt:z.string().datetime(),
  sequence:z.number().int().positive(), payload:TransactionSchema,
}).strict();
export type Envelope=z.infer<typeof EnvelopeSchema>;
export interface Receipt { eventId:string; transportState:'RECEIVED_BY_PLATFORM'; financialState:FinancialState; simulated:true; }
// Test-only mock receiver. The HTTP GhostSync receiver remains closed.
// In-memory replay protection is deliberately NOT claimed durable across restarts.
export class MockTransportReceiver {
  private receipts=new Map<string,{fingerprint:string;receipt:Receipt}>();
  private sequence=new Map<string,number>();
  constructor(private transactions:TransactionService, private now=()=>Date.now()) {}
  receive(input:unknown):Receipt {
    const event=EnvelopeSchema.parse(input), fingerprint=JSON.stringify(event);
    const previous=this.receipts.get(event.eventId);
    if (previous) { if (previous.fingerprint!==fingerprint) throw new Error('EVENT_REPLAY_CONFLICT'); return {...previous.receipt}; }
    const age=this.now()-Date.parse(event.createdAt);
    if (age>7*86400_000 || age< -60_000) throw new Error('EVENT_EXPIRED_OR_FUTURE');
    const expected=(this.sequence.get(event.payload.customerId)??0)+1;
    if (event.sequence!==expected) throw new Error('OUT_OF_ORDER_RETRY_REQUIRED');
    const result=this.transactions.submit(event.payload);
    const receipt:Receipt={eventId:event.eventId,transportState:'RECEIVED_BY_PLATFORM',financialState:result.state,simulated:true};
    this.receipts.set(event.eventId,{fingerprint,receipt}); this.sequence.set(event.payload.customerId,event.sequence);
    return {...receipt}; // delivery acknowledgment never says "settled"
  }
}
