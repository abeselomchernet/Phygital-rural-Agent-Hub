import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Sprout,
  Package,
  Printer,
  Droplets,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  WifiOff,
  Sun,
  Users,
  Globe,
  Truck,
  Mic,
} from "lucide-react";
import "./wishland-brand.css";
import "./product-presentation.css";
export type CapabilityState =
  | "IMPLEMENTED"
  | "SYNTHETIC DEMO"
  | "PROPOSED"
  | "DISABLED PENDING PARTNER AUTHORIZATION";
export function CapabilityBadge({ state }: { state: CapabilityState }) {
  return (
    <span
      className={`capability-badge ${state === "IMPLEMENTED" ? "implemented" : state === "SYNTHETIC DEMO" ? "demo" : "proposed"}`}
    >
      {state}
    </span>
  );
}
const copy = {
  en: {
    workspace: "Rural agent workspace",
    subtitle: "Local service. Clear responsibility.",
    kiosk: "Agent Terminal",
    portfolio: "Farmer 360 service portfolio",
    inventory: "Inventory & restock",
    liquidity: "Local liquidity scenario",
    hardware: "Device & printer concepts",
    training: "Agent learning",
    onboarding: "Agent readiness",
    queue: "Offline request outbox",
    transport: "Data Mule transport",
    language: "Presentation language",
  },
  am: {
    workspace: "የገጠር ወኪል የሥራ ቦታ",
    subtitle: "የአካባቢ አገልግሎት። ግልጽ ኃላፊነት።",
    kiosk: "የወኪል ተርሚናል",
    portfolio: "የገበሬ 360 አገልግሎቶች",
    inventory: "ዕቃ እና ዳግም አቅርቦት",
    liquidity: "የአካባቢ ፈሳሽነት ሁኔታ",
    hardware: "የመሣሪያ እና አታሚ ጽንሰ ሀሳብ",
    training: "የወኪል ትምህርት",
    onboarding: "የወኪል ዝግጅት",
    queue: "ከመስመር ውጭ የጥያቄ ሳጥን",
    transport: "የዳታ ማጓጓዣ",
    language: "የማሳያ ቋንቋ",
  },
  or: {
    workspace: "Iddoo hojii bakka bu’aa baadiyyaa",
    subtitle: "Tajaajila naannoo. Itti gaafatamummaa ifaa.",
    kiosk: "Terminalii Bakka Bu’aa",
    portfolio: "Tajaajiloota Qonnaan Bulaa 360",
    inventory: "Kuusaa fi dhiyeessii",
    liquidity: "Haala dhangala'aa naannoo",
    hardware: "Yaada meeshaa fi maxxansaa",
    training: "Barnoota bakka bu’aa",
    onboarding: "Qophii bakka bu’aa",
    queue: "Tarree gaaffii interneetii malee",
    transport: "Geejjiba daataa",
    language: "Afaan agarsiisaa",
  },
};
type Language = keyof typeof copy;
const LanguageContext = createContext(copy.en);
export const usePresentationCopy = () => useContext(LanguageContext);
export function PresentationShell({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en"),
    t = copy[language];
  return (
    <LanguageContext.Provider value={t}>
      <div className="product-shell">
        <header className="product-header">
          <Link to="/" className="product-brand" aria-label="Enawuga home by Wishland Networking PLC">
            <img className="wishland-wordmark" src="/brand/wishland-wordmark.png" alt="Wishland Networking PLC" />
            <span className="product-brand-divider" aria-hidden="true" />
            <span className="product-brand-copy">
              <strong>Enawuga</strong>
              <small>Phygital Rural Agent Hub</small>
              <em>Wishland Networking PLC · Technology provider</em>
            </span>
          </Link>
          <div className="product-header-tools">
            <span className="wl-environment-chip">Stage 4 {"\u00b7"} Synthetic</span>
            <div className="language-picker">
              <label htmlFor="presentation-language">{t.language}</label>
              <select
                id="presentation-language"
                aria-describedby="presentation-language-status"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="am">{"\u12a0\u121b\u122d\u129b"}</option>
                <option value="or">Afaan Oromoo</option>
              </select>
              <span id="presentation-language-status" className="language-review-note" aria-live="polite" aria-atomic="true">
                {language === "en" ? "English source language" : "Preview only - local-speaker review required"}
              </span>
            </div>
          </div>
        </header>
        <div className="product-hero">
          <p className="eyebrow">
            Wishland technology provider · Synthetic Demo
          </p>
          <h1>{t.workspace}</h1>
          <p>
            {t.subtitle} Explore the service vision with synthetic fixtures.
            PartnerFI remains the future regulated principal.
          </p>
          <div className="capability-legend">
            {(
              [
                "IMPLEMENTED",
                "SYNTHETIC DEMO",
                "PROPOSED",
                "DISABLED PENDING PARTNER AUTHORIZATION",
              ] as const
            ).map((state) => (
              <CapabilityBadge key={state} state={state} />
            ))}
          </div>
          <p className="caption">
            Implemented means local software behavior. Presentation headings
            support three languages; detailed domain controls remain English.
            Translations require local-speaker review.
          </p>
        </div>
        <nav className="product-nav" aria-label="Prototype modules">
          <div className="product-nav-group">
            <span className="product-nav-label">Field workflows</span>
            <Link to="/kiosk">{t.kiosk}</Link>
            <Link to="/farmer-360">Farmer 360</Link>
            <Link to="/onboard">{t.onboarding}</Link>
            <Link to="/academy">{t.training}</Link>
            <Link to="/queue">GhostSync</Link>
            <Link to="/data-mule">Data Mule</Link>
            <Link to="/transcription">Conversation</Link>
          </div>
          <div className="product-nav-group">
            <span className="product-nav-label">Network operations</span>
            <Link to="/supervisor">Supervisor</Link>
            <Link to="/operations">Operations</Link>
            <Link to="/network-operations">Access</Link>
            <Link to="/partners">Partner Ecosystem</Link>
            <Link to="/liquidity">Network Liquidity</Link>
            <Link to="/cash-fleet">Cash Fleet</Link>
            <Link to="/fmcg">FMCG</Link>
          </div>
          <div className="product-nav-group">
            <span className="product-nav-label">Evidence & concepts</span>
            <Link to="/node-status">Demo architecture</Link>
            <Link to="/ardi-engine">Ardi calculator</Link>
          </div>
        </nav>
        <div className="product-content">{children}</div>
        <footer className="product-footer">
          Synthetic fixtures only · No live institutions connected · No
          production or pilot authorization
        </footer>
      </div>
    </LanguageContext.Provider>
  );
}
export function ProductCard({
  title,
  state,
  icon,
  children,
}: {
  title: string;
  state: CapabilityState;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="product-card">
      <div className="card-top">
        <span className="module-icon">{icon}</span>
        <CapabilityBadge state={state} />
      </div>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function InventoryDemo() {
  const t = usePresentationCopy();
  const [quantity, setQuantity] = useState(2),
    [draft, setDraft] = useState(false);
  return (
    <ProductCard title={t.inventory} state="SYNTHETIC DEMO" icon={<Package />}>
      <p>
        Illustrative kiosk stock. Plan replenishment without sending an order.
      </p>
      <ul className="stock-list">
        <li>
          <span>Seed packs</span>
          <strong>24 units</strong>
        </li>
        <li>
          <span>Solar lanterns</span>
          <strong>8 units</strong>
        </li>
        <li>
          <span>Receipt rolls</span>
          <strong>3 rolls</strong>
        </li>
      </ul>
      <label>
        Sample restock quantity
        <input
          aria-label="Sample restock quantity"
          type="number"
          min="1"
          max="20"
          value={quantity}
          onChange={(e) => {
            setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)));
            setDraft(false);
          }}
        />
      </label>
      <button className="product-button" onClick={() => setDraft(true)}>
        Preview restock draft
      </button>
      {draft && (
        <p role="status">
          Sample draft: {quantity} receipt rolls. No order sent; stock
          unchanged.
        </p>
      )}
    </ProductCard>
  );
}
export function LiquidityDemo() {
  const t = usePresentationCopy();
  const [coverage, setCoverage] = useState(60);
  return (
    <ProductCard title={t.liquidity} state="SYNTHETIC DEMO" icon={<Droplets />}>
      <p>
        Explore a planning scenario, separate from the customer’s mock partner
        account.
      </p>
      <div className="scenario-number">
        {coverage}%<span>illustrative coverage</span>
      </div>
      <label>
        Scenario coverage
        <input
          aria-label="Scenario coverage"
          type="range"
          min="0"
          max="100"
          value={coverage}
          onChange={(e) => setCoverage(Number(e.target.value))}
        />
      </label>
      <p>
        {coverage < 40
          ? "Scenario: review replenishment needs."
          : "Scenario: compare expected demand with available resources."}{" "}
        No balance changes or credit decision.
      </p>
    </ProductCard>
  );
}
export function HardwareDemo() {
  const t = usePresentationCopy();
  const [preview, setPreview] = useState(false);
  return (
    <ProductCard title={t.hardware} state="SYNTHETIC DEMO" icon={<Printer />}>
      <p>
        Thermal-printer and tablet concepts. No Bluetooth discovery, pairing,
        camera or biometric access.
      </p>
      <button className="product-button" onClick={() => setPreview(!preview)}>
        {preview ? "Hide sample slip" : "Preview sample slip"}
      </button>
      {preview && (
        <div className="sample-slip">
          <strong>ENAWUGA · SAMPLE ONLY</strong>
          <p>Request preview · Not a payment receipt</p>
          <p>No transaction, signature, connection or printing occurred.</p>
        </div>
      )}
      <p className="caption">
        Hardware provisioning is proposed and disabled pending authorized
        implementation.
      </p>
    </ProductCard>
  );
}
export function TrainingDemo() {
  const t = usePresentationCopy();
  const [answer, setAnswer] = useState(false);
  return (
    <ProductCard
      title={t.training}
      state="SYNTHETIC DEMO"
      icon={<GraduationCap />}
    >
      <p>
        Field practice: a request reaches a supervisor. Does that establish
        settlement?
      </p>
      <button className="product-button" onClick={() => setAnswer(true)}>
        Reveal learning note
      </button>
      {answer && (
        <p role="status">
          No. Transport receipt is separate from PartnerFI authorization and
          reconciliation. This exercise does not certify or authorize an agent.
        </p>
      )}
      <Link to="/academy" className="text-link">
        Explore the training concept <ArrowRight size={16} />
      </Link>
    </ProductCard>
  );
}
const portfolio = [
  [
    "Savings groups & Equb",
    "Community saving-circle participation and transparent contribution history.",
    "Partner custody, participant rules and authorization required.",
    Users,
  ],
  [
    "Agricultural input vouchers",
    "Seed and fertilizer access with a proposed merchant redemption workflow.",
    "No voucher issuance, redemption or merchant payment.",
    Sprout,
  ],
  [
    "Climate relief & insurance",
    "Proposed climate-shock support and agricultural protection.",
    "No policy, eligibility decision, claim or payout.",
    Droplets,
  ],
  [
    "Solar & irrigation PAYG",
    "Explore access to solar equipment and irrigation services.",
    "No loan approval, IoT unlock or hardware activation.",
    Sun,
  ],
  [
    "Carbon & regenerative farming",
    "A concept for evidence-based agricultural incentive programs.",
    "No environmental verification, asset issuance or payout.",
    Sprout,
  ],
  [
    "Diaspora-matched savings",
    "A proposed channel for matched savings programs.",
    "No remittance, account opening or custodial vault.",
    Globe,
  ],
  [
    "School feeding & market access",
    "Proposed procurement, crop logistics and market-buffer coordination.",
    "No procurement order, inventory movement or payment.",
    Truck,
  ],
  [
    "Partner accounts & messaging",
    "Future licensed-partner accounts and authorized SMS/USSD interactions.",
    "No bank account creation, messaging, payment or credit entitlement.",
    ShieldCheck,
  ],
] as const;
export function ServicePortfolio() {
  const t = usePresentationCopy();
  return (
    <section>
      <div className="section-heading">
        <h2>{t.portfolio}</h2>
        <p>
          One service vision, distinct authorization requirements. Read-only
          concepts; none is a live product.
        </p>
      </div>
      <div className="product-grid">
        {portfolio.map(([title, description, boundary, Icon]) => (
          <ProductCard
            key={title}
            title={title}
            state="PROPOSED"
            icon={<Icon />}
          >
            <p>{description}</p>
            <p className="boundary-note">{boundary}</p>
            <CapabilityBadge state="DISABLED PENDING PARTNER AUTHORIZATION" />
          </ProductCard>
        ))}
      </div>
    </section>
  );
}
const steps = [
  [
    "Identity",
    "Phone alias resolves to an immutable customer ID. Real identity evidence requires an approved provider; no FIN, camera or biometric capture here.",
  ],
  [
    "Business review",
    "Partner-defined business and TIN checks are proposed. This walkthrough performs no verification and accepts no commercial data.",
  ],
  [
    "Device readiness",
    "Printer, tablet and offline-storage readiness are design concepts. No device is registered or remotely controlled.",
  ],
  [
    "Training & review",
    "Training completion is not admission. An authenticated, partner-controlled approval workflow is still required.",
  ],
];
export function OnboardingWalkthrough() {
  const t = usePresentationCopy();
  const [step, setStep] = useState(0);
  return (
    <ProductCard
      title={t.onboarding}
      state="SYNTHETIC DEMO"
      icon={<ShieldCheck />}
    >
      <div className="step-tabs" aria-label="Readiness stages">
        {steps.map(([title], i) => (
          <button
            key={title}
            aria-pressed={step === i}
            onClick={() => setStep(i)}
          >
            {i + 1}. {title}
          </button>
        ))}
      </div>
      <h3>{steps[step][0]}</h3>
      <p>{steps[step][1]}</p>
      <CapabilityBadge state="DISABLED PENDING PARTNER AUTHORIZATION" />
      <p className="caption">
        Presentation only. No application, verification or agent approval is
        submitted.
      </p>
    </ProductCard>
  );
}
export function ConflictDemo() {
  return (
    <ProductCard
      title="Conflict review concept"
      state="SYNTHETIC DEMO"
      icon={<WifiOff />}
    >
      <p>
        Two sample envelopes share a sequence but disagree on amount. Neither is
        authoritative.
      </p>
      <div className="conflict-grid">
        <div>
          <strong>Sample A</strong>
          <p>Sequence 12 · 100 ETB</p>
        </div>
        <div>
          <strong>Sample B</strong>
          <p>Sequence 12 · 120 ETB</p>
        </div>
      </div>
      <p className="boundary-note">
        RECONCILIATION REQUIRED · Preserve both for authorized review. Never
        combine amounts or infer settlement from synchronization.
      </p>
      <button className="product-button" disabled>
        Financial resolution disabled
      </button>
    </ProductCard>
  );
}
export function TransportDemo() {
  const t = usePresentationCopy();
  const [step, setStep] = useState(0);
  const stages = ["LOCAL_PENDING", "QUEUED_FOR_SYNC", "SYNCED_TO_SUPERVISOR"];
  return (
    <ProductCard title={t.transport} state="SYNTHETIC DEMO" icon={<Truck />}>
      <p>
        A local animation illustrates an offline handoff. It never reads the
        outbox, discovers devices or sends data.
      </p>
      <ol className="transport-stages">
        {stages.map((s, i) => (
          <li key={s} className={i === step ? "current" : ""}>
            {s}
          </li>
        ))}
      </ol>
      <button
        className="product-button"
        onClick={() => setStep((step + 1) % stages.length)}
      >
        Advance illustrative handoff
      </button>
      <p role="status">
        Illustration: {stages[step]}. No actual delivery or settlement.
      </p>
      <CapabilityBadge state="DISABLED PENDING PARTNER AUTHORIZATION" />
    </ProductCard>
  );
}
export function TranscriptDemo() {
  const [shown, setShown] = useState(false);
  return (
    <ProductCard
      title="Field conversation concept"
      state="SYNTHETIC DEMO"
      icon={<Mic />}
    >
      <p>
        Fixed, authored sample dialogue. No microphone, recording, transcription
        engine or external speech service.
      </p>
      <button className="product-button" onClick={() => setShown(!shown)}>
        {shown ? "Clear sample dialogue" : "Load sample dialogue"}
      </button>
      {shown && (
        <div className="sample-slip">
          <p>
            <strong>Agent:</strong> We can prepare a transaction request.
          </p>
          <p>
            <strong>Customer:</strong> Does a queued request mean payment is
            complete?
          </p>
          <p>
            <strong>Agent:</strong> No. PartnerFI authorization is a separate
            step.
          </p>
        </div>
      )}
      <CapabilityBadge state="DISABLED PENDING PARTNER AUTHORIZATION" />
      <p className="caption">
        Live transcription remains disabled pending privacy and residency
        review.
      </p>
    </ProductCard>
  );
}
