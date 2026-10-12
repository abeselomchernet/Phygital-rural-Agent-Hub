# Partner Ecosystem Model

## 1. Purpose

Enawuga is multi-partner by design. Financial institutions are one partner class among several. This document defines partner types, boundaries, route provenance and minimum access principles.

## 2. Partner classes

### 2.1 Financial Institution

Examples: licensed bank, MFI or other entity legally authorized for the relevant financial activity.

Possible responsibilities:

- customer account/liability;
- account lookup;
- transaction authorization/posting;
- agent limits;
- KYC policy/recovery authority;
- settlement and reconciliation authority within contract.

### 2.2 Payment Gateway / System Operator

Example target: ArifPay through approved environment.

Possible capabilities:

- payment session/direct payment;
- C2B collection;
- B2C payout/disbursement;
- W2B or other permitted rails;
- transaction verification;
- callbacks/webhooks.

A gateway does not automatically become the PartnerFI.

### 2.3 Mobile Money / Payment Instrument Issuer

Examples may include mobile-money or wallet providers reached directly or through a gateway.

The system MUST preserve route provenance:

`service provider -> integration route -> gateway/operator -> Enawuga transaction`

If a rail is accessed through ArifPay, the UI/data MUST NOT falsely imply a direct Enawuga-to-provider contract.

### 2.4 Telco / Communications

Possible capabilities:

- approved SMS/USSD channels;
- notifications;
- connectivity/network services;
- SIM/phone-channel evidence only where formally supported.

Phone-channel evidence is not identity proof.

### 2.5 Identity Provider

Possible capabilities:

- onboarding verification;
- re-verification;
- status/attestation according to official contract.

Raw identity artifacts and fields MUST be minimized; transaction flows SHOULD use stored authorized references rather than re-running identity verification unnecessarily unless policy requires it.

### 2.6 FMCG / Distributor / Merchant

Possible capabilities:

- stock catalog;
- rural hub inventory;
- orders/restock;
- dispatch/logistics;
- commercial settlement status;
- demand forecasts;
- eligible liquidity-match proposals.

FMCG partners MUST NOT receive unrelated financial/customer identity data.

### 2.7 Cash Logistics / Fleet

Possible capabilities:

- fleet/device identity;
- route planning;
- cash-position reporting where authorized;
- dispatch;
- custody handover workflow;
- incident/reconciliation evidence.

A fleet operator does not gain the right to create financial postings merely by carrying cash.

## 3. Partner organization model

Minimum fields:

- `partnerOrgId`
- partner type
- legal/display name
- environment
- contract/evidence references
- permitted capabilities
- permitted data classes
- permitted routes/regions
- authorized roles
- credential owner
- operational contacts
- incident contacts
- approval effective/expiry dates
- capability-switch state

## 4. Institution-scoped access

All partner users MUST be organization-scoped. Object authorization MUST prevent cross-partner access even where user roles have the same name.

## 5. Capability switch model

Every partner capability must be independently switchable, e.g.:

- `ARIFPAY_C2B`
- `ARIFPAY_B2C`
- `ARIFPAY_W2B`
- `PARTNERFI_ACCOUNT_LOOKUP`
- `PARTNERFI_CASH_IN_AUTH`
- `PARTNERFI_CASH_OUT_AUTH`
- `IDENTITY_ONBOARDING`
- `SMS_NOTIFICATION`
- `FMCG_ORDERING`
- `FLEET_DISPATCH`
- `FLEET_CASH_HANDOVER`

The presence of code does not enable a switch. Activation requires evidence recorded in the capability registry and appropriate environment.
