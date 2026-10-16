# Wave D — Final Architecture Baseline

This directory preserves the final governed Wave-D architecture baseline used for bounded Stage-4 implementation.

## Authoritative artifacts

- ENAWUGA_WAVE_D_BOUNDED_ARCHITECTURE_DECISION_PACKAGE_v1.1.1.md — SHA-256 650714e5777e8b70455ac1960e8b7d57bb825e01e1d894c71c38b2613fd11e66
- ENAWUGA_WAVE_D_AMENDMENT_LEDGER_v1.1.1.md — SHA-256 85756a01aadcb4b374ff237bc9981d97eee8bfb61b7aa3e0a53d77df303f3aa2
- ENAWUGA_WAVE_D_FINAL_CONSISTENCY_VERIFICATION.md — SHA-256 441cc69b85c52c17706c1cddc7f94f7c430625030972d275938bf25e8add9021

The earlier v1.0 and v1.1 documents remain historical artifacts outside this repository path and are not overwritten here.

## Implementation boundary

The architecture baseline authorizes bounded internal Stage-4 engineering only. It does not authorize live financial execution, real-person data use, PartnerFI posting or settlement, production provider credentials, external partner staging, controlled live pilot, or production deployment.

Phase 0 / ARCH-16 is implemented separately. Phase 1 / D1 persistence must preserve the existing synthetic-only and authority boundaries while introducing PostgreSQL behind controlled migration and rollback gates.
