import { validateDataConfig } from "../domain/residency";
import { registerDemoApi } from "./demo-api";
import express from "express";
import crypto from "crypto";

// Mocks for microservices
const db = {
  agents: [
    {
      id: "AGT-842",
      name: "Zinash K.",
      phone: "+251 911 234567",
      location: "Adama Hub",
      transactions: 142,
      volume: "45,000",
      float: "12,500",
      ardiScore: 92,
      lastSync: "2m ago",
      syncStatus: "ONLINE",
      lat: 8.5414,
      lng: 39.2689,
    },
    {
      id: "AGT-109",
      name: "Bekele T.",
      phone: "+251 922 345678",
      location: "Modjo Rural",
      transactions: 89,
      volume: "28,300",
      float: "5,000",
      ardiScore: 78,
      lastSync: "14h ago",
      syncStatus: "OFFLINE_PENDING",
      lat: 8.5885,
      lng: 39.1216,
    },
    {
      id: "AGT-993",
      name: "Alemu M.",
      phone: "+251 933 456789",
      location: "Bishoftu Market",
      transactions: 210,
      volume: "88,000",
      float: "32,000",
      ardiScore: 95,
      lastSync: "Just now",
      syncStatus: "SYNCING",
      lat: 8.7516,
      lng: 38.9774,
    },
    {
      id: "AGT-445",
      name: "Chala D.",
      phone: "+251 944 567890",
      location: "Dukem East",
      transactions: 34,
      volume: "9,200",
      float: "1,500",
      ardiScore: 65,
      lastSync: "2d ago",
      syncStatus: "FAILED",
      lat: 8.8037,
      lng: 38.9044,
    },
    {
      id: "AGT-772",
      name: "Hirut A.",
      phone: "+251 955 678901",
      location: "Meki South",
      transactions: 67,
      volume: "18,400",
      float: "4,200",
      ardiScore: 81,
      lastSync: "5m ago",
      syncStatus: "ONLINE",
      lat: 8.15,
      lng: 38.8167,
    },
  ] as any[],
  swaps: [] as any[],
  liquidityLogs: [] as any[],
  tasks: {} as Record<string, any>, // Celery worker mock
  statements: {
    "AG-7742": [
      {
        date: new Date(Date.now() - 3600000 * 2).toISOString(),
        type: "DEBIT",
        amount: 5400.0,
        currency: "ETB",
        balanceAfter: 12500,
        ref: "TX9A8B7C6",
        isoMsgId: "MSG1001",
      },
      {
        date: new Date(Date.now() - 3600000 * 24).toISOString(),
        type: "CREDIT",
        amount: 20000.0,
        currency: "ETB",
        balanceAfter: 17900,
        ref: "TX1A2B3C4",
        isoMsgId: "MSG1002",
      },
      {
        date: new Date(Date.now() - 3600000 * 48).toISOString(),
        type: "DEBIT",
        amount: 1500.0,
        currency: "ETB",
        balanceAfter: -2100,
        ref: "TX4D5E6F7",
        isoMsgId: "MSG1003",
      },
    ],
  } as Record<string, any[]>, // Statement ledger
};

// Nexus Core API & Ardi Credit Service Mock
export function createApp() {
  validateDataConfig(process.env);
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'",
    );
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  // Legacy unauthenticated identity, settlement and upload paths are closed.
  app.post(
    [
      "/api/ghostsync",
      "/api/fayda/otp/send",
      "/api/fayda/otp/verify",
      "/api/settlement/iso20022",
      "/api/reconciliation/run",
      "/api/worker/tasks",
    ],
    (_req, res) => {
      res
        .status(403)
        .json({ error: "PROTOTYPE_OPERATION_DISABLED", simulated: true });
    },
  );
  registerDemoApi(app);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "NAGA-NODE Nexus API is healthy" });
  });

  // Get Agents
  app.get("/api/agents", (req, res) => {
    res.json(db.agents);
  });

  // Get Swaps
  app.get("/api/swaps", (req, res) => {
    res.json(db.swaps);
  });

  // Sovereign Node Metrics (Raxio Ethiopia + GCP AI)
  app.get("/api/node/metrics", (req, res) => {
    res.json({
      raxioPrimary: {
        cpu: Math.floor(Math.random() * 20) + 30, // 30-50%
        memory: Math.floor(Math.random() * 15) + 60, // 60-75%
        latency: Math.floor(Math.random() * 5) + 1, // 1-5ms
        status: "Operational",
        tier: "Tier 3 (Local)",
      },
      anonymizer: {
        piiStripped: Math.floor(Math.random() * 100) + 84000,
        status: "Active",
      },
      gcpAiLayer: {
        inferenceMs: Math.floor(Math.random() * 50) + 80, // 80-130ms
        requestsActive: Math.floor(Math.random() * 100) + 300,
        status: "Serving Models",
      },
      fabricLedger: {
        lastBlock: Math.floor(Math.random() * 10) + 847200,
        peers: 4,
        status: "In Sync",
      },
    });
  });

  // Legacy arbitrary scoring jobs are disabled; Ardi's synthetic calculator runs locally.
  app.post("/api/score/compute", (_req, res) =>
    res.status(403).json({ error: "LEGACY_SCORING_DISABLED" }),
  );

  // ISO 20022 Raw Message Simulator Endpoint
  app.get("/api/iso20022/logs", (req, res) => {
    const mockLogs = [
      {
        id: crypto.randomUUID(),
        type: "pacs.008.001.08",
        description: "Customer Credit Transfer",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        status: "ACKNOWLEDGED",
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
</Document>`,
      },
      {
        id: crypto.randomUUID(),
        type: "pacs.002.001.10",
        description: "Payment Status Report",
        timestamp: new Date(Date.now() - 12000).toISOString(),
        status: "PROCESSED",
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
</Document>`,
      },
      {
        id: crypto.randomUUID(),
        type: "pain.001.001.09",
        description: "Customer Credit Transfer Initiation",
        timestamp: new Date(Date.now() - 45000).toISOString(),
        status: "VALIDATING",
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
</Document>`,
      },
    ];
    res.json(mockLogs);
  });

  // Financial Statement Flow Retrieval
  app.get("/api/statements/:agentId", (req, res) => {
    const records = db.statements[req.params.agentId] || [];
    res.json({ agentId: req.params.agentId, statements: records });
  });

  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API_NOT_FOUND" }),
  );
  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(error.type === "entity.too.large" ? 413 : 400)
        .json({ error: "INVALID_REQUEST" });
    },
  );
  return app;
}
