# Onboarding backend gate

## Current state

The Vercel deployment is a Vite single-page app. `server.ts` runs an Express mock in local development; it is not the Vercel receiver. Its agent records are held in process memory. The onboarding form uses timed local checks, and GhostSync stores complete form payloads in browser IndexedDB. Neither the local checks nor a queued record establishes identity, tax status, hardware binding, or admission to an agent network.

Remote GhostSync delivery is disabled in the frontend. Existing browser outbox records are retained. Do not turn on remote delivery by changing a frontend flag or by returning a mock `200` response.

## Receiver contract to implement before activation

1. Provide a versioned `POST /api/ghostsync` on an authenticated backend. Require a server-verified session and an authorized submitter role. Do not trust role, identity, or verification flags from a request body.
2. Accept a bounded, schema-validated event envelope: `event_id` (UUID), `event_type`, `schema_version`, `created_at`, and a type-specific payload. Reject unknown fields, unsupported event types, oversized bodies, and malformed content with explicit JSON errors. Do not log payloads or identifiers.
3. For `ONBOARD_AGENT`, write a **submission** record, not an approved agent. A separate review action may change it to approved after external checks and recorded authorization. Identity and TIN provider integrations need their own verified contracts and credentials.
4. Store `event_id` under a unique constraint and write the submission and acknowledgment in one database transaction. An identical retry returns the prior acknowledgment; a reused ID with different content is rejected. The acknowledgment must identify each accepted or rejected event, never report success for an uncommitted write.
5. Return `application/json` with a stable receipt ID, server timestamp, and per-event state (`accepted`, `rejected`, or `retryable`). The browser removes only events with a durable `accepted` acknowledgment matching its own event ID. It retains rejected and retryable events for review without an endless retry loop.
6. Protect sensitive fields in transit and at rest; restrict database access; separate preview and production storage and secrets; define retention, deletion, backup, and recovery. Mask identifiers in UI and operational logs. Apply rate limits and audit changes to submission status without recording raw personal data in audit logs.

## Rollout sequence

1. Approve the required fields, legal basis, authorized roles, retention period, hosting region, and selected identity/TIN verification providers. Do not infer verification from a format check.
2. Provision a private staging database and authentication configuration. Build the API and migrations against synthetic records only. Keep production delivery disabled.
3. Test duplicate retries, concurrent submissions, rejected payloads, unauthorized access, offline recovery, database outage, backup restore, and a deployment rollback. Verify that no real data appears in build logs, function logs, or preview deployments.
4. Have an independent reviewer approve the security and data handling evidence. Only then enable production delivery and migrate any existing local records through a deliberate, user-authorized flow. Do not automatically upload previously queued browser data.

## Definition of done

The same user-facing URL can remain. A real submission is considered received only after an authenticated API returns a database-backed receipt. It is considered onboarded only after the separately authorized verification and approval workflow records that decision.
