import { z } from 'zod';

// ISO 20022 pacs.008 (FIToFICustomerCreditTransfer) simplified schema for demonstration
export const Pacs008Schema = z.object({
  MsgId: z.string().min(1).max(35),
  CreDtTm: z.string().datetime(), // e.g. 2026-05-22T16:04:17Z
  NbOfTxs: z.number().int().min(1),
  SttlmInfo: z.object({
    SttlmMtd: z.enum(['CLRG', 'INDA', 'INGA', 'COVE']),
  }),
  CdtTrfTxInf: z.array(z.object({
    PmtId: z.object({
      EndToEndId: z.string().min(1).max(35),
    }),
    IntrBkSttlmAmt: z.object({
      Ccy: z.string().length(3), // 'ETB'
      value: z.number().positive(),
    }),
    ChrgBr: z.enum(['DEBT', 'CRED', 'SHAR', 'SLEV']),
    Dbtr: z.object({
      Nm: z.string().min(1).max(140),
    }),
    Cdtr: z.object({
      Nm: z.string().min(1).max(140),
    }),
  })).min(1),
});

export type Pacs008Message = z.infer<typeof Pacs008Schema>;

// Helper to convert internal payload to pacs.008 format for queuing
export function transformToPacs008(payload: any): Pacs008Message {
  return {
    MsgId: payload.txId,
    CreDtTm: payload.date || new Date().toISOString(),
    NbOfTxs: 1,
    SttlmInfo: {
      SttlmMtd: 'CLRG', // Clearing
    },
    CdtTrfTxInf: [{
      PmtId: {
        EndToEndId: payload.txId,
      },
      IntrBkSttlmAmt: {
        Ccy: 'ETB',
        value: parseFloat(payload.amount),
      },
      ChrgBr: 'SHAR', // Shared charges
      Dbtr: {
        Nm: payload.type === 'Cash In' ? payload.agent : 'Farmer Account',
      },
      Cdtr: {
        Nm: payload.type === 'Cash In' ? 'Farmer Account' : payload.agent,
      }
    }]
  };
}

// Generate a digital signature for the transaction blob
// In a real environment, this would use a secure private key (e.g. from an HSM or Secure Enclave).
// We use a simple Web Crypto HMAC here as a stand-in for non-repudiation digital signing.
export async function signTransactionBlob(blob: any): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(blob));
  
  // Create a stand-in session key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode('enawuga-edge-private-key-standin-001'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate and Sign a transaction before queueing
export async function prepareSecureTransaction(internalPayload: any) {
  // 1. Convert to ISO 20022 format
  const pacs008 = transformToPacs008(internalPayload);
  
  // 2. Strict Schema Validation
  Pacs008Schema.parse(pacs008); 

  // 3. Digital Signing
  const signature = await signTransactionBlob(pacs008);

  return {
    isoMessage: pacs008,
    signature,
    originalMetadata: internalPayload
  };
}
