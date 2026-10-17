import { useEffect, useRef, useState } from "react";
import { useCapabilityWorkspace } from "./CapabilityWorkspaceShell";
import { CapabilityBadge } from "./ProductPresentation";
import {
  addEventToQueue,
  getPendingEvents,
  type OpaqueEnvelope,
} from "../lib/ghostsync";
import { demoApi } from "../lib/demo-api-client";

type AgentCustomerProjection = {
  projection: "AGENT_CUSTOMER";
  assignmentRef: string;
  maskedPhone?: string;
  phoneStatus: "UNVERIFIED" | "VERIFIED" | "REVERIFICATION_REQUIRED" | "BLOCKED";
  kycStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REVERIFICATION_REQUIRED" | "SUSPENDED";
  riskState: "NORMAL" | "REVIEW" | "HIGH_RISK" | "BLOCKED";
};

type AgentCustomerTarget = {
  customerRef: string;
  customer: AgentCustomerProjection;
  referenceBoundary: "SESSION_SCOPED_SYNTHETIC";
};

function transactionEligible(customer: AgentCustomerProjection) {
  return (
    customer.kycStatus === "VERIFIED" &&
    customer.riskState === "NORMAL" &&
    customer.phoneStatus !== "BLOCKED" &&
    customer.phoneStatus !== "REVERIFICATION_REQUIRED"
  );
}

