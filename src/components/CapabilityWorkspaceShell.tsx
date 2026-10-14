import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
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
  {
    key: "ALPHA_AGENT_ADAMA",
    role: "AGENT",
    label: "PartnerFI Alpha · Agent",
  },
  {
    key: "BETA_AGENT_ADAMA",
    role: "AGENT",
    label: "PartnerFI Beta · Agent",
  },
  {
    key: "ALPHA_SUPERVISOR_ADAMA",
    role: "SUPERVISOR",
    label: "PartnerFI Alpha · Supervisor",
  },
  {
    key: "ALPHA_OPERATIONS_ADAMA",
    role: "OPERATIONS",
    label: "PartnerFI Alpha · Operations",
  },
  {
    key: "ALPHA_PARTNER_ADMIN_ADAMA",
    role: "PARTNER_ADMIN",
    label: "PartnerFI Alpha · Partner Admin",
  },
];

function defaultKeyFor(manifest: WorkspaceManifest | null): SyntheticWorkspaceKey {
  if (!manifest) return "ALPHA_AGENT_ADAMA";
  if (manifest.role === "AGENT" && manifest.partnerDisplayName.includes("Beta"))
    return "BETA_AGENT_ADAMA";
  if (manifest.role === "SUPERVISOR") return "ALPHA_SUPERVISOR_ADAMA";
  if (manifest.role === "OPERATIONS") return "ALPHA_OPERATIONS_ADAMA";
  if (manifest.role === "PARTNER_ADMIN") return "ALPHA_PARTNER_ADMIN_ADAMA";
  return "ALPHA_AGENT_ADAMA";
}

function WorkspaceNavigation({ manifest }: { manifest: WorkspaceManifest }) {
  return (
    <>
      <section className="workspace-context" data-testid="workspace-context">
        <div>
          <span className="workspace-context-label">Active governed workspace</span>
          <strong>{manifest.partnerDisplayName}</strong>
          <span>
            {manifest.role.replaceAll("_", " ")} ·{" "}
            {manifest.regionId.replace("region_syn_", "")}
          </span>
        </div>
        <span className="workspace-state">Implemented · Synthetic data</span>
      </section>
      <nav className="workspace-nav" aria-label="Role and partner workspace">
        {manifest.navigation.map((group) => (
          <div className="workspace-nav-group" key={group.id}>
            <span className="workspace-nav-label">{group.label}</span>
            {group.items.map((item) => (
              <Link key={item.id} to={item.path}>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

function WorkspaceServices({ manifest }: { manifest: WorkspaceManifest }) {
  if (manifest.services.length === 0) return null;
  return (
    <section className="workspace-service-strip" data-testid="workspace-services">
      <div>
        <span className="workspace-context-label">Partner-published services</span>
        <strong>Rendered from catalog + capability policy</strong>
      </div>
      <div className="workspace-service-list">
        {manifest.services.map((service) => (
          <span className="workspace-service" key={service.serviceId}>
            {service.name}
          </span>
        ))}
      </div>
    </section>
  );
}

function ProviderReadiness({ manifest }: { manifest: WorkspaceManifest }) {
  if (manifest.providerStates.length === 0) return null;
  return (
    <section
      className="workspace-provider-grid"
      data-testid="workspace-provider-readiness"
    >
      {manifest.providerStates.map((provider) => (
        <article key={provider.providerKey} className="workspace-provider-card">
          <strong>{provider.providerKey.replaceAll("_", " ")}</strong>
          <span>{provider.displayState}</span>
          <small>
            {provider.environment.toUpperCase()} ·{" "}
            {provider.runtimeMode.replaceAll("_", " ")} ·{" "}
            {provider.routeState.replaceAll("_", " ")}
          </small>
        </article>
      ))}
      <p className="workspace-provider-boundary">
        Provider readiness is not PartnerFI settlement or production authorization.
      </p>
    </section>
  );
}

export default function CapabilityWorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const [manifest, setManifest] = useState<WorkspaceManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const selectedKey = useMemo(() => defaultKeyFor(manifest), [manifest]);
  const visibleWorkspaceOptions = useMemo(
    () =>
      workspaceOptions.filter(
        (option) => option.role === (manifest?.role ?? "AGENT"),
      ),
    [manifest?.role],
  );

  useEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        const current = await loadCapabilityWorkspace();
        if (active) setManifest(current);
      } catch (cause) {
        if (
          !(cause instanceof Error) ||
          cause.message !== "WORKSPACE_SESSION_REQUIRED"
        ) {
          if (active)
            setError(
              "Workspace service unavailable; showing bounded presentation content.",
            );
          return;
        }
        try {
          const agent = await startCapabilityWorkspace({
            role: "AGENT",
            workspaceKey: "ALPHA_AGENT_ADAMA",
          });
          if (active) setManifest(agent);
        } catch {
          if (active)
            setError(
              "Workspace service unavailable; showing bounded presentation content.",
            );
        }
      }
    };
    void boot();
    return () => {
      active = false;
    };
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
      const next = await startCapabilityWorkspace({
        role: option.role,
        workspaceKey: option.key,
      });
      setManifest(next);
    } catch (cause) {
      const code =
        cause instanceof Error ? cause.message : "WORKSPACE_SESSION_UNAVAILABLE";
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
          <section
            className="workspace-switcher"
            aria-label="Synthetic partner workspace selector"
          >
            <label htmlFor="workspace-selector">
              Synthetic reference workspace
            </label>
            <select
              id="workspace-selector"
              value={selectedKey}
              disabled={switching || visibleWorkspaceOptions.length <= 1}
              onChange={(event) =>
                void switchWorkspace(event.target.value as SyntheticWorkspaceKey)
              }
            >
              {visibleWorkspaceOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <span>
              Same Enawuga UI; only workspaces valid for the authenticated role are
              offered, while partner services come from governed policy.
            </span>
          </section>
          {error && (
            <p className="workspace-error" role="status">
              {error}
            </p>
          )}
          {manifest ? (
            <>
              <WorkspaceNavigation manifest={manifest} />
              <WorkspaceServices manifest={manifest} />
              <ProviderReadiness manifest={manifest} />
            </>
          ) : (
            <nav
              className="workspace-nav workspace-nav-fallback"
              aria-label="Presentation navigation"
            >
              <div className="workspace-nav-group">
                <span className="workspace-nav-label">Bounded presentation</span>
                <Link to="/">Home</Link>
                <Link to="/kiosk">Agent Terminal</Link>
                <Link to="/onboard">Agent readiness</Link>
                <Link to="/academy">Agent learning</Link>
              </div>
            </nav>
          )}
          {children}
        </PresentationShell>
      </div>
    </CapabilityWorkspaceContext.Provider>
  );
}
