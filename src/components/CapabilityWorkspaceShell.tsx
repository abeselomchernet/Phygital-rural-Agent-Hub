import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NavLink } from "react-router-dom";
import {
  Building2,
  Layers3,
  MapPinned,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import type { WorkspaceManifest } from "../domain/workspaceManifest";
import {
  loadCapabilityWorkspace,
  startCapabilityWorkspace,
  type SyntheticWorkspaceKey,
  type SyntheticWorkspaceRole,
} from "../lib/workspace-client";
import { PresentationShell } from "./ProductPresentation";
import "./capability-workspace.css";

const CapabilityWorkspaceContext = createContext<WorkspaceManifest | null>(null);

export function useCapabilityWorkspace() {
  return useContext(CapabilityWorkspaceContext);
}

const workspaceOptions: readonly {
  key: SyntheticWorkspaceKey;
  role: SyntheticWorkspaceRole;
  label: string;
}[] = [
  { key: "ALPHA_AGENT_ADAMA", role: "AGENT", label: "PartnerFI Alpha / Agent" },
  { key: "BETA_AGENT_ADAMA", role: "AGENT", label: "PartnerFI Beta / Agent" },
  { key: "ALPHA_SUPERVISOR_ADAMA", role: "SUPERVISOR", label: "PartnerFI Alpha / Supervisor" },
  { key: "ALPHA_OPERATIONS_ADAMA", role: "OPERATIONS", label: "PartnerFI Alpha / Operations" },
  { key: "ALPHA_PARTNER_ADMIN_ADAMA", role: "PARTNER_ADMIN", label: "PartnerFI Alpha / Partner Admin" },
];

const portalMeta = {
  AGENT: {
    title: "Agent Workspace",
    description: "Field service and customer assistance",
  },
  SUPERVISOR: {
    title: "Hub Operations",
    description: "Regional planning and Hub decision support",
  },
  OPERATIONS: {
    title: "Operations & Reconciliation",
    description: "Exceptions, provider evidence and recovery",
  },
  PARTNER_ADMIN: {
    title: "Partner Administration",
    description: "Institution-scoped configuration and governance",
  },
} as const;

function defaultKeyFor(manifest: WorkspaceManifest | null): SyntheticWorkspaceKey {
  if (!manifest) return "ALPHA_AGENT_ADAMA";
  if (manifest.role === "AGENT" && manifest.partnerDisplayName.includes("Beta")) return "BETA_AGENT_ADAMA";
  if (manifest.role === "SUPERVISOR") return "ALPHA_SUPERVISOR_ADAMA";
  if (manifest.role === "OPERATIONS") return "ALPHA_OPERATIONS_ADAMA";
  if (manifest.role === "PARTNER_ADMIN") return "ALPHA_PARTNER_ADMIN_ADAMA";
  return "ALPHA_AGENT_ADAMA";
}

function displaySyntheticId(value: string, prefix: string) {
  return value
    .replace(prefix, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function WorkspacePortalHeader({ manifest }: { manifest: WorkspaceManifest }) {
  const meta = portalMeta[manifest.role];
  return (
    <section className="workspace-portal-header" data-testid="workspace-context">
      <div className="workspace-portal-title">
        <span className="wl-kicker">Role portal</span>
        <h2>{meta.title}</h2>
        <p>{meta.description}</p>
      </div>
      <div className="workspace-context-facts" aria-label="Active governed workspace">
        <span><Building2 size={15} aria-hidden="true" />{manifest.partnerDisplayName}</span>
        <span><MapPinned size={15} aria-hidden="true" />{displaySyntheticId(manifest.hubId, "hub_syn_")} Hub</span>
        <span><UserRound size={15} aria-hidden="true" />{manifest.role.replaceAll("_", " ")}</span>
        <span><Layers3 size={15} aria-hidden="true" />{displaySyntheticId(manifest.regionId, "region_syn_")}</span>
      </div>
      <div className="workspace-authority-row">
        <span className="wl-status-chip">{manifest.environment.toUpperCase()}</span>
        <span className="wl-status-chip">Synthetic data</span>
        <span className="wl-status-chip" data-tone="blocked">No production authority</span>
      </div>
    </section>
  );
}

function WorkspaceNavigation({ manifest }: { manifest: WorkspaceManifest }) {
  return (
    <nav className="workspace-nav" aria-label="Role and partner workspace">
      {manifest.navigation.map((group) => (
        <div className="workspace-nav-group" key={group.id}>
          <span className="workspace-nav-label">{group.label}</span>
          <div className="workspace-nav-items">
            {group.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => isActive ? "workspace-nav-link active" : "workspace-nav-link"}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function WorkspaceServices({ manifest }: { manifest: WorkspaceManifest }) {
  if (manifest.services.length === 0) return null;
  return (
    <section className="workspace-service-panel" data-testid="workspace-services">
      <span className="workspace-context-label">Partner-published services</span>
      <p>Catalog + capability policy</p>
      <div className="workspace-service-list">
        {manifest.services.map((service) => (
          <span className="workspace-service" key={service.serviceId}>{service.name}</span>
        ))}
      </div>
    </section>
  );
}

function ProviderReadiness({ manifest }: { manifest: WorkspaceManifest }) {
  if (manifest.providerStates.length === 0) return null;
  return (
    <section className="workspace-provider-grid" data-testid="workspace-provider-readiness">
      <span className="workspace-context-label">Provider readiness</span>
      {manifest.providerStates.map((provider) => (
        <article key={provider.providerKey} className="workspace-provider-card">
          <strong>{provider.providerKey.replaceAll("_", " ")}</strong>
          <span>{provider.displayState}</span>
          <small>{provider.environment.toUpperCase()} / {provider.runtimeMode.replaceAll("_", " ")} / {provider.routeState.replaceAll("_", " ")}</small>
        </article>
      ))}
      <p className="workspace-provider-boundary">Provider readiness is not PartnerFI settlement or production authorization.</p>
    </section>
  );
}

function WorkspaceSwitcher({
  selectedKey,
  options,
  switching,
  onSwitch,
}: {
  selectedKey: SyntheticWorkspaceKey;
  options: readonly { key: SyntheticWorkspaceKey; role: SyntheticWorkspaceRole; label: string }[];
  switching: boolean;
  onSwitch: (key: SyntheticWorkspaceKey) => void;
}) {
  return (
    <section className="workspace-switcher" aria-label="Synthetic partner workspace selector">
      <div>
        <span className="workspace-context-label">Synthetic reference workspace</span>
        <p>Only contexts valid for the current role are offered.</p>
      </div>
      <select
        id="workspace-selector"
        aria-label="Synthetic reference workspace"
        value={selectedKey}
        disabled={switching || options.length <= 1}
        onChange={(event) => onSwitch(event.target.value as SyntheticWorkspaceKey)}
      >
        {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
    </section>
  );
}

export default function CapabilityWorkspaceShell({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<WorkspaceManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const selectedKey = useMemo(() => defaultKeyFor(manifest), [manifest]);
  const visibleWorkspaceOptions = useMemo(
    () => workspaceOptions.filter((option) => option.role === (manifest?.role ?? "AGENT")),
    [manifest?.role],
  );

  useEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        const current = await loadCapabilityWorkspace();
        if (active) setManifest(current);
      } catch (cause) {
        if (!(cause instanceof Error) || cause.message !== "WORKSPACE_SESSION_REQUIRED") {
          if (active) setError("Workspace service unavailable; no operational state is inferred from the client.");
          return;
        }
        try {
          const agent = await startCapabilityWorkspace({ role: "AGENT", workspaceKey: "ALPHA_AGENT_ADAMA" });
          if (active) setManifest(agent);
        } catch {
          if (active) setError("Workspace service unavailable; no operational state is inferred from the client.");
        }
      }
    };
    void boot();
    return () => { active = false; };
  }, []);

  const switchWorkspace = async (key: SyntheticWorkspaceKey) => {
    const option = visibleWorkspaceOptions.find((entry) => entry.key === key);
    if (!option) {
      setError("Workspace switch was rejected by the client role boundary.");
      return;
    }
    setSwitching(true);
    setError(null);
    try {
      const next = await startCapabilityWorkspace({ role: option.role, workspaceKey: option.key });
      setManifest(next);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "WORKSPACE_SESSION_UNAVAILABLE";
      setError(
        code === "PRIVILEGED_SYNTHETIC_ROLE_DISABLED"
          ? "This privileged synthetic role is locked in the current runtime. Enable it only in a controlled development/test environment."
          : "Workspace switch was rejected by the server.",
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <CapabilityWorkspaceContext.Provider value={manifest}>
      <div className="capability-workspace-runtime">
        <PresentationShell>
          {manifest ? <WorkspacePortalHeader manifest={manifest} /> : (
            <section className="workspace-portal-header workspace-portal-header-fallback">
              <div><span className="wl-kicker">Bounded presentation</span><h2>Agent Workspace</h2><p>Waiting for authenticated synthetic workspace context.</p></div>
            </section>
          )}

          {error && <p className="workspace-error" role="status">{error}</p>}

          <div className="workspace-app-layout">
            <aside className="workspace-sidebar" aria-label="Workspace navigation and context">
              <WorkspaceSwitcher
                selectedKey={selectedKey}
                options={visibleWorkspaceOptions}
                switching={switching}
                onSwitch={(key) => void switchWorkspace(key)}
              />
              {manifest ? (
                <>
                  <WorkspaceNavigation manifest={manifest} />
                  <WorkspaceServices manifest={manifest} />
                  <ProviderReadiness manifest={manifest} />
                </>
              ) : (
                <div className="workspace-sidebar-boundary">
                  <ShieldCheck size={18} aria-hidden="true" />
                  Server workspace context is required before role-specific navigation is shown.
                </div>
              )}
            </aside>
            <main className="workspace-main" id="main-workspace-content">{children}</main>
          </div>
        </PresentationShell>
      </div>
    </CapabilityWorkspaceContext.Provider>
  );
}
