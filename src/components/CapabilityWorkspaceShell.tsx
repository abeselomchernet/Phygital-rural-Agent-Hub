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
import { usePresentationLocalization } from "./PresentationLocalization";
import "./capability-workspace.css";
import "./resilience-accessibility.css";

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
  const { copy: t } = usePresentationLocalization();
  const meta = {
    AGENT: { title: t.agentWorkspace, description: t.agentWorkspaceDescription },
    SUPERVISOR: { title: t.hubOperations, description: t.hubOperationsDescription },
    OPERATIONS: { title: t.operationsReconciliation, description: t.operationsReconciliationDescription },
    PARTNER_ADMIN: { title: t.partnerAdministration, description: t.partnerAdministrationDescription },
  }[manifest.role];
  return (
    <section className="workspace-portal-header" data-testid="workspace-context">
      <div className="workspace-portal-title">
        <span className="wl-kicker">{t.rolePortal}</span>
        <h2>{meta.title}</h2>
        <p>{meta.description}</p>
      </div>
      <div className="workspace-context-facts" aria-label={t.activeGovernedWorkspace}>
        <span><Building2 size={15} aria-hidden="true" />{manifest.partnerDisplayName}</span>
        <span><MapPinned size={15} aria-hidden="true" />{displaySyntheticId(manifest.hubId, "hub_syn_")} Hub</span>
        <span><UserRound size={15} aria-hidden="true" />{manifest.role.replaceAll("_", " ")}</span>
        <span><Layers3 size={15} aria-hidden="true" />{displaySyntheticId(manifest.regionId, "region_syn_")}</span>
      </div>
      <div className="workspace-authority-row">
        <span className="wl-status-chip">{manifest.environment.toUpperCase()}</span>
        <span className="wl-status-chip">{t.syntheticData}</span>
        <span className="wl-status-chip" data-tone="blocked">{t.noProductionAuthority}</span>
      </div>
    </section>
  );
}

function AgentMobileNavigation({ manifest }: { manifest: WorkspaceManifest }) {
  const { copy: t, workspaceItemLabel } = usePresentationLocalization();
  if (manifest.role !== "AGENT") return null;
  const primaryIds = new Set(["home", "agent-terminal", "farmer-360", "requests", "readiness"]);
  const items = manifest.navigation.flatMap((group) => group.items).filter((item) => primaryIds.has(item.id));
  const compactLabels: Record<string, string> = {
    "agent-terminal": t.mobileTerminal,
    "farmer-360": t.farmer360,
    requests: t.mobileQueue,
    readiness: t.mobileReadiness,
  };
  return (
    <nav className="agent-mobile-nav" aria-label={t.agentPrimaryMobileNavigation}>
      {items.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) => isActive ? "active" : undefined}
        >
          {compactLabels[item.id] ?? workspaceItemLabel(item.id, item.label)}
        </NavLink>
      ))}
    </nav>
  );
}

