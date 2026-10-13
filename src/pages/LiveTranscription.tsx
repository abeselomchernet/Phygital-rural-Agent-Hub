import {
  CapabilityBadge,
  TranscriptDemo,
} from "../components/ProductPresentation";

export default function LiveTranscription() {
  return (
    <>
      <section className="product-card space-y-4" data-testid="conversation-boundary">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Conversation — authored field-dialogue concept</h1>
        <p>
          Fixed sample dialogue only. No microphone capture, recording,
          transcription engine, speech model, external AI service or customer data is
          used by this surface.
        </p>
        <p className="boundary-note">
          Live conversation processing remains disabled pending approved privacy,
          consent, residency, retention and access controls.
        </p>
      </section>
      <TranscriptDemo />
    </>
  );
}
