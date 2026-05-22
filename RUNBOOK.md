# 🚨 Sovereign Nexus Runbook & Operations Guide

This document outlines standard operating procedures (SOPs) for DevOps engineers and SysAdmins maintaining the Sovereign Nexus staging and production nodes. All operations must adhere to the **Zero Trust Identity Protocol**.

---

## 🏗 System Architecture Topology

* **Edge Node (Sovereign Switch):** Express v4 container proxying static Vite assets and mock API routes. Enforces `requireSpiffeIdentity` middleware.
* **Cache Node (GhostSync):** Redis 7 Alpine. Buffers offline Data Mule ledgers before upstream syncing.
* **Database Node (Fayda ZKP):** PostgreSQL 15. The replica registry for eKYC verifications.
* **Observability Stack:** OpenTelemetry Collector pipeline, aggregating spans from all microservices.
* **Security Layer:** SPIFFE/SPIRE-based SVID distribution for inter-service mTLS.

---

## 🔧 SOP 1: Grid Provisioning & Reset
*If service states are desynchronized or volumes require a hard flush:*

1.  **Drain/Clear:**
    ```bash
    docker-compose down -v
    ```
    *(Note: `-v` destroys all local ledger data and cached Redis buffers.)*

2.  **Re-deploy:**
    ```bash
    docker-compose up --build -d
    ```

3.  **Verify Identity Mesh:** Ensure the SPIFFE agent container is reachable:
    ```bash
    docker exec -it sovereign_spire_agent spire-agent status
    ```

---

## 🔧 SOP 2: Identity & SVID Debugging (Zero Trust)
*Issue: 401 ZERO_TRUST_VIOLATION.*

1.  **Check SVID Expiration:** Inspect the local SVID metadata for the failing worker:
    ```bash
    docker exec -it <container_id> /bin/spire-agent fetch x509 -socketPath /run/spire/sockets/agent.sock
    ```

2.  **Verify Identity:** If the SVID is expired, the worker node must trigger a re-attestation with the SPIRE server.

3.  **Audit Log:** Check the `AuditCompliance` logs in the dashboard to determine if the identity was explicitly revoked by the Chaos Engineering module.

---

## 🔧 SOP 3: Observability & Root Cause Analysis (OTel)
*Issue: Latency spikes or downstream failures.*

1.  **Correlation:** Locate the `Trace ID` provided by the UI error modal.

2.  **Trace Query:** Query the OTel collector for the specific `Trace ID` to identify which span failed:
    ```bash
    docker logs --since 5m <container_id> | grep "a1b2c3d4..."
    ```

3.  **Reconciliation Check:** If the trace spans reach the `ReconciliationEngine` but fail, inspect the ISO 20022 validation logs for `MISSING_IN_BANK` or `AMOUNT_MISMATCH` tags.

---

## 🔧 SOP 4: GhostSync (Data Mule) & Reconciliation
*Issue: Agent Kiosk failing to sync to backend.*

1.  **Connectivity Check:** Confirm the Agent is physically in range of the Super Agent mesh.

2.  **Buffer Status:** Check the Redis data buffer for packet bottlenecks:
    ```bash
    docker exec -it raxio_ghostync_redis redis-cli info keyspace
    ```

3.  **Force Sync:** Trigger a manual reconciliation flush if the local Ledger Statement Log differs from the bank simulated drop:
    ```bash
    curl -X POST http://localhost:3000/api/reconcile/force-flush
    ```

---

## 🔧 SOP 5: Chaos Engineering Operations
*Issue: Testing system resilience.*

1.  **Engage/Disengage:** Use the `Audit & Compliance` dashboard.

2.  **Verification:** Always verify that the "Chaos" state has been reverted:
    ```bash
    # Ensure no partition rules remain in the network proxy
    docker exec -it sovereign_node_1 iptables -L -n
    ```

3.  **Cleanup:** If the system remains in "Partitioned" state after toggling, reset network rules:
    ```bash
    docker-compose restart
    ```

---

## 🔧 SOP 6: CI/CD Pipeline Mitigation
*If `Verify-Codebase` fails in the GitHub Actions runner:*

1.  **E2E Smoke Test:** Run locally to isolate environmental variables vs. code logic:
    ```bash
    npm run test:e2e
    ```

2.  **Port Binding:** Ensure `3000` is free. If the runner is stuck due to a zombie Redis volume, perform a hard clean:
    ```bash
    docker system prune -f
    ```

---
*Authorized Personnel Only. Security Protocols: SPIFFE/SVID identity required for all shell access.*
