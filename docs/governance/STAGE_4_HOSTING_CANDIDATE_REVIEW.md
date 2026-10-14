# Stage 4 — Ethiopia Hosting Candidate Evidence Review

**Workstream:** S4-A — concrete hosting candidate evidence acquisition  
**Review date:** 2026-10-14  
**Status:** PUBLIC-EVIDENCE SHORTLIST ONLY / NO PROVIDER SELECTED / NO RESIDENCY APPROVAL  
**Scope:** governed non-production staging using synthetic data only.

## 1. Decision rule

This review does not select or approve a hosting provider. It identifies Ethiopia-hosted candidates whose public evidence is strong enough to justify a structured evidence request.

A candidate is not acceptable merely because it operates in Ethiopia, advertises local hosting, holds a certification, or can run the application. The Stage 4 topology contract still requires component-level evidence for ingress, compute, primary/replica database, backups, audit, observability, key custody, admin access, support access and controlled egress.

The existing AWS, IBM Cloud, Render/Vercel or other historical environments are not Stage 4 residency evidence. They remain useful only within their previously bounded synthetic/demo history unless separate accepted Ethiopia-residency evidence is produced.

## 2. Public-evidence shortlist

### Candidate A — Wingu Africa / Wingu Cloud Exchange, Ethiopia

Public evidence located:

- Wingu identifies an Ethiopia facility at the Ethio ICT Park, LemiKura Sub City, Addis Ababa.
- Wingu announced Tier III certification of constructed facility for its Addis Ababa ICT Park data centre in April 2024.
- Wingu launched Wingu Cloud Exchange (WCX) in Ethiopia on 31 March 2026 as a private-cloud platform and states that Ethiopian organisations can keep data within the country.
- Wingu describes the facility as carrier-neutral, with multiple network/connectivity options and local interconnection.

Public source set:

- https://www.wingu.africa/latest-news/wingu-africa-achieves-tier-iii-certification-of-constructed-facility
- https://www.wingu.africa/latest-news/wingu-africa-launches-wingu-cloud-exchange-in-ethiopia
- https://www.wingu.africa/contact
- https://www.wingu.africa/

What this supports today:

- credible Ethiopia physical-facility candidate;
- credible local cloud/colocation candidate;
- evidence that the Addis facility has a Tier III certification claim tied to the constructed facility;
- carrier-neutral connectivity may help keep network architecture independent of a single telecom provider.

What remains unknown and must be obtained contractually/technically:

- exact WCX compute facility used for Wishland's tenant;
- database primary/replica locations and whether managed database services are available;
- backup and DR-copy locations;
- audit/logging/monitoring storage locations;
- secrets/KMS/HSM/key-custody model and administrator jurisdiction;
- identity/IAM/MFA options and break-glass process;
- support-person access locations and subprocessors;
- tenant-isolation details;
- vulnerability/patching responsibilities;
- controlled egress and firewall capabilities;
- retention/deletion evidence;
- RPO/RTO and restore-test evidence for the proposed service configuration;
- commercial terms, SLA and DPA/contractual commitments for data location.

### Candidate B — Ethio telecom Telecloud

Public evidence located:

- Ethio telecom operates Telecloud and publicly offers cloud/IaaS services.
- Its 2025/26 annual report states data-centre capacity across six Tier III-certified facilities in Addis Ababa and regional locations.
- The same report describes a dual-site architecture separated by about 120 km with real-time replication and a stated 15-minute recovery time.
- Ethio telecom publicly offers cloud-server/VPS products and a separate backup service.
- Public ISO/IEC 27001:2022 and CSA STAR certificate material covers Telecloud together with data-centre and disaster-recovery scope; the displayed certificate validity extends to 25 December 2027, subject to surveillance.

Public source set:

- https://www.ethiotelecom.et/ethio-telecom-launches-its-reliable-and-secure-cloud-computing-service/
- https://www.ethiotelecom.et/2025-26-budget-year-annual-business-performance-report/4/
- https://www.ethiotelecom.et/wp-content/uploads/2024/12/Telecloud_ISO-IEC-27001-2022-Final-Certicate.pdf
- https://www.ethiotelecom.et/wp-content/uploads/2024/12/Telecloud-CSA-Final-Certificate.pdf
- https://myportal.ethiotelecom.et/cart.php?gid=1
- https://myportal.ethiotelecom.et/cart.php?gid=24

What this supports today:

- credible Ethiopia cloud/IaaS candidate with publicly visible product offerings;
- stronger public evidence than a generic region label for data-centre/cloud operations;
- public certification material relevant to Telecloud security-management scope;
- public evidence of backup and dual-site/DR capabilities at the provider level.

What remains unknown and must be obtained contractually/technically:

