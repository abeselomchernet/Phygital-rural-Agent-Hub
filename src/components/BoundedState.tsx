import { AlertTriangle, CircleOff, LoaderCircle, LockKeyhole, SearchX } from "lucide-react";
import type { ReactNode } from "react";

export type BoundedStateKind = "loading" | "error" | "empty" | "denied" | "unavailable";

const iconByKind = {
  loading: LoaderCircle,
  error: AlertTriangle,
  empty: SearchX,
  denied: LockKeyhole,
  unavailable: CircleOff,
} as const;

export default function BoundedState({
  kind,
  title,
  children,
  onRetry,
  retryLabel = "Try again",
}: {
  kind: BoundedStateKind;
  title: string;
  children: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const Icon = iconByKind[kind];
  return (
    <section
      className="bounded-state"
      data-kind={kind}
      role="status"
      aria-live="polite"
      aria-busy={kind === "loading" || undefined}
    >
      <Icon className={kind === "loading" ? "bounded-state-spinner" : undefined} size={21} aria-hidden="true" />
      <div className="bounded-state-copy">
        <strong>{title}</strong>
        <div>{children}</div>
        {onRetry && (
          <button type="button" className="bounded-state-retry" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
      </div>
    </section>
  );
}
