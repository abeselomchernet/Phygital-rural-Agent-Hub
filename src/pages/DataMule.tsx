import {
  CapabilityBadge,
  ConflictDemo,
  TransportDemo,
} from "../components/ProductPresentation";

export default function DataMule() {
  return (
    <>
      <section className="product-card space-y-4" data-testid="data-mule-boundary">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Data Mule — offline handoff concept</h1>
        <p>
          Illustrative field-resilience workflow only. The demo does not discover
          devices, read the GhostSync outbox, transfer records, authenticate a
          receiver or acknowledge delivery.
        </p>
        <p className="boundary-note">
          Remote transport for real data remains disabled pending encrypted-edge,
          authenticated-receiver, residency and migration controls. Transport receipt
          never establishes financial authorization or settlement.
        </p>
      </section>
      <div className="product-grid">
        <TransportDemo />
        <ConflictDemo />
      </div>
    </>
  );
}