export function CustomerWorkbench({ title = "Customer" }: { title?: string }) {
  const workspace = useCapabilityWorkspace();
  const offers = (direction: "CASH_IN" | "CASH_OUT") => workspace?.services.some((service) => service.serviceType === `FINANCIAL_${direction}`) === true;
  const [target, setTarget] = useState<AgentCustomerTarget | null>(null),
    [phone, setPhone] = useState("+251900000001");
  const [amount, setAmount] = useState("10"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<{ balanceMinor: number } | null>(null),
    [verificationStarted, setVerificationStarted] = useState(false);
  const [pending, setPending] = useState<OpaqueEnvelope | null>(null);
  const contextVersion = useRef(0);

  const loadCustomer = async (path: string) => {
    const version = ++contextVersion.current;
    setTarget(null);
    setAccount(null);
    setVerificationStarted(false);
    setPending(null);
    setMessage("");
    const current = (await demoApi(path)) as AgentCustomerTarget;
    if (version !== contextVersion.current) return;
    setTarget(current);
    // A later lookup or workspace unmount invalidates this response.
    void demoApi(`v2/account?customerRef=${encodeURIComponent(current.customerRef)}`)
      .then((next) => { if (version === contextVersion.current) setAccount(next); })
      .catch(() => { if (version === contextVersion.current) setAccount(null); });
  };

  useEffect(() => {
    if (workspace?.role !== "AGENT") return;
    const initial = loadCustomer("v2/customer");
    const version = contextVersion.current;
    initial.catch(() => {
      if (version === contextVersion.current) setMessage("Synthetic authenticated demo API unavailable. Existing outbox records are retained.");
    });
    return () => { contextVersion.current += 1; };
  }, []);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const queue = async (direction: "CASH_IN" | "CASH_OUT") => {
    if (!target) return;
    if (!offers(direction)) throw new Error("SERVICE_UNAVAILABLE_IN_WORKSPACE");
    if (!transactionEligible(target.customer)) throw new Error("KYC_OR_RISK_BLOCKED");
    if (!/^\d+(\.\d{1,2})?$/.test(amount))
      throw new Error("Enter an amount with at most two decimal places.");
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)
      throw new Error("Enter a positive amount with at most two decimal places.");

    const events = await getPendingEvents();
    const envelope: OpaqueEnvelope = {
      eventId: crypto.randomUUID(),
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      sequence:
        Math.max(
          0,
          ...events
            .filter(
              (event) =>
                event.payload.schemaVersion === 2 &&
                event.payload.payload.customerRef === target.customerRef,
            )
            .map((event) => event.payload.sequence),
        ) + 1,
      payload: {
        transactionId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        customerRef: target.customerRef,
        amountMinor,
        direction,
        currency: "ETB",
      },
    };
    await addEventToQueue("transaction", envelope);
    setPending(envelope);
    setMessage("Queued for sync — Pending Partner Authorization. No funds moved.");
  };

  const customer = target?.customer;

  return (
    <section className="workbench agent-workbench">
      <CapabilityBadge state="IMPLEMENTED" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p>
        Local customer and request workflow. Synthetic account data only; no
        real identity verification.
      </p>
      <p>
        Local development authentication is server-verified for this synthetic
        demo. It is not PartnerFI SSO, Fayda authentication, or production
        access control.
      </p>
      <p>
        Prototype / Synthetic Demo. Wishland supplies software; PartnerFI is the
        future regulated principal.
      </p>
      <label className="block">
        Synthetic phone alias
        <select
          aria-label="Synthetic phone alias"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="agent-field-control"
        >
          {["+251900000001", "+251900000002", "+251900000003"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <button
        disabled={busy}
        onClick={() =>
          act(async () => {
            await loadCustomer(`v2/lookup?phone=${encodeURIComponent(phone)}`);
            setMessage("Alias resolved to an authorized opaque customer reference.");
          })
        }
      >
        Look up Customer
      </button>
      <button
        className="ml-4"
        disabled={busy || !target}
        onClick={() =>
          act(async () => {
            if (!target) return;
            setTarget(
              (await demoApi("v2/phone", {
                customerRef: target.customerRef,
                phone,
              })) as AgentCustomerTarget,
            );
            setVerificationStarted(false);
            setMessage(
              "Phone changed; opaque customer reference retained. Re-verification required.",
            );
          })
        }
      >
        Change phone alias
      </button>
      {target && customer && (
        <div className="space-y-2">
          <p>
            Customer reference:{" "}
            <code data-testid="customer-id">{target.customerRef}</code>
          </p>
          <p>Mock phone-channel status: {customer.phoneStatus}</p>
          <p>
            Mock KYC status:{" "}
            <strong data-testid="kyc-status">{customer.kycStatus}</strong>
          </p>
          <p>
            Identity detail is not exposed to this Agent projection. Mock
            verification state only.
          </p>
          <button
            disabled={busy || verificationStarted}
            onClick={() =>
              act(async () => {
                setTarget(
                  (await demoApi("v2/reverify/start", {
                    customerRef: target.customerRef,
                  })) as AgentCustomerTarget,
                );
                setVerificationStarted(true);
                setMessage("Mock identity re-verification pending; no Fayda call.");
              })
            }
          >
            Start mock re-verification
          </button>
          <button
            className="ml-4"
            disabled={busy || !verificationStarted}
            onClick={() =>
              act(async () => {
                setTarget(
                  (await demoApi("v2/reverify/confirm", {
                    customerRef: target.customerRef,
                  })) as AgentCustomerTarget,
                );
                setVerificationStarted(false);
                setMessage(
                  "Mock KYC verified. No real identity verification performed.",
                );
              })
            }
          >
            Confirm mock verification
          </button>
          <p>
            Partner Account — simulated balance:{" "}
            <span data-testid="partner-balance">
              {account ? `${(account.balanceMinor / 100).toFixed(2)} ETB` : "Unavailable"}
            </span>
          </p>
          <p>
            Prototype simulation only — not a real customer liability of
            Wishland. No real cash collection, cash dispense or agent settlement is authorized.
          </p>
          <label className="block">
            Request amount (ETB)
            <input
              aria-label="Request amount (ETB)"
              className="agent-field-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <button
            disabled={busy || !offers("CASH_IN") || !transactionEligible(customer)}
            onClick={() => act(() => queue("CASH_IN"))}
          >
            Cash In — Transaction Request
          </button>
          <button
            className="ml-4"
            disabled={busy || !offers("CASH_OUT") || !transactionEligible(customer)}
            onClick={() => act(() => queue("CASH_OUT"))}
          >
            Cash Out — Transaction Request
          </button>
          <p>Request controls require a service in the active workspace. Visibility and local eligibility do not grant PartnerFI authority.</p>
          {pending && pending.payload.customerRef === target.customerRef && (
            <button
              className="block"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  const result = await demoApi("v2/transactions", pending.payload);
                  const version = contextVersion.current;
                  const nextAccount = await demoApi(`v2/account?customerRef=${encodeURIComponent(target.customerRef)}`);
                  if (version !== contextVersion.current) return;
                  setAccount(nextAccount);
                  setMessage(
                    `${result.state} (mock only). Outbox transport remains pending; no settlement asserted.`,
                  );
                })
              }
            >
              Simulate PartnerFI authorization
            </button>
          )}
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
