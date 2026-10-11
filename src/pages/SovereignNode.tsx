import {
  CapabilityBadge,
  ProductCard,
} from "../components/ProductPresentation";
import { infrastructureFixture, isoFixtures } from "../demo/fixtures";
export default function DemoArchitecture() {
  return (
    <>
      <section className="product-card">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h2>Enawuga demo architecture</h2>
        <p>
          Deterministic illustrative values, not operational telemetry. No data
          center, AI service, ledger network or financial rail is connected.
        </p>
        <div className="infra-grid">
          {[
            ["Sample CPU", infrastructureFixture.sampleCpuPercent + "%"],
            ["Sample memory", infrastructureFixture.sampleMemoryPercent + "%"],
            ["Sample latency", infrastructureFixture.sampleLatencyMs + " ms"],
          ].map(([title, value]) => (
            <div key={title}>
              <p>{title}</p>
              <strong className="infra-value">{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <div className="product-grid">
        {infrastructureFixture.components.map((item) => (
          <ProductCard
            key={item.name}
            title={item.name}
            state={
              item.state === "LOCAL_PROTOTYPE" ? "IMPLEMENTED" : "PROPOSED"
            }
          >
            <p>{item.state.replaceAll("_", " ")}</p>
            <p>
              Local software behavior only. Infrastructure and institutional
              authorization are not established.
            </p>
          </ProductCard>
        ))}
      </div>
      <ProductCard title="ISO 20022 message concept" state="SYNTHETIC DEMO">
        <p>{isoFixtures[0].description}</p>
        <pre className="sample-slip whitespace-pre-wrap break-all">
          {isoFixtures[0].rawXml}
        </pre>
      </ProductCard>
    </>
  );
}
