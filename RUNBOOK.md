# 🚨 Sovereign Nexus Runbook & Operations Guide

This runbook outlines standard operating procedures (SOPs) for DevOps engineers and SysAdmins maintaining the Sovereign Nexus staging/production nodes.

## 🏗 Architecture Topology
- **Edge Node (Sovereign Switch)**: Express v4 container proxying static Vite assets and mock API routes.
- **Cache Node (GhostSync)**: Redis 7 Alpine. Buffers offline Data Mule ledgers before upstream syncing.
- **Database Node (Fayda ZKP)**: PostgreSQL 15. The replica registry for eKYC verifications.

---

## 🔧 SOP 1: Docker Grid Provisioning & Reset
If the GhostSync memory buffer becomes corrupted or the staging environments go out of sync.

**Full Grid Restart:**
\`\`\`bash
docker-compose down -v  # Destroys volumes (Redis caches and PG databases)
docker-compose up --build -d
\`\`\`

**Checking Telemetry:**
\`\`\`bash
# View aggregated Sovereign Switch logs
docker logs -f sovereign_node_1
\`\`\`

---

## 🔧 SOP 2: Troubleshooting Agent Hardware (Kiosk)

**Issue:** Application Bluetooth Scanner stuck on "Scanning..." or Thermal Printer not firing \`RECEIPT_PRINTED\` event.
**Mitigation:** 
1. Ensure the tablet device has location services and BLE granted in the Android permissions wrapper.
2. If operating in the \`/kiosk\` web view, verify that the simulated \`btStatus\` state isn't locked by pending GhostSync events. 
3. Network connection is explicitly decoupled from this action. The printer operates in dark environments.

---

## 🔧 SOP 3: Resolving GhostSync (Data Mule) Packet Loss
**Issue:** Super Agent Hotspot activates via Dashboard, but agents fail to sync standard \`1.2MB\` payload sizes.
**Investigation:**
1. Check the Redis data buffer for packet bottlenecks:
\`\`\`bash
docker exec -it raxio_ghostync_redis redis-cli ping
\`\`\`
2. Verify that the Super Agent is physically within 15 meters of the offline nodes to sustain the Wi-Fi Direct Mesh handshake.

---

## 🔧 SOP 4: CI/CD Pipeline Mitigation
The pipeline runs `.github/workflows/ci.yml`.
If the pipeline fails on \`Verify-Codebase\`, check the \`test:e2e\` exit codes. The Express port might be colliding with GitHub Actions runners if \`3000\` is already bound.
In \`scripts/smoke-test.ts\`, we query the \`localhost:3000\` binding. 
Always run \`npm run test:e2e\` locally before merging.