function WorkspaceNavigation({ manifest }: { manifest: WorkspaceManifest }) {
  const { copy: t, workspaceGroupLabel, workspaceItemLabel } = usePresentationLocalization();
  return (
    <nav className="workspace-nav" aria-label={t.roleAndPartnerWorkspace}>
      {manifest.navigation.map((group) => (
        <div className="workspace-nav-group" key={group.id}>
          <span className="workspace-nav-label">{workspaceGroupLabel(group.id, group.label)}</span>
          <div className="workspace-nav-items">
            {group.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => isActive ? "workspace-nav-link active" : "workspace-nav-link"}
              >
                {workspaceItemLabel(item.id, item.label)}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function WorkspaceServices({ manifest }: { manifest: WorkspaceManifest }) {
  const { copy: t } = usePresentationLocalization();
  if (manifest.services.length === 0) return null;
  return (
    <section className="workspace-service-panel" data-testid="workspace-services">
      <span className="workspace-context-label">{t.partnerPublishedServices}</span>
      <p>{t.catalogCapabilityPolicy}</p>
      <div className="workspace-service-list">
        {manifest.services.map((service) => (
          <span className="workspace-service" key={service.serviceId}>{service.name}</span>
        ))}
      </div>
    </section>
  );
}

function ProviderReadiness({ manifest }: { manifest: WorkspaceManifest }) {
  const { copy: t } = usePresentationLocalization();
  if (manifest.providerStates.length === 0) return null;
  return (
    <section className="workspace-provider-grid" data-testid="workspace-provider-readiness">
      <span className="workspace-context-label">{t.providerReadiness}</span>
      {manifest.providerStates.map((provider) => (
        <article key={provider.providerKey} className="workspace-provider-card">
          <strong>{provider.providerKey.replaceAll("_", " ")}</strong>
          <span>{provider.displayState}</span>
          <small>{provider.environment.toUpperCase()} / {provider.runtimeMode.replaceAll("_", " ")} / {provider.routeState.replaceAll("_", " ")}</small>
        </article>
      ))}
      <p className="workspace-provider-boundary">{t.providerBoundary}</p>
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
  const { copy: t } = usePresentationLocalization();
  return (
    <section className="workspace-switcher" aria-label={t.syntheticWorkspaceSelector}>
      <div>
        <span className="workspace-context-label">{t.syntheticReferenceWorkspace}</span>
        <p>{t.onlyRoleContexts}</p>
      </div>
      <select
        id="workspace-selector"
        aria-label={t.syntheticReferenceWorkspace}
        value={selectedKey}
        disabled={switching || options.length <= 1}
        onChange={(event) => onSwitch(event.target.value as SyntheticWorkspaceKey)}
      >
        {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
    </section>
  );
}

function CapabilityWorkspaceRuntime({ children }: { children: ReactNode }) {
  const { copy: t } = usePresentationLocalization();
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
          if (active) setError(t.workspaceServiceUnavailable);
          return;
        }
        try {
          const agent = await startCapabilityWorkspace({ role: "AGENT", workspaceKey: "ALPHA_AGENT_ADAMA" });
          if (active) setManifest(agent);
        } catch {
          if (active) setError(t.workspaceServiceUnavailable);
        }
      }
    };
    void boot();
    return () => { active = false; };
  }, []);

  const switchWorkspace = async (key: SyntheticWorkspaceKey) => {
    const option = visibleWorkspaceOptions.find((entry) => entry.key === key);
    if (!option) {
      setError(t.workspaceSwitchRejectedClient);
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
          ? t.privilegedRoleLocked
          : t.workspaceSwitchRejectedServer,
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <CapabilityWorkspaceContext.Provider value={manifest}>
      <div className="capability-workspace-runtime" data-role={manifest?.role ?? "UNRESOLVED"} aria-busy={switching || !manifest}>
          <a className="wl-skip-link" href="#main-workspace-content">{t.skipMainContent}</a>
          <p className="wl-sr-only" aria-live="polite" aria-atomic="true">{switching ? t.switchingWorkspace : manifest ? t.workspaceReady : t.loadingWorkspace}</p>
          {manifest ? <WorkspacePortalHeader manifest={manifest} /> : (
            <section className="workspace-portal-header workspace-portal-header-fallback">
              <div><span className="wl-kicker">{t.boundedPresentation}</span><h2>{t.agentWorkspace}</h2><p>{t.waitingWorkspaceContext}</p></div>
            </section>
          )}

          {error && <p className="workspace-error" role="status">{error}</p>}

          <div className="workspace-app-layout">
            <aside className="workspace-sidebar" aria-label={t.workspaceNavigationContext}>
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
                  {t.serverContextRequired}
                </div>
              )}
            </aside>
            <main className="workspace-main" id="main-workspace-content" tabIndex={-1}>{children}</main>
          </div>
          {manifest && <AgentMobileNavigation manifest={manifest} />}
      </div>
    </CapabilityWorkspaceContext.Provider>
  );
}

export default function CapabilityWorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <PresentationShell>
      <CapabilityWorkspaceRuntime>{children}</CapabilityWorkspaceRuntime>
    </PresentationShell>
  );
}
