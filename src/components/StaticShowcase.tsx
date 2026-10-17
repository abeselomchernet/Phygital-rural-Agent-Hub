import {
  currentShowcaseRoles,
  showcaseCapabilityGroups,
  targetShowcaseRoles,
} from "../domain/workspaceRuntime";

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function StaticShowcase() {
  return (
    <section className="portal-page static-showcase" data-testid="static-showcase" lang="en">
      <header className="static-showcase-header">
        <span className="wl-kicker">Stage 4 · Synthetic Showcase</span>
        <h1>Enawuga — Phygital Rural Agent Hub</h1>
        <p><strong>No active server workspace</strong></p>
        <p>
          Architecture presentation only. No authenticated session, provider connection,
          PartnerFI access, posting, settlement or production authority is inferred.
        </p>
      </header>

      <section aria-labelledby="current-workspaces-heading">
        <h2 id="current-workspaces-heading">Current governed operational workspaces</h2>
        <p>These four roles are implemented in the current synthetic functional runtime. The cards below are previews only.</p>
        <div className="portal-action-grid" data-testid="current-showcase-roles">
          {currentShowcaseRoles.map((role) => (
            <article className="portal-action-card" key={role.role} data-role={role.role}>
              <span className="wl-status-chip">{statusLabel(role.status)}</span>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <p>Architectural preview only. No authenticated access.</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="target-workspaces-heading">
        <h2 id="target-workspaces-heading">Target review &amp; assurance architecture</h2>
        <p>
          Accepted Wave-D target roles. They are not active functional personas and cannot create sessions or receive data in this showcase.
        </p>
        <div className="portal-action-grid" data-testid="target-showcase-roles">
          {targetShowcaseRoles.map((role) => (
            <article className="portal-action-card static-target-card" key={role.role} data-role={role.role}>
              <span className="wl-status-chip" data-tone="blocked">TARGET · NOT ACTIVE</span>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <p>No OIDC, PartnerFI reviewer access, auditor access or pilot-review authentication is implied.</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="capability-architecture-heading">
        <h2 id="capability-architecture-heading">Capability architecture</h2>
        <p>
          Role/workspace means who is acting. Service means the service domain. Capability means what may be performed or inspected. Projection means what data a role may see. Route and adapter remain separate governed integration layers.
        </p>
        <div className="static-capability-grid" data-testid="showcase-capability-groups">
          {showcaseCapabilityGroups.map((group) => (
            <article className="static-capability-card" key={group.status} data-status={group.status}>
              <span className="wl-status-chip">{statusLabel(group.status)}</span>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="portal-boundary-banner">
        <p>
          <strong>Authority boundary:</strong> Wishland provides technology, orchestration,
          evidence infrastructure and non-binding decision support. Licensed PartnerFI retains
          regulated financial authority; insurers, suppliers/providers and competent authorities
          retain their respective external authority. eKUB evidence never feeds ARDI or PartnerFI credit decision-support.
        </p>
      </div>
    </section>
  );
}
