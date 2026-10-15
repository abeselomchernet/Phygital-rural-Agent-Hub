# Wishland / Enawuga Application Brand & Design System

## 1. Brand hierarchy

The product should present a clear hierarchy:

**Enawuga** — product/platform name.

**Phygital Rural Agent Hub** — descriptive product category/subtitle.

**Wishland Networking PLC** — technology/software/orchestration provider.

This frontend must not present Wishland as the regulated financial principal, issuer, settlement institution, custodian of customer funds or payment provider unless future written authority explicitly changes that model.

## 2. Current brand direction

The existing Enawuga product shell already uses a green rural-infrastructure visual language. F1 formalizes that existing application palette as reusable design tokens rather than introducing a disconnected visual identity.

The repository currently contains no governed corporate logo asset. Therefore F1 does not invent an official Wishland corporate logo. The existing sprout product mark remains a temporary Enawuga product symbol alongside explicit Wishland text attribution. A formally approved Wishland logo can replace or accompany that mark later without changing the token architecture.

## 3. Application palette

These tokens are derived from the existing Enawuga shell and become the canonical frontend application palette for this repository:

| Token | Value | Use |
| --- | --- | --- |
| `--wl-forest-900` | `#163D36` | primary text, dark controls, brand anchor |
| `--wl-forest-800` | `#173F37` | hero/sidebar/background |
| `--wl-forest-600` | `#326957` | secondary brand surface |
| `--wl-leaf-300` | `#B7EB8F` | brand accent/highlight |
| `--wl-surface-50` | `#F3F5EE` | application canvas |
| `--wl-surface-0` | `#FFFFFF` | cards/raised surfaces |
| `--wl-muted-600` | `#566B64` | secondary text |
| `--wl-border-200` | `#D7E0D1` | separators/card borders |
| `--wl-review-500` | `#CFA44B` | review/partial attention |
| `--wl-danger-600` | `#A43F3B` | denied/error/destructive state |

The green palette communicates rural infrastructure and continuity. It must not be overloaded to mean financial approval, settlement or regulatory authorization.

## 4. Semantic status system

Semantic states use text plus icon/label; color alone is insufficient.

| Semantic state | Visual intent | Examples |
| --- | --- | --- |
| Synthetic / informational | neutral green-gray | `SYNTHETIC`, `READ ONLY` |
| Evidence available | leaf/forest | `PRESENT_SYNTHETIC` |
| Collecting / partial | amber | `COLLECTING`, `PARTIAL`, `REVIEW_REQUIRED` |
| Unknown / unavailable | muted neutral | `UNKNOWN`, `UNAVAILABLE` |
| Denied / blocked | red | `NOT_AUTHORIZED`, `DENIED`, `REJECTED` |

A positive color must never transform `MEETS_TARGET_UNREVIEWED` into `APPROVED`.

## 5. Typography

Primary application typeface: **Geist**, with `system-ui, sans-serif` fallback.

Rules:

- strong hierarchy, not decorative typography;
- sentence case for navigation/actions;
- uppercase only for compact status/eyebrow labels;
- tabular numerals for operational figures;
- readable line height for field/tablet conditions.

## 6. Shape, spacing and surfaces

- card radius: 14–20px depending on hierarchy;
- control radius: 9–12px;
- pills only for compact statuses/tags;
- subtle borders preferred over heavy shadows;
- shadows remain low contrast and never imply interactivity by themselves;
- use 8px-based spacing rhythm;
- management dashboards prioritize scanability over decoration.

## 7. Brand header pattern

The global product header should show:

- Enawuga product mark/name;
- `Phygital Rural Agent Hub` subtitle;
- `Wishland Networking PLC · Technology provider` attribution;
- current environment marker such as `Stage 4 · Synthetic`.

The environment marker must remain visible in screenshots and narrow/mobile layouts.

## 8. Portal visual differentiation

All portals share the Wishland/Enawuga design system but differ by information density and workflow pattern, not by unrelated colors.

- Agent: task-first cards, large targets, low density.
- Supervisor: management summaries and Hub tabs.
- Operations: queues, exceptions, provenance, evidence timelines.
- Partner Admin: configuration/evidence tables and governance context.

Do not assign different corporate colors to roles; role differentiation comes from labels, iconography, hierarchy and page structure.

## 9. Icons and imagery

Lucide icons are the default functional icon set already used by the application. Icons describe actions/status and must not replace text for high-risk states.

Photography/illustration is optional and should not be used to imply an actual deployed Hub, partner institution, customer, device or regulated operation when the underlying state is synthetic.

## 10. Data visualization

Charts must use brand tokens and semantic states consistently. Every operational chart requires:

- visible title and unit;
- source/evidence context;
- synthetic/observed classification;
- time/evaluation context;
- accessible tabular alternative where practical.

Avoid decorative chart color palettes that conflict with semantic status colors.

## 11. Language presentation

English is the source UI language. Amharic and Afaan Oromo may be exposed only as reviewed presentation language packs. Broken or machine-corrupted strings are not acceptable production branding.

Product names, provider names, evidence IDs and canonical status codes remain unchanged across translations unless an approved localization standard says otherwise.

## 12. Brand claim control

Approved product phrasing for the current stage includes:

- `Wishland Networking PLC · Technology provider`
- `Stage 4 · Synthetic`
- `Synthetic decision support`
- `No live provider/settlement authority`

Avoid phrases such as `live network`, `real-time institutional`, `bank-grade`, `regulator approved`, `settlement complete`, `production ready`, `biometric secured` or `zero-knowledge protected` unless independently implemented and evidenced.

## 13. Governance of future brand changes

Any future formal logo, corporate palette or external brand guide should be added as a governed asset and mapped into these tokens rather than hard-coded across components. Brand changes should not weaken authority/status semantics or accessibility contrast.