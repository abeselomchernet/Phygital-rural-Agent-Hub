import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { CapabilityBadge } from "../components/ProductPresentation";
import { demoApiAs, startDemoSession } from "../lib/demo-api-client";

type ReconciliationState =
  | "PAYMENT_PENDING"
  | "GATEWAY_CONFIRMED"
  | "GATEWAY_FAILED"
  | "GATEWAY_CANCELED"
  | "GATEWAY_EXPIRED"
  | "OUTCOME_UNCERTAIN";

type ReconciliationResult = {
  transactionId: string;
  customerId: string;
  state: ReconciliationState;
  code: string;
  provider: "ARIFPAY";
  environment: "sandbox";
  checkedAt: string;
};

const stateCopy: Record<
  ReconciliationState,
  { title: string; detail: string; icon: typeof CheckCircle2 }
> = {
  PAYMENT_PENDING: {
    title: "Payment pending",
    detail:
      "ArifPay still reports a pending sandbox session. Do not present this as completed or retry the payment automatically.",
    icon: Clock3,
  },
  GATEWAY_CONFIRMED: {
    title: "Gateway confirmed",
    detail:
      "ArifPay sandbox reports the payment session successful. This is payment-gateway evidence only — not PartnerFI settlement.",
    icon: CheckCircle2,
  },
  GATEWAY_FAILED: {
    title: "Gateway failed",
    detail:
      "ArifPay reports the sandbox payment failed. This does not authorize a new attempt without the normal idempotency and operator controls.",
    icon: XCircle,
  },
  GATEWAY_CANCELED: {
    title: "Gateway canceled",
    detail:
      "ArifPay reports the sandbox payment canceled. No PartnerFI settlement is inferred.",
    icon: XCircle,
  },
  GATEWAY_EXPIRED: {
    title: "Gateway expired",
    detail:
      "The provider session expired. A new request must follow the normal controlled workflow rather than replay this one.",
    icon: Clock3,
  },
  OUTCOME_UNCERTAIN: {
    title: "Outcome uncertain",
    detail:
      "Provider status could not be established safely. Do not auto-retry; investigate and reconcile again when the provider is reachable.",
    icon: AlertTriangle,
  },
};

const lifecycle = [
  ["Checkout created", "Provider session created; no settlement asserted."],
  ["Provider status", "Supervisor/admin performs a read-only session-status check."],
  ["Gateway state", "Pending, confirmed, failed, canceled, expired or uncertain."],
  ["PartnerFI authority", "Separate regulated authorization/settlement remains outside this gateway result."],
] as const;

