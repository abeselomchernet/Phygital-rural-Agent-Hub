# 🚀 Sovereign Nexus OS

**The Phygital Last-Mile Financial Infrastructure built for the UNCDF / EDI Adama-Modjo Pilot.**

Sovereign Nexus OS is a comprehensive, end-to-end decentralized financial switch and agent management platform designed specifically for rural Ethiopia. It spans from cloud-based Tier-3 data center environments down to offline, Bluetooth-enabled Android tablets running in the field.

## 🌟 Core Pillars

1. **Sovereign Switch Backend**: A simulated ISO 20022 compliant messaging switch proxying liquidity requests securely via mTLS. Includes the **Judge Ticker** Cinematic Dashboards.
2. **GhostSync & Data Mule Protocol**: Wi-Fi Direct and BLE Mesh networking enabling rural agents to operate 100% offline and sync ledgers asynchronously via "Super Agent" trucks.
3. **Phygital Agent Kiosk (`/kiosk`)**: Fully localized (English, Amharic, Afaan Oromoo) Android tablet interface with simulated Bluetooth hardware binding for MPT-II thermal printers.
4. **Super Agent Command Hub (`/supervisor`)**: Advanced tablet interface for field supervisors to perform Wi-Fi mesh extraction, Agent SDK provisioning, and hardware pairing.
5. **Farmer 360 Wealth (`/farmer-360`)**: The ultimate last-mile dashboard. Utilizes Fayda eKYC Zero-Knowledge Proofs to pull identity, calculate AI-driven Ardi Credit Scores (40/30/30), provision Tier-1 bank accounts (Awash/Coop), and track tokenized securitized assets (SmartCycle Equb, AgriTrust Insurance, GS1 Wheat).

## 🛠 Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS (v4), TypeScript, Lucide Icons, Shadcn/UI semantics.
- **Backend**: Node.js, Express (functioning as a full-stack SPA proxy).
- **DevOps**: Docker, Docker Compose, GitHub Actions CI/CD.
- **Mock Infrastructure**: Redis (GhostSync memory buffer), PostgreSQL (Fayda ZKP DB Replica).

## 📦 Getting Started

### Local Development (Node)
\`\`\`bash
npm install
npm run dev
\`\`\`
The application will be exposed at \`http://localhost:3000\`.

### Production Deployment (Raxio Enterprise Grid)
To test the full suite of microservices in a containerized network mimicking the Raxio Tier 3 DC:
\`\`\`bash
docker-compose up --build -d
\`\`\`

## 🧪 Testing
The repository contains an automated E2E Smoke test that hooks into the core router and validates static asset compilation and backend accessibility.
\`\`\`bash
npm run test:e2e
\`\`\`

## 📖 Learn More
Check out the \`RUNBOOK.md\` for operational/DevOps procedures and the \`RELEASE_NOTES.md\` for the v1.0.0 Adama-Modjo rollout details.
