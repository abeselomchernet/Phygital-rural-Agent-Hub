import { useEffect, useState } from "react";
import { CloudOff, Cloudy, Inbox, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { getPendingEvents, remoteSyncEnabled } from "../lib/ghostsync";
import "./agent-field.css";

function initialBrowserOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export default function AgentFieldStatus({ compact = false }: { compact?: boolean }) {
  const [browserOnline, setBrowserOnline] = useState(initialBrowserOnline);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const events = await getPendingEvents();
        if (active) setPendingCount(events.length);
      } catch {
        if (active) setPendingCount(null);
      }
    };
    const markOnline = () => setBrowserOnline(true);
    const markOffline = () => setBrowserOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  return (
    <section
      className={`agent-field-status${compact ? " compact" : ""}`}
      data-testid="agent-field-status"
      aria-label="Agent field and offline status"
    >
      <div className="agent-field-status-item">
        <span className="agent-field-status-icon" data-tone={browserOnline ? "info" : "review"}>
          {browserOnline ? <Cloudy size={18} aria-hidden="true" /> : <CloudOff size={18} aria-hidden="true" />}
        </span>
        <div>
          <span>Browser connectivity signal</span>
          <strong>{browserOnline ? "Online signal" : "Offline signal"}</strong>
        </div>
      </div>
      <div className="agent-field-status-item">
        <span className="agent-field-status-icon"><Inbox size={18} aria-hidden="true" /></span>
        <div>
          <span>Local synthetic outbox</span>
          <strong>{pendingCount === null ? "Unavailable" : `${pendingCount} pending`}</strong>
        </div>
      </div>
      <div className="agent-field-status-item">
        <span className="agent-field-status-icon" data-tone="blocked"><ShieldCheck size={18} aria-hidden="true" /></span>
        <div>
          <span>Remote provider delivery</span>
          <strong>{remoteSyncEnabled ? "Configured" : "Disabled in Stage 4"}</strong>
        </div>
      </div>
      {!compact && (
        <div className="agent-field-status-note">
          <span>Connectivity is a browser/device signal only. It does not prove provider reachability, authorization, posting or settlement.</span>
          <Link to="/queue">Review local requests</Link>
        </div>
      )}
    </section>
  );
}
