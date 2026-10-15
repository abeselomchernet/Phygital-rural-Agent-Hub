import { useEffect } from "react";
import { X } from "lucide-react";
import "./governed-evidence.css";

export type EvidenceDrawerModel = {
  title: string;
  classification: "SYNTHETIC" | "OBSERVED" | "EXTERNAL" | "UNKNOWN";
  evidenceRefs: readonly string[];
  schemaVersion?: string | number;
  evaluatedAt?: string;
  integrityRef?: string;
  limitation: string;
  authorityImplication: string;
};

export default function EvidenceDrawer({ model, onClose }: { model: EvidenceDrawerModel | null; onClose: () => void }) {
  useEffect(() => {
    if (!model) return;
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [model, onClose]);
  if (!model) return null;
  return (
    <div className="evidence-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-drawer-title">
        <div className="evidence-drawer-header">
          <div><span className="wl-kicker">Evidence details</span><h2 id="evidence-drawer-title">{model.title}</h2></div>
          <button type="button" className="evidence-drawer-close" aria-label="Close evidence details" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="evidence-detail-list">
          <div className="evidence-detail"><span>Classification</span><strong>{model.classification}</strong></div>
          {model.schemaVersion !== undefined && <div className="evidence-detail"><span>Schema version</span><strong>{model.schemaVersion}</strong></div>}
          {model.evaluatedAt && <div className="evidence-detail"><span>Evaluated / recorded</span><strong>{model.evaluatedAt}</strong></div>}
          {model.integrityRef && <div className="evidence-detail"><span>Integrity reference</span><code>{model.integrityRef}</code></div>}
          <div className="evidence-detail"><span>Evidence references</span>{model.evidenceRefs.length ? <ul className="evidence-ref-list">{model.evidenceRefs.map((ref) => <li key={ref}><code>{ref}</code></li>)}</ul> : <strong>UNAVAILABLE</strong>}</div>
          <div className="evidence-detail"><span>Limitation</span><strong>{model.limitation}</strong></div>
          <div className="evidence-detail"><span>Authority implication</span><strong>{model.authorityImplication}</strong></div>
        </div>
      </aside>
    </div>
  );
}
