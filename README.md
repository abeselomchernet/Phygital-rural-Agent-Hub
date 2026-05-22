# Sovereign Nexus OS | Last-Mile Financial Infrastructure

![Status: Production-Hardened](https://img.shields.io/badge/Status-Operational-green)
![Compliance: ISO 20022](https://img.shields.io/badge/Compliance-ISO_20022-blue)
![Security: Zero Trust](https://img.shields.io/badge/Security-mTLS%2FSPIFFE-red)

## Overview
**Sovereign Nexus OS** is the resilient, offline-first fintech infrastructure developed for the **UNCDF / EDI Adama-Modjo Pilot**. This system bridges the gap between centralized banking liquidity and rural last-mile agent operations, ensuring financial inclusion through cryptographically verified transactions, even in low-connectivity environments.

## The Resilience Architecture
Unlike standard fintech platforms, Sovereign Nexus OS is built on a "Secure Enclave" model:



* **Zero Trust (mTLS/SPIFFE):** Service-to-service communication is cryptographically bound, eliminating internal network trust.
* **ISO 20022 Compliance:** Strict schema validation (`pacs.008`) ensures interoperability with global financial gateways.
* **Observability:** Full distributed tracing via **OpenTelemetry** across the async worker boundary.
* **Offline Availability:** The `GhostSync` engine manages an IndexedDB outbox queue, guaranteeing ACID transaction integrity without real-time WAN connectivity.

## Core Pillars
* **Sovereign Switch Backend:** Middleware for secure liquidity proxying.
* **GhostSync & Data Mule:** Asynchronous ledger synchronization via mesh protocols.
* **Phygital Agent Kiosk:** Localized Android tablet interface for rural financial services.
* **Farmer 360:** Identity-verified credit scoring using Fayda ZKP and multi-factor agri-stability metrics.

## Tech Stack
* **Infrastructure:** Docker, Docker Compose, OTel Observability Suite.
* **Backend:** Node.js, Express, Redis (Async Queueing).
* **Frontend:** React 18, Vite, TailwindCSS (v4), TypeScript.
* **Security:** HMAC transaction signing, SPIFFE/SVID token propagation.

## Getting Started

### Local Development
```bash
npm install
npm run dev
