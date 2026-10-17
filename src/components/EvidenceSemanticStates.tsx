import {
  describeEvidenceUxStates,
  type EvidenceUxState,
} from "../domain/evidenceUxSemantics";
import "./governed-evidence.css";

export default function EvidenceSemanticStates({
  states,
}: {
  states: readonly EvidenceUxState[];
}) {
  const descriptors = describeEvidenceUxStates(states);
  if (!descriptors.length) return null;

  return (
    <div
      className="evidence-semantic-states"
      aria-label="Evidence semantic states"
    >
      {descriptors.map((descriptor) => (
        <span
          className="evidence-semantic-state"
          data-state={descriptor.state}
          data-tone={descriptor.tone}
          key={descriptor.state}
          title={descriptor.tooltip}
        >
          {descriptor.label}
        </span>
      ))}
    </div>
  );
}
