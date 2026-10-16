CREATE SCHEMA IF NOT EXISTS enawuga;

CREATE TABLE IF NOT EXISTS enawuga.persistence_snapshot (
  store_key text PRIMARY KEY,
  storage_class text NOT NULL CHECK (
    storage_class IN ('TRANSACTIONAL_STATE', 'CONFIGURATION')
  ),
  revision bigint NOT NULL CHECK (revision >= 1),
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  source_kind text NOT NULL CHECK (
    source_kind IN ('SYNTHETIC_FILESYSTEM', 'SYNTHETIC_POSTGRES')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enawuga.session_state (
  session_id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enawuga.hub_workflow_intent (
  scope_digest char(64) PRIMARY KEY CHECK (scope_digest ~ '^[0-9a-f]{64}$'),
  revision bigint NOT NULL CHECK (revision >= 1),
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enawuga.audit_event (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_digest char(64) NOT NULL UNIQUE CHECK (event_digest ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enawuga.evidence_record (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_digest char(64) NOT NULL UNIQUE CHECK (evidence_digest ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enawuga.external_reference (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference_digest char(64) NOT NULL UNIQUE CHECK (reference_digest ~ '^[0-9a-f]{64}$'),
  provider_key text NOT NULL,
  payload jsonb NOT NULL,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enawuga.transactional_outbox (
  outbox_id text PRIMARY KEY,
  correlation_id text NOT NULL,
  state text NOT NULL CHECK (
    state IN ('PENDING', 'SUBMITTED', 'OUTCOME_UNCERTAIN', 'RECONCILIATION_REQUIRED', 'RESOLVED')
  ),
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enawuga.dead_letter_entry (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  correlation_id text NOT NULL,
  failure_code text NOT NULL,
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  resolution_state text NOT NULL DEFAULT 'OPEN' CHECK (
    resolution_state IN ('OPEN', 'REVIEWED', 'RESOLVED')
  ),
  inserted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE OR REPLACE FUNCTION enawuga.reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS 'BEGIN RAISE EXCEPTION ''APPEND_ONLY_MUTATION_FORBIDDEN''; END;';

DROP TRIGGER IF EXISTS audit_event_append_only ON enawuga.audit_event;
CREATE TRIGGER audit_event_append_only
BEFORE UPDATE OR DELETE ON enawuga.audit_event
FOR EACH ROW EXECUTE FUNCTION enawuga.reject_append_only_mutation();

DROP TRIGGER IF EXISTS evidence_record_append_only ON enawuga.evidence_record;
CREATE TRIGGER evidence_record_append_only
BEFORE UPDATE OR DELETE ON enawuga.evidence_record
FOR EACH ROW EXECUTE FUNCTION enawuga.reject_append_only_mutation();

DROP TRIGGER IF EXISTS external_reference_append_only ON enawuga.external_reference;
CREATE TRIGGER external_reference_append_only
BEFORE UPDATE OR DELETE ON enawuga.external_reference
FOR EACH ROW EXECUTE FUNCTION enawuga.reject_append_only_mutation();

DROP TRIGGER IF EXISTS dead_letter_append_only ON enawuga.dead_letter_entry;
CREATE TRIGGER dead_letter_append_only
BEFORE DELETE ON enawuga.dead_letter_entry
FOR EACH ROW EXECUTE FUNCTION enawuga.reject_append_only_mutation();
