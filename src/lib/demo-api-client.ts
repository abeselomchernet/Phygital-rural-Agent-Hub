type SyntheticRole =
  | "AGENT"
  | "SUPERVISOR"
  | "OPERATIONS"
  | "PARTNER_ADMIN";

type SessionView = {
  csrfToken: string;
  role: SyntheticRole;
  allowedCustomerIds: readonly string[];
  localDevelopmentAuth: true;
};

let csrfToken: string | null = null;
let cachedRole: SyntheticRole | null = null;

async function parseJson(response: Response) {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("DEMO_API_UNAVAILABLE");
  return response.json();
}

function remember(session: SessionView) {
  csrfToken = session.csrfToken;
  cachedRole = session.role;
  return session;
}

async function currentSession() {
  const response = await fetch("/api/demo/session", {
    credentials: "same-origin",
  });
  if (response.status === 401) return undefined;
  if (!response.ok) throw new Error("DEMO_SESSION_UNAVAILABLE");
  return remember((await parseJson(response)) as SessionView);
}

async function getOrStartAgentSession() {
  const existing = await currentSession();
  if (existing?.role === "AGENT") return existing;
  return startDemoSession("AGENT");
}

/**
 * Explicit local synthetic role switch. Privileged roles are still rejected by
 * the server unless the runtime was intentionally started with privileged
 * synthetic roles enabled. No production identity/SSO semantics are implied.
 */
export async function startDemoSession(role: SyntheticRole) {
  const started = await fetch("/api/demo/session/start", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!started.ok) {
    let code = "DEMO_SESSION_UNAVAILABLE";
    try {
      code = (await parseJson(started)).error ?? code;
    } catch {
      // Keep the generic local-demo error when the response is not JSON.
    }
    throw new Error(code);
  }
  return remember((await parseJson(started)) as SessionView);
}

export async function demoApi(path: string, body?: unknown) {
  if (!csrfToken || cachedRole !== "AGENT") await getOrStartAgentSession();
  return sendDemoApi(path, body, "AGENT");
}

/**
 * Call an authenticated synthetic endpoint as an explicitly established role.
 * This never auto-escalates privileges: callers must first call
 * startDemoSession(role), and the server must independently authorize it.
 */
export async function demoApiAs(
  role: Exclude<SyntheticRole, "AGENT">,
  path: string,
  body?: unknown,
) {
  if (!csrfToken || cachedRole !== role) throw new Error("DEMO_ROLE_SESSION_REQUIRED");
  return sendDemoApi(path, body, role);
}

async function sendDemoApi(
  path: string,
  body: unknown,
  expectedRole: SyntheticRole,
) {
  const send = () =>
    fetch(`/api/demo/${path}`, {
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken ?? "",
            },
            body: JSON.stringify(body),
          }),
      credentials: "same-origin",
    });
  let response = await send();
  if (response.status === 401) {
    csrfToken = null;
    cachedRole = null;
    if (expectedRole !== "AGENT") throw new Error("DEMO_ROLE_SESSION_REQUIRED");
    await getOrStartAgentSession();
    response = await send();
  }
  if (!response.ok) {
    let code = "DEMO_REQUEST_REJECTED";
    try {
      code = (await parseJson(response)).error ?? code;
    } catch {
      // Keep the generic synthetic-demo error when the response is not JSON.
    }
    throw new Error(code);
  }
  return parseJson(response);
}

export function clearCachedDemoSession() {
  csrfToken = null;
  cachedRole = null;
}
