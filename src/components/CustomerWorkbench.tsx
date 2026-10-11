import { useEffect, useState } from "react";
import { CapabilityBadge } from "./ProductPresentation";
import type { Customer } from "../domain/customer";
import { assertTransactionEligible } from "../domain/customer";
import { addEventToQueue, getPendingEvents } from "../lib/ghostsync";
import { demoApi } from "../lib/demo-api-client";
import type { Envelope } from "../domain/transport";

export function CustomerWorkbench({ title = "Customer" }: { title?: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null),
    [phone, setPhone] = useState("+251900000001");
  const [amount, setAmount] = useState("10"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<{ balanceMinor: number } | null>(null),
    [verificationStarted, setVerificationStarted] = useState(false);
  const [pending, setPending] = useState<Envelope | null>(null);
  const refresh = async () => {
    setCustomer(await demoApi("customer"));
    setAccount(await demoApi("account"));
  };
  useEffect(() => {
    refresh().catch(() =>
      setMessage(
        "Synthetic authenticated demo API unavailable. Existing outbox records are retained.",
      ),
    );
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
    if (!customer) return;
    assertTransactionEligible(customer);
    if (!/^\d+(\.\d{1,2})?$/.test(amount))
      throw new Error("Enter an amount with at most two decimal places.");
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)
      throw new Error(
        "Enter a positive amount with at most two decimal places.",
      );
    const events = await getPendingEvents();
    const envelope: Envelope = {
      eventId: crypto.randomUUID(),
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      sequence:
        Math.max(
          0,
          ...events
            .filter((e) => e.payload.payload.customerId === customer.customerId)
            .map((e) => e.payload.sequence),
        ) + 1,
      payload: {
        transactionId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        customerId: customer.customerId,
        amountMinor,
        direction,
        currency: "ETB",
      },
    };
    await addEventToQueue("transaction", envelope);
    setPending(envelope);
    setMessage(
      "Queued for sync — Pending Partner Authorization. No funds moved.",
    );
  };
  return (
    <section className="workbench p-6 space-y-4 max-w-3xl mx-auto text-slate-100 bg-slate-900 rounded-xl">
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
          className="block bg-slate-800 p-2"
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
            setCustomer(
              await demoApi(`lookup?phone=${encodeURIComponent(phone)}`),
            );
            setMessage("Alias resolved to existing customer ID.");
          })
        }
      >
        Look up Customer
      </button>
      <button
        className="ml-4"
        disabled={busy}
        onClick={() =>
          act(async () => {
            setCustomer(await demoApi("phone", { phone }));
            setVerificationStarted(false);
            setMessage(
              "Phone changed; customer ID retained. Re-verification required.",
            );
          })
        }
      >
        Change phone alias
      </button>
      {customer && (
        <div className="space-y-2">
          <p>
            Customer ID:{" "}
            <code data-testid="customer-id">{customer.customerId}</code>
          </p>
          <p>Phone status: {customer.phoneStatus}</p>
          <p>
            KYC status:{" "}
            <strong data-testid="kyc-status">{customer.kycStatus}</strong>
          </p>
          <p>
            Identity reference:{" "}
            {customer.identityReference
              ? "mock-identity:••••" + customer.identityReference.slice(-4)
              : "Not verified"}{" "}
            (simulation)
          </p>
          <button
            disabled={busy || verificationStarted}
            onClick={() =>
              act(async () => {
                setCustomer(await demoApi("reverify/start", {}));
                setVerificationStarted(true);
                setMessage(
                  "Mock identity re-verification pending; no Fayda call.",
                );
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
                setCustomer(await demoApi("reverify/confirm", {}));
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
              {((account?.balanceMinor ?? 0) / 100).toFixed(2)} ETB
            </span>
          </p>
          <p>
            Prototype simulation only — not a real customer liability of
            Wishland.
          </p>
          <label className="block">
            Request amount (ETB)
            <input
              aria-label="Request amount (ETB)"
              className="block bg-slate-800 p-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <button
            disabled={busy || customer.kycStatus !== "VERIFIED"}
            onClick={() => act(() => queue("CASH_IN"))}
          >
            Cash In — Transaction Request
          </button>
          <button
            className="ml-4"
            disabled={busy || customer.kycStatus !== "VERIFIED"}
            onClick={() => act(() => queue("CASH_OUT"))}
          >
            Cash Out — Transaction Request
          </button>
          {pending && (
            <button
              className="block"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  const result = await demoApi("transactions", pending.payload);
                  await refresh();
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