- which exact facility/facilities would host Wishland compute;
- exact primary/replica database sites for the selected tenant design;
- exact backup-copy and DR-copy sites for the selected service;
- whether any Telecloud control-plane, support, telemetry or subprocessor data exits Ethiopia;
- tenant-specific audit/logging destination and retention;
- key-management technology, key ownership and administrator jurisdiction;
- IAM/MFA/break-glass/access-review capabilities for Wishland administrators;
- support-person access model and support-location evidence;
- workload firewall/egress controls;
- restore-test procedure and customer-visible recovery evidence;
- DPA, SLA and contractual location commitments applicable to the selected package.

## 3. Component-by-component readiness matrix

`PUBLIC` means public information indicates the capability exists. It does not mean the Stage 4 evidence gate is accepted.

| Stage 4 topology component | Wingu Africa | Ethio telecom Telecloud | Stage 4 decision |
|---|---|---|---|
| Application ingress | PUBLIC candidate | PUBLIC candidate | Evidence request required |
| Orchestration compute | PUBLIC local-cloud candidate | PUBLIC IaaS/cloud candidate | Exact tenant/facility evidence required |
| Primary database | UNKNOWN | UNKNOWN for selected design | Must define architecture and site |
| Replica database | UNKNOWN | Provider-level dual-site evidence exists | Tenant-specific evidence required |
| Backup store | UNKNOWN | PUBLIC backup service exists | Exact copy locations + restore evidence required |
| Audit store | UNKNOWN | UNKNOWN | Must design and evidence |
| Logging / monitoring | UNKNOWN | UNKNOWN | Must map all telemetry destinations |
| Key custody | UNKNOWN | Security certification exists but tenant key model unknown | Must evidence actual key design |
| Admin access path | UNKNOWN | UNKNOWN | MFA/JML/break-glass evidence required |
| Support access path | Remote-hands/support exists publicly; jurisdiction details unknown | Support exists publicly; access/jurisdiction details unknown | Must evidence support paths |
| Controlled egress | Connectivity capabilities public | Connectivity/firewall products public | Deny-by-default design and destination inventory required |

## 4. RFI / evidence request to send to both candidates

Ask both candidates to answer the same evidence request so comparison stays objective.

### Physical/data-path evidence

1. Name the exact facility or facilities in Ethiopia that would host our compute tenant.
2. Identify where the cloud control plane for our tenant runs.
3. Identify primary and replica database locations for the proposed architecture.
4. Identify every backup and DR-copy location.
5. Identify audit, logging and monitoring storage/processing locations.
6. Identify every normal egress path and any provider-management path that can carry tenant metadata or payloads.

### Security / keys / access

7. Describe encryption at rest and in transit for the proposed service.
8. Identify key-management technology, key owner, key-storage location and who can administer keys.
9. Describe IAM, MFA, least privilege, privileged-session logging, JML and break-glass controls.
10. Identify the country/jurisdiction from which provider administrators or subcontractors may access our tenant.
11. List subprocessors relevant to compute, storage, backups, monitoring, security and support.

### Operations / resilience

12. Provide SLA/SLO, maintenance model and incident-escalation process.
13. State achievable RPO/RTO for the selected architecture.
14. Describe how a customer can run and evidence a restore test using synthetic data.
15. Describe deletion behavior across primary storage, replicas, backups and logs.
16. Provide vulnerability/patching responsibility split between provider and customer.
17. Provide customer-accessible audit evidence for privileged provider actions where available.

### Contract / residency

18. Confirm whether the proposed service can contractually commit the named data paths to Ethiopia.
19. Identify any exception in which data or support material may leave Ethiopia.
20. Provide applicable DPA, SLA, security/certification artifacts and support/escalation contacts.

## 5. Current engineering recommendation

Proceed with **parallel evidence requests to Wingu Africa and Ethio telecom Telecloud** rather than selecting a winner from marketing/public information.

The two candidates have complementary strengths in the current public evidence:

- Wingu gives unusually clear evidence of a specific carrier-neutral Tier III facility in Addis Ababa and a recently launched Ethiopia-local private cloud.
- Ethio telecom gives broader public cloud-product, certification, backup and dual-site/DR evidence.

The preferred Stage 4 candidate should be the one that can satisfy the machine-readable topology contract with the fewest unresolved components and the clearest contractual location/access commitments, not simply the lowest-cost or most familiar provider.

## 6. Gate status

Current Stage 4 result: **NO HOSTING CANDIDATE ACCEPTED**.

Public evidence is sufficient to justify due diligence, but insufficient to set any topology component to `ACCEPTED_FOR_STAGE4_REVIEW` without candidate-specific documents, service configuration and review.

Real PII, real funds, production credentials, live PartnerFI posting, direct Telebirr/M-PESA payment initiation, live cash movement and regulated mode remain locked.
