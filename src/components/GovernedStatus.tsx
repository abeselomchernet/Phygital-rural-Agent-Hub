import "./governed-evidence.css";

type Tone = "info" | "review" | "blocked" | "unknown";

export function GovernedStatus({ label, tone = "info" }: { label: string; tone?: Tone }) {
  return <span className="governed-status" data-tone={tone}>{label.replaceAll("_", " ")}</span>;
}

export function toneForGovernedState(value: string): Tone {
  const state = value.toUpperCase();
  if (state.includes("DENIED") || state.includes("REJECT") || state.includes("NOT_AUTHORIZED") || state.includes("BLOCK")) return "blocked";
  if (state.includes("REVIEW") || state.includes("PARTIAL") || state.includes("COLLECT")) return "review";
  if (state.includes("UNKNOWN") || state.includes("UNAVAILABLE") || state.includes("MISSING")) return "unknown";
  return "info";
}
