import { useEffect, useState } from "react";
import {
  getPendingEvents,
  queueSubjectLabel,
  retryEvent,
  syncEvents,
  type QueuedEvent,
} from "../lib/ghostsync";
import {
  CapabilityBadge,
  ConflictDemo,
} from "../components/ProductPresentation";
import AgentFieldStatus from "../components/AgentFieldStatus";
import "../components/agent-field.css";
export default function GhostSyncQueue() {
  const [events, setEvents] = useState<QueuedEvent[]>([]),
    [notice, setNotice] = useState("");
  const refresh = async () => setEvents(await getPendingEvents());
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      <AgentFieldStatus compact />
      <section className="product-card space-y-4">
        <CapabilityBadge state="IMPLEMENTED" />
        <h1>GhostSync — synthetic request outbox</h1>
        <p>
          Offline transport only. Delivery success is not financial settlement.
          Legacy records remain in their original database and are never
          uploaded. Browser storage is plaintext and synthetic-only. Future recovery
          requires an explicit governed migration; receiver availability is not consent.
        </p>
        <button
          className="product-button"
          onClick={async () => {
            await syncEvents();
            setNotice(
              "Remote delivery disabled. Requests retained; no funds moved.",
            );
          }}
        >
          Check sync availability
        </button>
        <p role="status">{notice}</p>
        <div className="queue-summary">
          <div>
            <strong>{events.length}</strong>Local synthetic requests
          </div>
          <div>
            <strong>0</strong>Remote deliveries enabled
          </div>
        </div>
        {events.length === 0 && (
          <p>
            No local requests yet. Queue a synthetic request from the Agent
            Terminal.
          </p>
        )}
        <div className="queue-scroll agent-queue-table">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Customer reference</th>
                <th>Transport</th>
                <th>Financial state</th>
                <th>Retry</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.row_key}>
                  <td>{e.row_key}</td>
                  <td>{queueSubjectLabel(e)}</td>
                  <td>{e.transportState}</td>
                  <td>{e.financialState}</td>
                  <td>
                    <button
                      onClick={async () => {
                        await retryEvent(e.row_key);
                        await refresh();
                      }}
                    >
                      Retry locally ({e.retry_count})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="agent-queue-cards" aria-label="Local synthetic request cards">
          {events.map((event) => (
            <article className="agent-queue-card" key={`card-${event.row_key}`} data-testid="queue-event-card">
              <strong>Local request</strong>
              <dl>
                <dt>Event</dt><dd>{event.row_key}</dd>
                <dt>Transport</dt><dd>{event.transportState}</dd>
                <dt>Financial state</dt><dd>{event.financialState}</dd>
                <dt>Retries</dt><dd>{event.retry_count}</dd>
              </dl>
              <button
                onClick={async () => {
                  await retryEvent(event.row_key);
                  await refresh();
                }}
              >
                Retry locally ({event.retry_count})
              </button>
            </article>
          ))}
        </div>
      </section>
      <ConflictDemo />
    </>
  );
}
