// Deterministic synthetic presentation data. Never operational telemetry.
export const syntheticMetadata = {
  simulated: true,
  dataMode: "synthetic",
  capabilityStatus: "SYNTHETIC DEMO",
  notice:
    "Synthetic demo data. No live institutions or infrastructure connected.",
} as const;
export const demoAgents = [
  {
    id: "AGT-842",
    name: "Demo Agent A",
    phone: "+251900000001",
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
    name: "Demo Agent B",
    phone: "+251900000002",
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
    name: "Demo Agent C",
    phone: "+251900000003",
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
    name: "Demo Agent D",
    phone: "+251900000004",
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
    name: "Demo Agent E",
    phone: "+251900000005",
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
];
export const infrastructureFixture = {
  sampleCpuPercent: 35,
  sampleMemoryPercent: 62,
  sampleLatencyMs: 12,
  observedAt: null,
  connectionStatus: "NOT_CONNECTED",
  components: [
    { name: "Wishland orchestration software", state: "LOCAL_PROTOTYPE" },
    { name: "Licensed PartnerFI", state: "PROPOSED" },
    { name: "Ethiopia-resident infrastructure", state: "NOT_PROVISIONED" },
    { name: "External identity provider", state: "DISABLED" },
  ],
};
export const isoFixtures = [
  {
    id: "DEMO-ISO-001",
    type: "pacs.008 illustration",
    description:
      "Non-conformant educational sample; not sent, authorized or settled.",
    timestamp: "2026-01-01T00:00:00.000Z",
    status: "SAMPLE_NOT_SENT",
    rawXml:
      '<SyntheticExample><CustomerReference>DEMO_CUSTOMER</CustomerReference><Amount currency="ETB">100.00</Amount><Status>NOT_SENT</Status></SyntheticExample>',
  },
];
export function syntheticEnvelope<T>(data: T) {
  return { ...syntheticMetadata, data };
}
