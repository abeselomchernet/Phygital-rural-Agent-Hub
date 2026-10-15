# Wishland / Enawuga Application Brand & Design System

## 1. Source of truth and provenance

The governed application brand source for this repository is the public GitHub repository `abeselomchernet/wishland`, default branch `main`. The F4 branding sync was taken from Wishland tree `874754155b6ce59346ddcb23f912f1945bb9fa42` and includes the official files:

- `assets/wishland-mark.png` -> `/public/brand/wishland-mark.png`
- `assets/wishland-wordmark.png` -> `/public/brand/wishland-wordmark.png`
- palette values from Wishland `styles.css`

These repository assets supersede the earlier temporary sprout-only application branding. Do not redraw, recolor, distort or invent a replacement Wishland corporate mark without a newer governed source asset.

## 2. Brand hierarchy

The application presents a clear hierarchy:

**Wishland Networking PLC** — company / technology provider brand.

**Enawuga** — product/platform name.

**Phygital Rural Agent Hub** — descriptive product category/subtitle.

Wishland is the technology/software/orchestration provider. The UI must not present Wishland as the regulated financial principal, issuer, settlement institution, custodian of customer funds or payment provider unless future written authority explicitly changes that model.

## 3. Canonical Wishland palette

The canonical application palette is aligned to the Wishland repository:

| Token | Value | Primary use |
| --- | --- | --- |
| `--wl-navy-deep` | `#061B35` | darkest brand surface / footer / high-contrast anchor |
| `--wl-navy-900` | `#0A2A52` | primary Wishland navy / headings / navigation |
| `--wl-navy-700` | `#123D6B` | secondary navy surfaces |
| `--wl-teal-600` | `#007DBA` | product/action accent and information emphasis |
| `--wl-teal-400` | `#00A4D6` | bright focus/accent state |
| `--wl-gold-500` | `#D4AF37` | Wishland gold / controlled emphasis |
| `--wl-gold-300` | `#F6D77A` | light gold on dark surfaces |
| `--wl-ink` | `#0A2342` | body/headline ink on light surfaces |
| `--wl-surface-50` | `#F4F7FB` | application canvas |
| `--wl-soft-100` | `#EAF2F8` | subtle information/background surfaces |
| `--wl-surface-0` | `#FFFFFF` | cards / raised surfaces |
| `--wl-muted-600` | `#5D7087` | secondary text |
| `--wl-border-200` | `#D8E2EC` | separators/card borders |

Older `--wl-forest-*` and `--wl-leaf-*` tokens remain only as compatibility aliases so existing components can migrate incrementally without visual drift. New code should prefer the navy/teal/gold token names.

## 4. Logo and wordmark use

The global application header uses the official Wishland wordmark asset. The standalone mark may be used only when space is constrained and the product/company relationship is still clear in adjacent accessible text.

Rules:

- preserve aspect ratio and internal whitespace;
- do not crop or place the mark inside an unrelated colored badge;
- do not substitute the former sprout icon for the Wishland corporate mark;
- retain accessible `alt` text for the corporate wordmark;
- use sufficient contrast and clear space;
- Enawuga remains visible as the product identity next to, not inside, the Wishland asset.

## 5. Brand header pattern

The application header should show:

- official Wishland wordmark;
- Enawuga product name;
- `Phygital Rural Agent Hub` subtitle;
- Wishland technology-provider relationship;
- current environment marker such as `Stage 4 · Synthetic`.

The environment marker and authority boundary must remain visible in screenshots and narrow/mobile layouts.

## 6. Visual language

Wishland visual language uses navy as the trust/structure anchor, teal for connective/digital emphasis, and gold for controlled premium emphasis. The palette supports the company themes visible in the source material: grounded digital infrastructure, trust, transparency, resilience, inclusion and practical institutional utility.

Gold is a brand accent, not a generic PASS/approval color. Teal is an information/action accent, not proof of provider connectivity. Navy is brand structure, not evidence of regulated authority.

## 7. Semantic status system

Semantic states always use text plus icon/label; color alone is insufficient.

