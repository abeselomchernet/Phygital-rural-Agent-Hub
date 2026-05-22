import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';

// Mocks for microservices
const db = {
  agents: [
    { id: 'AGT-842', name: 'Zinash K.', phone: '+251 911 234567', location: 'Adama Hub', transactions: 142, volume: '45,000', float: '12,500', ardiScore: 92, lastSync: '2m ago', syncStatus: 'ONLINE', lat: 8.5414, lng: 39.2689 },
    { id: 'AGT-109', name: 'Bekele T.', phone: '+251 922 345678', location: 'Modjo Rural', transactions: 89, volume: '28,300', float: '5,000', ardiScore: 78, lastSync: '14h ago', syncStatus: 'OFFLINE_PENDING', lat: 8.5885, lng: 39.1216 },
    { id: 'AGT-993', name: 'Alemu M.', phone: '+251 933 456789', location: 'Bishoftu Market', transactions: 210, volume: '88,000', float: '32,000', ardiScore: 95, lastSync: 'Just now', syncStatus: 'SYNCING', lat: 8.7516, lng: 38.9774 },
    { id: 'AGT-445', name: 'Chala D.', phone: '+251 944 567890', location: 'Dukem East', transactions: 34, volume: '9,200', float: '1,500', ardiScore: 65, lastSync: '2d ago', syncStatus: 'FAILED', lat: 8.8037, lng: 38.9044 },
    { id: 'AGT-772', name: 'Hirut A.', phone: '+251 955 678901', location: 'Meki South', transactions: 67, volume: '18,400', float: '4,200', ardiScore: 81, lastSync: '5m ago', syncStatus: 'ONLINE', lat: 8.1500, lng: 38.8167 },
  ] as any[],
  swaps: [] as any[],
  liquidityLogs: [] as any[],
  tasks: {} as Record<string, any>, // Celery worker mock
  statements: {
    'AG-7742': [
      { date: new Date(Date.now() - 3600000 * 2).toISOString(), type: 'DEBIT', amount: 5400.00, currency: 'ETB', balanceAfter: 12500, ref: 'TX9A8B7C6', isoMsgId: 'MSG1001' },
      { date: new Date(Date.now() - 3600000 * 24).toISOString(), type: 'CREDIT', amount: 20000.00, currency: 'ETB', balanceAfter: 17900, ref: 'TX1A2B3C4', isoMsgId: 'MSG1002' },
      { date: new Date(Date.now() - 3600000 * 48).toISOString(), type: 'DEBIT', amount: 1500.00, currency: 'ETB', balanceAfter: -2100, ref: 'TX4D5E6F7', isoMsgId: 'MSG1003' }
    ]
  } as Record<string, any[]>, // Statement ledger
  otps: {} as Record<string, string>, // Fayda OTP store
};

