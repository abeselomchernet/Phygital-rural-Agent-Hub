# Enawuga / Phygital Rural Agent Hub operating model

This project is separate from Model 6. Wishland Networking PLC is a technology provider and software/orchestration vendor only.

| Responsibility | Wishland | Future licensed PartnerFI |
| --- | --- | --- |
| Software and request orchestration | Yes | Integration governance |
| Account/customer-funds liability | No | Authorized institution only |
| Deposits, e-money, payment instruments, lending | No | Only within its licensed scope |
| Authorization, posting and settlement | No | Authorized institution only |
| KYC decisions and recovery authority | Workflow support | Partner-controlled policy and approval |

All integrations remain mocks. No bank, Fayda, regulatory, production or pilot authorization is asserted. Synthetic demo account values are not customer liabilities of Wishland.

Customer identity is an immutable internal UUID. Phone is a changeable operational lookup alias, not identity proof. FIN/FAN may be presented only to a future approved onboarding provider; the prototype stores opaque mock references, no FIN/FAN or biometrics. Online eKYC and offline QR/FaydaEncode research require official terms and partner/regulatory approval.

GhostSync transports requests. Delivery, partner acceptance and reconciliation are distinct; none of the prototype states asserts real settlement. External development clouds are synthetic-only. Restricted financial/identity data, regulated audit logs and backups must remain Ethiopia-resident, with Ethiopia-controlled keys. These are architecture constraints, not a legal compliance certification.