| Semantic state | Visual intent | Examples |
| --- | --- | --- |
| Synthetic / informational | soft blue / navy | `SYNTHETIC`, `READ ONLY` |
| Evidence available | teal/navy | `PRESENT_SYNTHETIC` |
| Collecting / partial / review | gold/amber | `COLLECTING`, `PARTIAL`, `REVIEW_REQUIRED` |
| Unknown / unavailable | muted neutral | `UNKNOWN`, `UNAVAILABLE` |
| Denied / blocked | red | `NOT_AUTHORIZED`, `DENIED`, `REJECTED` |

A positive brand color must never transform `MEETS_TARGET_UNREVIEWED` into `APPROVED`.

## 8. Typography

Primary application typeface: **Geist**, with `system-ui, sans-serif` fallback. The Wishland public source currently uses Inter/system UI on the website; the application keeps Geist as its product UI typeface to preserve implemented information density and readability.

Rules:

- strong hierarchy, not decorative typography;
- sentence case for navigation/actions;
- uppercase only for compact status/eyebrow labels;
- tabular numerals for operational figures;
- readable line height for field/tablet conditions.

## 9. Shape, spacing and surfaces

- card radius: 14–20px depending on hierarchy;
- control radius: 9–12px;
- pills only for compact statuses/tags;
- subtle borders preferred over heavy shadows;
- shadows remain navy-tinted and low contrast;
- use an 8px-based spacing rhythm;
- management dashboards prioritize scanability over decoration.

## 10. Portal visual differentiation

All portals share the Wishland/Enawuga design system but differ by information density and workflow pattern, not by unrelated colors.

- Agent: task-first cards, large targets, low density.
- Supervisor: management summaries and Hub tabs.
- Operations: queues, exceptions, provenance and evidence timelines.
- Partner Admin: configuration/evidence tables and governance context.

Do not assign different corporate colors to roles; role differentiation comes from labels, iconography, hierarchy and page structure.

## 11. Icons and imagery

Lucide icons remain the default functional icon set. Icons describe actions/status and must not replace text for high-risk states.

Photography or illustration must not imply an actual deployed Hub, partner institution, customer, device or regulated operation when the underlying state is synthetic. The Wishland repository's public imagery may be reused only when its context is compatible with the application's evidence boundaries.

## 12. Data visualization

Charts must use brand tokens and semantic states consistently. Every operational chart requires:

- visible title and unit;
- source/evidence context;
- synthetic/observed classification;
- time/evaluation context;
- accessible tabular alternative where practical.

Avoid decorative chart palettes that conflict with semantic status colors.

## 13. Language presentation

English is the source UI language. Amharic and Afaan Oromo may be exposed only as reviewed presentation language packs. Product names, provider names, evidence IDs and canonical status codes remain unchanged across translations unless an approved localization standard says otherwise.

## 14. Brand claim control

Approved current-stage phrasing includes:

- `Wishland Networking PLC · Technology provider`
- `Stage 4 · Synthetic`
- `Synthetic decision support`
- `No live provider/settlement authority`

Avoid phrases such as `live network`, `real-time institutional`, `bank-grade`, `regulator approved`, `settlement complete`, `production ready`, `biometric secured` or `zero-knowledge protected` unless independently implemented and evidenced.

## 15. Governance of future brand changes

Newer official Wishland assets or corporate brand guidance should replace this source only through a reviewed repository change with provenance recorded. Brand changes must not weaken authority/status semantics, accessibility contrast or evidence classification.

## 16. Agent field/mobile application of the brand

The F6 Agent experience applies the corporate system to field interaction rather than introducing a separate Agent color theme.

- primary task/action controls use Wishland navy `#0A2A52`;
- active/information emphasis uses Wishland teal `#007DBA`;
- focus and controlled attention states use the governed teal/gold tokens;
- the official Wishland wordmark remains the corporate mark in the shared header;
- Enawuga remains the product identity;
- semantic danger/review states remain independent from brand color.

Agent surfaces prioritize large touch targets, strong contrast, low information density and visible offline context. A blue/teal `Online signal` is never evidence that a provider, PartnerFI or payment rail is online. Gold is never used to mean approved. No mobile layout may hide the `Stage 4 · Synthetic` or no-production-authority context merely to save space.

New Agent controls should use the canonical `--wl-navy-*`, `--wl-teal-*`, `--wl-gold-*`, surface and semantic tokens rather than legacy hard-coded forest/leaf colors. Existing compatibility aliases may remain until safely migrated.