export default function OperationsReconciliation() {
  const [authorized, setAuthorized] = useState(false),
    [customerId, setCustomerId] = useState(""),
    [transactionId, setTransactionId] = useState(""),
    [result, setResult] = useState<ReconciliationResult | null>(null),
    [message, setMessage] = useState(
      "Privileged synthetic operations access is disabled unless the server is explicitly started for it.",
    ),
    [busy, setBusy] = useState(false);

  const state = result ? stateCopy[result.state] : null;
  const StateIcon = state?.icon;
  const checkedAt = useMemo(() => {
    if (!result) return "Not checked";
    const parsed = new Date(result.checkedAt);
    return Number.isNaN(parsed.getTime()) ? "Provider check recorded" : parsed.toLocaleString();
  }, [result]);

  const beginSupervisorSession = async () => {
    setBusy(true);
    setResult(null);
    try {
      const session = await startDemoSession("SUPERVISOR");
      const customer = await demoApiAs("SUPERVISOR", "customer");
      setCustomerId(customer.customerId);
      setAuthorized(true);
      setMessage(
        `Synthetic ${session.role} session active. Enter an Enawuga transaction ID created by the guarded ArifPay checkout flow.`,
      );
    } catch (error) {
      setAuthorized(false);
      setMessage(
        (error as Error).message === "PRIVILEGED_SYNTHETIC_ROLE_DISABLED"
          ? "Privileged synthetic roles are disabled. Start the development server with ALLOW_PRIVILEGED_SYNTHETIC_ROLES=true to exercise this workspace."
          : (error as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  const reconcile = async () => {
    if (!authorized || !customerId) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transactionId)) {
      setMessage("Enter a valid Enawuga transaction UUID.");
      return;
    }
    setBusy(true);
    try {
      const next = (await demoApiAs(
        "SUPERVISOR",
        "payments/arifpay/c2b/reconcile",
        { customerId, transactionId },
      )) as ReconciliationResult;
      setResult(next);
      setMessage(
        "Provider status checked through the verified ArifPay sandbox session endpoint. Gateway confirmation is not PartnerFI settlement.",
      );
    } catch (error) {
      setResult(null);
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto space-y-6" data-testid="operations-reconciliation">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <CapabilityBadge state="IMPLEMENTED" />
          <CapabilityBadge state="SYNTHETIC DEMO" />
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-7 w-7 text-indigo-400 mt-1" />
          <div>
            <h1 className="text-2xl font-black">Operations & Reconciliation Center</h1>
            <p className="mt-2 text-slate-300">
              Read-only provider-status workspace for the bounded ArifPay sandbox C2B flow.
              Wishland software observes and reconciles gateway evidence; PartnerFI remains the
              future regulated authority for customer funds and settlement.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500 uppercase tracking-widest text-[10px]">Payment gateway</p>
            <strong>ArifPay · Sandbox</strong>
            <p className="text-slate-400 mt-1">Session-ID status read verified.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500 uppercase tracking-widest text-[10px]">Webhook authority</p>
            <strong>Disabled</strong>
            <p className="text-slate-400 mt-1">Raw notify JSON is not trusted without verified authenticity.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500 uppercase tracking-widest text-[10px]">Settlement authority</p>
            <strong>PartnerFI · Separate</strong>
            <p className="text-slate-400 mt-1">Gateway success never becomes settlement automatically.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 space-y-5">
          <div>
            <h2 className="font-black text-lg">Controlled provider check</h2>
            <p className="text-sm text-slate-400 mt-1">
              Supervisor/Partner Admin only. The browser never supplies an ArifPay session ID;
              the server resolves it from the durable checkout record.
            </p>
          </div>

          {!authorized ? (
            <button
              className="rounded-xl bg-indigo-600 px-4 py-3 font-bold disabled:opacity-50"
              onClick={beginSupervisorSession}
              disabled={busy}
            >
              Start synthetic supervisor session
            </button>
          ) : (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-3 text-sm">
              Synthetic supervisor session active · fixture customer loaded.
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-bold">Enawuga transaction ID</span>
            <input
              aria-label="Enawuga transaction ID"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm"
              placeholder="00000000-0000-4000-8000-000000000000"
              value={transactionId}
              onChange={(event) => {
                setTransactionId(event.target.value.trim());
                setResult(null);
              }}
              disabled={!authorized || busy}
            />
          </label>

          <button
            className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-950 disabled:opacity-40 flex items-center gap-2"
            onClick={reconcile}
            disabled={!authorized || busy || !transactionId}
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Check provider status
          </button>

          <p role="status" className="text-sm text-slate-300" data-testid="operations-message">
            {message}
          </p>

          {result && state && StateIcon && (
            <div
              className="rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-3"
              data-testid="gateway-reconciliation-result"
            >
              <div className="flex items-center gap-3">
                <StateIcon className="h-6 w-6 text-indigo-400" />
                <div>
                  <p className="font-black" data-testid="gateway-reconciliation-state">
                    {state.title}
                  </p>
                  <p className="text-xs text-slate-500">{result.code}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300">{state.detail}</p>
              <dl className="grid gap-2 text-xs md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Provider</dt>
                  <dd>{result.provider} · {result.environment}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Checked</dt>
                  <dd>{checkedAt}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-4">
          <h2 className="font-black text-lg">Evidence timeline</h2>
          <ol className="space-y-4">
            {lifecycle.map(([title, detail], index) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-black">
                  {index + 1}
                </span>
                <div>
                  <strong className="text-sm">{title}</strong>
                  <p className="text-xs text-slate-400 mt-1">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 text-sm text-amber-100">
            <div className="flex items-center gap-2 font-black">
              <AlertTriangle className="h-4 w-4" /> Uncertain outcome rule
            </div>
            <p className="mt-2">
              Do not automatically retry an uncertain provider outcome. Reconcile first; create a
              new payment request only through the controlled request workflow.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
