import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, Presentation, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import "../components/guided-demo.css";

type DemoScene = {
  title: string;
  kicker: string;
  summary: string;
  points: readonly string[];
  boundary: string;
  path?: string;
  pathLabel?: string;
};

const scenes: readonly DemoScene[] = [
  {
    kicker: "Scene 1 · Context",
    title: "One governed Hub, explicit responsibility",
    summary: "Start with the active synthetic PartnerFI, role and Hub context before discussing any service surface.",
    points: [
      "Wishland is presented as the technology/software/orchestration provider.",
      "PartnerFI responsibility remains separate from the software presentation.",
      "Visible modules do not create server-side capability or production authority.",
    ],
    boundary: "Presentation context only. No live partner connection or regulated deployment is implied.",
    path: "/hub",
    pathLabel: "Open Hub Overview",
  },
  {
    kicker: "Scene 2 · Service composition",
    title: "Different partners, one governed workspace model",
    summary: "Partner-published service catalogs and capability policy shape what each synthetic workspace can display.",
    points: [
      "Alpha and Beta can expose materially different service sets without UI forks.",
      "Unavailable services remain explicit rather than being fabricated as successful or zero-valued.",
      "Provider registration, route readiness and service visibility remain separate concepts.",
    ],
    boundary: "Catalog visibility is not provider activation, posting permission or settlement authority.",
    path: "/partners",
    pathLabel: "Open Partner Status",
  },
  {
    kicker: "Scene 3 · Offline resilience",
    title: "Local queue evidence without settlement claims",
    summary: "Offline and transport concepts demonstrate bounded request persistence and reconciliation evidence.",
    points: [
      "A queued request remains local/pending until governed downstream evidence exists.",
      "Transport acknowledgement is not financial finality.",
      "Synthetic restart and replay behavior can be tested without moving funds.",
    ],
    boundary: "No live funds move in this presentation and no transport state is treated as settlement.",
    path: "/operations/evidence",
    pathLabel: "Open Operations Evidence",
  },
  {
    kicker: "Scene 4 · Decision support",
    title: "Evidence can inform a review without becoming approval",
    summary: "Economics, pilot evidence, corridor planning, readiness and neutrality remain explicitly bounded decision-support surfaces.",
    points: [
      "Model assumptions remain separate from observed evidence.",
      "A recommendation remains separate from geographic, provider or financial authorization.",
      "Evidence integrity references do not become external verification or regulatory approval.",
    ],
    boundary: "No Stage-4 dashboard can self-authorize a pilot, production route, device action or financial decision.",
    path: "/hub/pilot-evidence",
    pathLabel: "Open Pilot Evidence",
  },
  {
    kicker: "Scene 5 · Close",
    title: "A demonstrable product boundary, not a production claim",
    summary: "The demo closes by restating what the current environment proves and what remains outside its authority.",
    points: [
      "The product demonstrates governed synthetic workflows, evidence semantics and role isolation.",
      "It does not demonstrate live funds, settlement, production provider authority or regulated deployment.",
      "Future staging and pilot gates require separate infrastructure, partner, security and regulatory evidence.",
    ],
    boundary: "Stage 4 remains synthetic. Presentation polish does not change system authority.",
  },
];

function humanize(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return value
    .replace(/^hub_syn_|^region_syn_/, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function GuidedDemo() {
  const workspace = useCapabilityWorkspace();
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = scenes[sceneIndex];
  const progress = useMemo(() => Math.round(((sceneIndex + 1) / scenes.length) * 100), [sceneIndex]);

  return (
    <section className="guided-demo" data-testid="guided-demo-page">
      <header className="guided-demo-hero">
        <div>
          <span className="wl-kicker">Guided presentation · read-only</span>
          <h1>Enawuga Stage-4 guided demo</h1>
          <p>
            A presenter-friendly walkthrough of the governed synthetic product. It explains current capability and boundaries without auto-running transactions, provider calls, device commands or voice narration.
          </p>
        </div>
        <Presentation size={34} aria-hidden="true" />
      </header>

      <div className="guided-demo-context" aria-label="Current synthetic presentation context">
        <span><strong>Partner</strong>{workspace?.partnerDisplayName ?? "Loading synthetic context"}</span>
        <span><strong>Role</strong>{workspace?.role?.replaceAll("_", " ") ?? "Loading"}</span>
        <span><strong>Hub</strong>{humanize(workspace?.hubId, "Loading")}</span>
        <span><strong>Environment</strong>Stage 4 · Synthetic</span>
      </div>

      <div className="guided-demo-progress" aria-label={`Scene ${sceneIndex + 1} of ${scenes.length}`}>
        <div className="guided-demo-progress-copy">
          <span>Scene {sceneIndex + 1} of {scenes.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="guided-demo-progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="guided-demo-scene" aria-live="polite">
        <span className="wl-kicker">{scene.kicker}</span>
        <h2>{scene.title}</h2>
        <p className="guided-demo-summary">{scene.summary}</p>
        <ul>
          {scene.points.map((point) => (
            <li key={point}><CircleCheck size={18} aria-hidden="true" /><span>{point}</span></li>
          ))}
        </ul>
        <div className="guided-demo-boundary">
          <ShieldCheck size={20} aria-hidden="true" />
          <p><strong>Boundary:</strong> {scene.boundary}</p>
        </div>
        {scene.path && (
          <Link className="guided-demo-deep-link" to={scene.path}>{scene.pathLabel}</Link>
        )}
      </article>

      <nav className="guided-demo-controls" aria-label="Guided demo scenes">
        <button
          type="button"
          onClick={() => setSceneIndex((current) => Math.max(0, current - 1))}
          disabled={sceneIndex === 0}
        >
          <ArrowLeft size={18} aria-hidden="true" /> Previous scene
        </button>
        <button
          type="button"
          onClick={() => setSceneIndex((current) => Math.min(scenes.length - 1, current + 1))}
          disabled={sceneIndex === scenes.length - 1}
        >
          Next scene <ArrowRight size={18} aria-hidden="true" />
        </button>
      </nav>

      <p className="guided-demo-footer">
        Guided Demo is a presentation surface only. It creates no provider activation, posting, settlement, pilot approval, production credential, device-control or geographic authority.
      </p>
    </section>
  );
}