// Nexus Core API & Ardi Credit Service Mock
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  app.use(express.json());

  // === OpenTelemetry (OTel) Distributed Tracing Middleware ===
  app.use((req: any, res: any, next: express.NextFunction) => {
    // 1. Extract context from incoming request or generate a new Trace ID
    const traceId = req.headers['x-trace-id'] || crypto.randomBytes(16).toString('hex');
    const spanId = crypto.randomBytes(8).toString('hex');
    
    // 2. Attach context to req for downstream services/workers
    req.traceId = traceId;
    req.spanId = spanId;
    
    // 3. Log the HTTP request (simulating OTel span start)
    console.log(`[OTel | Trace: ${traceId} | Span: ${spanId}] ${req.method} ${req.originalUrl}`);
    
    // 4. Inject trace context into response headers (propagation)
    res.setHeader('x-trace-id', traceId);
    
    // 5. Track duration to simulate closing the span
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[OTel | Trace: ${traceId} | Span: ${spanId}] ${req.method} ${req.originalUrl} completed in ${duration}ms [STATUS ${res.statusCode}]`);
    });
    
    next();
  });

  // Bank-grade mTLS Security Middleware
  const mTLSMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // In production, the edge proxy terminates mTLS and sets this header.
    // For dev/testing, we fallback to accepting local dev requests
    const isMtlsVerified = req.headers['x-mtls-verified'] === 'true' || process.env.NODE_ENV !== 'production';
    if (!isMtlsVerified && !req.originalUrl.startsWith('/api/health')) {
      return res.status(403).json({ error: 'FORBIDDEN: mTLS Client Certificate Missing or Invalid.' });
    }
    next();
  };
  
  app.use('/api/', mTLSMiddleware);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NAGA-NODE Nexus API is healthy' });
  });

  // GhostSync webhook endpoint for receiving queued events
  app.post('/api/ghostsync', (req, res) => {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Expected array of events' });
    }
    
    // We optionally use Zod here if available, or just mock structural check for demo.
    // For ISO 20022 hardening, we enforce the schema validation on the server side:
    
    const processed = [];
    events.forEach(event => {
      console.log(`[GhostSync] Processing event: ${event.type} - ${event.row_key}`);
      
      if (event.type === 'ONBOARD_AGENT') {
        const ardiScore = Math.floor(Math.random() * 300) + 500;
        const newAgent = { ...event.payload, id: Math.random().toString(36).substr(2, 9), trust_score: ardiScore, status: 'active', onboarded_at: new Date().toISOString() };
        db.agents.push(newAgent);
        processed.push({ row_key: event.row_key, status: 'success', data: newAgent });
      } else if (event.type === 'SWAP_EXECUTION') {
        db.swaps.push({ ...event.payload, received_at: new Date().toISOString() });
        processed.push({ row_key: event.row_key, status: 'success' });
      } else if (event.type === 'transaction') {
        // Here we apply ISO 20022 validation on the secured payload
        const { isoMessage, signature, originalMetadata } = event.payload;
        
        if (isoMessage && signature) {
           // Basic schema assertion
           if (!isoMessage.MsgId || !isoMessage.CdtTrfTxInf) {
              console.error('[GhostSync] INVALID ISO20022 pacs.008 SCHEMA DETECTED!');
              processed.push({ row_key: event.row_key, status: 'failed', error: 'Invalid pacs.008 schema' });
              return;
           }
           
           console.log(`[GhostSync] Validated signed transaction ${isoMessage.MsgId} - Signature [${signature.substring(0, 8)}...]`);
           // Add to statement ledger mock
           const amount = isoMessage.CdtTrfTxInf[0]?.IntrBkSttlmAmt?.value || 0;
           const agentRef = 'AG-7742'; // Hardcoded for demo/AgentKiosk reference
           if (!db.statements[agentRef]) db.statements[agentRef] = [];
           db.statements[agentRef].push({
             date: isoMessage.CreDtTm || new Date().toISOString(),
             type: originalMetadata.type === 'Cash Out' ? 'CREDIT' : 'DEBIT',
             amount: parseFloat(amount),
             currency: 'ETB',
             balanceAfter: 10000, 
             ref: originalMetadata.txId,
             isoMsgId: isoMessage.MsgId
           });
           
           processed.push({ row_key: event.row_key, status: 'success' });
        } else {
           console.error('[GhostSync] Missing ISO message or signature!');
           processed.push({ row_key: event.row_key, status: 'failed', error: 'Missing security payload' });
        }
      }
    });

    res.json({ processed });
  });

  // Get Agents
  app.get('/api/agents', (req, res) => {
    res.json(db.agents);
  });

  // Get Swaps
  app.get('/api/swaps', (req, res) => {
    res.json(db.swaps);
  });

  // Sovereign Node Metrics (Raxio Ethiopia + GCP AI)
  app.get('/api/node/metrics', (req, res) => {
    res.json({
      raxioPrimary: {
        cpu: Math.floor(Math.random() * 20) + 30, // 30-50%
        memory: Math.floor(Math.random() * 15) + 60, // 60-75%
        latency: Math.floor(Math.random() * 5) + 1, // 1-5ms
        status: 'Operational',
        tier: 'Tier 3 (Local)',
      },
      anonymizer: {
        piiStripped: Math.floor(Math.random() * 100) + 84000,
        status: 'Active',
      },
      gcpAiLayer: {
        inferenceMs: Math.floor(Math.random() * 50) + 80, // 80-130ms
        requestsActive: Math.floor(Math.random() * 100) + 300,
        status: 'Serving Models',
      },
      fabricLedger: {
        lastBlock: Math.floor(Math.random() * 10) + 847200,
        peers: 4,
        status: 'In Sync',
      }
    });
  });

  // Fayda OTP Send Simulator
  app.post('/api/fayda/otp/send', (req, res) => {
    const { phone, tin } = req.body;
    if (!phone || !tin) return res.status(400).json({ error: 'Missing phone or TIN' });
    
    const trackingId = crypto.randomUUID();
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    db.otps[trackingId] = otp;
    
    console.log(`[Fayda Bridge] OTP sent to ${phone}: ${otp}`);
    // Simulate SMS sending
    res.json({ trackingId, status: 'OTP_SENT_TO_GATEWAY' });
  });

  // Fayda OTP Verify Simulator
  app.post('/api/fayda/otp/verify', (req, res) => {
    const { trackingId, otp } = req.body;
    if (db.otps[trackingId] && db.otps[trackingId] === otp) {
      delete db.otps[trackingId]; // ensure single-use
      
      const faydaHash = crypto.createHash('sha256').update(`FAYDA-${Date.now()}`).digest('hex');
      res.json({ verified: true, faydaHash, status: 'VERIFIED' });
    } else {
      res.status(401).json({ verified: false, error: 'Invalid or expired OTP' });
    }
  });

  // Ardi Score & XAI Engine (Advanced 4-Factor Algorithm) - ASYNC
  app.post('/api/score/compute', (req: any, res: any) => {
    const { assetId, features } = req.body;
    if (!assetId || !features) return res.status(400).json({ error: 'Missing payload' });

    const jobId = crypto.randomUUID();
    const traceId = req.traceId; // Extract Trace ID from OTel Context
    db.tasks[jobId] = { status: 'PENDING', task_name: 'ARDI_COMPUTE', payload: req.body, created_at: Date.now(), trace_id: traceId };

    console.log(`[OTel | Trace: ${traceId}] Job ${jobId} pushed to Celery Queue. Main event loop free.`);

    // Simulate background worker processing executing the task asynchronously
    // By offloading this to a queue, the main event loop remains unblocked from heavy computations.
    setTimeout(() => {
      console.log(`[OTel Worker | Trace: ${traceId}] Dequeued Ardi compute task ${jobId}. Beginning processing...`);
      
      const operational = features.stk_success_rate || (Math.random() * 20 + 70); // App use/Node interactions
      const behavioral = features.ekub_on_time_pct || (Math.random() * 30 + 60); // Savings consistency 
      const resilience = features.ndvi_stability || (Math.random() * 15 + 80); // Climate vulnerability
      const agriCredit = features.agri_input_repayment || (Math.random() * 25 + 75); // Fertilizer/Seed loan repayment history

      // Weights: Op 25%, Beh 25%, Res 20%, Agri 30%
      const opAlpha = 0.25 * operational;
      const behAlpha = 0.25 * behavioral;
      const resAlpha = 0.20 * resilience;
      const agriAlpha = 0.30 * agriCredit;
      const ardiScore = Math.floor(opAlpha + behAlpha + resAlpha + agriAlpha);

      const explanationId = crypto.randomUUID();

      // SHAP-style Explainability Feature Contributions
      const shapFeatures = [
        { name: "Input Loan History", contribution: ((agriAlpha / 30) * 100).toFixed(1), nl: "Consistent fertilizer/seed credit repayments." },
        { name: "Ekub Timeliness", contribution: ((behAlpha / 25) * 100).toFixed(1), nl: "Consistent savings streak." },
        { name: "Node Uptime & STK", contribution: ((opAlpha / 25) * 100).toFixed(1), nl: "High transaction success rate." },
        { name: "Climate Resilience (NDVI)", contribution: ((resAlpha / 20) * 100).toFixed(1), nl: "Stable vegetation metrics in corridor." }
      ].sort((a, b) => Number(b.contribution) - Number(a.contribution));

      db.tasks[jobId].status = 'SUCCESS';
      db.tasks[jobId].result = {
        assetId,
        ardiScore,
        subScores: { operational, behavioral, resilience, agriCredit },
        drivers: shapFeatures,
        explanationId,
        modelVersion: 'v2.0.0-agri-credit'
      };
      
      console.log(`[OTel Worker | Trace: ${traceId}] Ardi compute task ${jobId} EXACTLY completed.`);
    }, 4500); // Simulate 4.5s heavy calculation

    res.status(202).json({ jobId, status: 'QUEUED', message: 'ArdiScore calculation successfully queued.' });
  });

  // Polling endpoint for Ardi calculation jobs
  app.get('/api/score/compute/:jobId', (req, res) => {
    const job = db.tasks[req.params.jobId];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      jobId: req.params.jobId,
      status: job.status,
      result: job.result || null
    });
  });

  // Celery Worker Queue Mock
  app.post('/api/worker/tasks', (req, res) => {
    const { task_name, payload } = req.body;
    const taskId = crypto.randomUUID();
    
    db.tasks[taskId] = { status: 'PENDING', task_name, payload, created_at: Date.now() };
    
    // Simulate background worker processing executing the task asynchronously
    setTimeout(() => {
      db.tasks[taskId].status = 'SUCCESS';
      db.tasks[taskId].result = { message: 'Task executed', processed_at: Date.now() };
      console.log(`[Celery Mock] Task ${taskId} (${task_name}) completed.`);
    }, 3500);
    
    res.json({ taskId, status: 'ENQUEUED' });
  });

  app.get('/api/worker/tasks/:taskId', (req, res) => {
    const task = db.tasks[req.params.taskId];
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  // ISO 20022 Raw Message Simulator Endpoint
  app.get('/api/iso20022/logs', (req, res) => {
    const mockLogs = [
      {
        id: crypto.randomUUID(),
        type: 'pacs.008.001.08',
        description: 'Customer Credit Transfer',
        timestamp: new Date(Date.now() - 5000).toISOString(),
        status: 'ACKNOWLEDGED',
        rawXml: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>SOVNX-${Date.now()}-001</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Cd>ETHCH</Cd>
        </ClrSys>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <TxId>TX-9938-ABE</TxId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="ETB">45000.00</IntrBkSttlmAmt>
      <Dbtr>
        <Nm>FMCG DISTRIBUTOR CORP</Nm>
      </Dbtr>
      <Cdtr>
        <Nm>ADAMA SUPER HUB</Nm>
      </Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`
      },
      {
         id: crypto.randomUUID(),
         type: 'pacs.002.001.10',
         description: 'Payment Status Report',
         timestamp: new Date(Date.now() - 12000).toISOString(),
         status: 'PROCESSED',
         rawXml: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
  <FIToFIPmtStsRpt>
    <GrpHdr>
      <MsgId>SOVNX-${Date.now()}-002</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
    </GrpHdr>
    <TxInfAndSts>
      <OrgnlTxId>TX-1184-MOD</OrgnlTxId>
      <TxSts>ACCC</TxSts>
      <StsRsnInf>
        <Rsn>
          <Cd>G000</Cd>
        </Rsn>
      </StsRsnInf>
    </TxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>`
      },
      {
         id: crypto.randomUUID(),
         type: 'pain.001.001.09',
         description: 'Customer Credit Transfer Initiation',
         timestamp: new Date(Date.now() - 45000).toISOString(),
         status: 'VALIDATING',
         rawXml: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>SOVNX-${Date.now()}-003</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <InitgPty>
        <Nm>SOVEREIGN AGENT 2004</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-AGR-004</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <CdtTrfTxInf>
        <PmtId>
          <InstrId>AGRI-SUBSIDY-58</InstrId>
          <EndToEndId>ETE-588493</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="ETB">2800.00</InstdAmt>
        </Amt>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`
      }
    ];
    res.json(mockLogs);
  });

  // ISO 20022 (pacs.008) Settlement Message
  app.post('/api/settlement/iso20022', (req, res) => {
    const { fromAgentId, toWallet, amount, currency } = req.body;
    const msgId = 'MSG' + Date.now();
    const txId = 'TX' + crypto.randomUUID().split('-')[0].toUpperCase();
    
    // ISO 20022 pacs.008.001.08 Document Builder Simulation
    const isoMessage = `
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
        <MsgId>${msgId}</MsgId>
        <CreDtTm>${new Date().toISOString()}</CreDtTm>
        <NbOfTxs>1</NbOfTxs>
        <SttlmInf><SttlmMtd>CLRG</SttlmMtd><ClrSys><Prtry>SPONSOR_BANK_PROXY</Prtry></ClrSys></SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
        <PmtId><EndToEndId>${txId}</EndToEndId><TxId>${txId}</TxId></PmtId>
        <IntrBkSttlmAmt Ccy="${currency || 'ETB'}">${parseFloat(amount || '0').toFixed(2)}</IntrBkSttlmAmt>
        <Dbtr><Id><OrgId><Othr><Id>${fromAgentId || 'SYSTEM'}</Id></Othr></OrgId></Id></Dbtr>
        <Cdtr><Id><PrvtId><Othr><Id>${toWallet || 'TARGET'}</Id></Othr></PrvtId></Id></Cdtr>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>
    `.trim();

    // Ledger statement log formulation
    const agentRef = fromAgentId || 'ROOT';
    if (!db.statements[agentRef]) db.statements[agentRef] = [];
    db.statements[agentRef].push({
      date: new Date().toISOString(),
      type: 'DEBIT',
      amount: parseFloat(amount || '0'),
      currency: currency || 'ETB',
      balanceAfter: Math.floor(Math.random() * 40000) + 10000, 
      ref: txId,
      isoMsgId: msgId
    });

    res.type('application/xml');
    res.send(isoMessage);
  });

  // Zero Trust Service Security Middleware (SPIFFE/SPIRE simulation)
  const requireSpiffeIdentity = (allowedIds: string[]) => {
    return (req: any, res: any, next: express.NextFunction) => {
      const svidToken = req.headers['x-spiffe-svid'];

      if (!svidToken) {
        console.error(`[Zero Trust] Blocked unauthenticated attempt to ${req.originalUrl}`);
        return res.status(401).json({ error: 'ZERO_TRUST_VIOLATION: Missing SPIFFE ID (SVID)' });
      }
      
      try {
        const parts = svidToken.split('.');
        if (parts.length < 2) throw new Error("Invalid token format");
        const payload = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
        
        if (payload.expires_at < Date.now()) {
          return res.status(401).json({ error: 'ZERO_TRUST_VIOLATION: SVID Expired' });
        }

        if (!allowedIds.includes(payload.spiffe_id) && !allowedIds.includes('*')) {
          console.error(`[Zero Trust] Denied access: ${payload.spiffe_id} is not authorized for ${req.originalUrl}`);
          return res.status(403).json({ error: `ZERO_TRUST_VIOLATION: Unauthorized SPIFFE ID ${payload.spiffe_id}` });
        }

        req.spiffeId = payload.spiffe_id;
        console.log(`[Zero Trust] Authenticated ${req.spiffeId} via mTLS/SVID for ${req.originalUrl}`);
        next();
      } catch (e) {
        return res.status(400).json({ error: 'ZERO_TRUST_VIOLATION: Malformed SVID' });
      }
    };
  };

  // Automated Reconciliation Engine -> "Bank Settlement" Loop
  app.post('/api/reconciliation/run', requireSpiffeIdentity(['spiffe://enawuga.com/ns/governance/sa/auditor']), (req: any, res: any) => {
    const traceId = req.traceId || crypto.randomBytes(16).toString('hex');
    console.log(`[OTel Worker | Trace: ${traceId}] Commencing Automated Reconciliation Engine...`);

    const agentRef = 'AG-7742';
    const internalRecords = db.statements[agentRef] || [];
    
    let matched = 0;
    const discrepancies: any[] = [];

    // Map internal records and compare against simulated bank truth
    internalRecords.forEach(internalTx => {
      const rand = Math.random();
      if (rand < 0.1) {
        discrepancies.push({
           txId: internalTx.ref,
           category: 'MISSING_IN_BANK',
           internalAmount: internalTx.amount,
           bankAmount: 0,
           reason: 'Pacs.008 sent but not settled by sponsor bank.',
           isoMsgId: internalTx.isoMsgId
        });
      } else if (rand < 0.15) { 
        const alteredBankAmount = internalTx.amount - 50; 
        discrepancies.push({
           txId: internalTx.ref,
           category: 'AMOUNT_MISMATCH',
           internalAmount: internalTx.amount,
           bankAmount: alteredBankAmount,
           reason: 'Fee tier deduction discrepancy during clearing.',
           isoMsgId: internalTx.isoMsgId
        });
      } else {
        matched++;
      }
    });

    if (Math.random() < 0.2) {
       discrepancies.push({
          txId: 'TX-EXT-' + Math.floor(Math.random() * 9999),
          category: 'UNRECOGNIZED_ENTRY',
          internalAmount: 0,
          bankAmount: Math.floor(Math.random() * 5000),
          reason: 'Unmatched CAMT.053 settlement entry.',
          isoMsgId: 'N/A'
       });
    }

    const report = {
      reconciliationId: 'REC-' + Date.now(),
      traceId,
      timestamp: new Date().toISOString(),
      agent: agentRef,
      totalInternalRecords: internalRecords.length,
      matchedRecords: matched,
      discrepanciesFound: discrepancies.length,
      discrepancies,
      status: discrepancies.length === 0 ? 'CLEARED' : 'NEEDS_REVIEW'
    };

    console.log(`[OTel Worker | Trace: ${traceId}] Reconciliation complete. ${discrepancies.length} discrepancies discovered.`);

    res.json(report);
  });

  // Financial Statement Flow Retrieval
  app.get('/api/statements/:agentId', (req, res) => {
    const records = db.statements[req.params.agentId] || [];
    res.json({ agentId: req.params.agentId, statements: records });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
