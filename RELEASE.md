# P0-A prototype restructuring notes

This revision supersedes the former release's unsupported deployment, bank-account provisioning and pilot-approval claims. Historical text remains in Git history.

- Wishland is a technology provider; future licensed PartnerFI is the financial principal.
- Immutable customer UUIDs, unique phone aliases, controlled KYC transitions and opaque mock identity references replace routine FIN lookup.
- Mock PartnerFI owns simulated account values; transactions check KYC and idempotency.
- GhostSync transport and financial outcomes are separate; remote upload stays disabled.
- Synthetic-only runtime/build policy rejects regulated mode. No real services, credentials or customer data are introduced.
- Unsafe legacy camera/OTP transaction and arbitrary identity-persistence demonstrations were replaced with a smaller fixture-only customer workflow. Legacy financial illustrations are not production features.

This release is not production-ready, regulatory-approved, bank-integrated, Fayda-approved or pilot-authorized. No patentability claim is made. See the P0 backlog for unresolved controls.
