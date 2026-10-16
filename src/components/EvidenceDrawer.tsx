import { useEffect, useRef } from "react";
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
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!model) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [model, onClose]);

  if (!model) return null;
  return (
    <div className="evidence-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={drawerRef} className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-drawer-title" aria-describedby="evidence-drawer-boundary">
        <div className="evidence-drawer-header">
          <div><span className="wl-kicker">Evidence details</span><h2 id="evidence-drawer-title">{model.title}</h2></div>
          <button ref={closeRef} type="button" className="evidence-drawer-close" aria-label="Close evidence details" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </div>
        <p id="evidence-drawer-boundary" className="evidence-drawer-boundary">Evidence visibility does not grant approval, execution, settlement or production authority.</p>
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
