type SessionView = {
  csrfToken: string;
  role: "AGENT" | "SUPERVISOR" | "PARTNER_ADMIN";
  localDevelopmentAuth: true;
};

let csrfToken: string | null = null;

async function parseJson(response: Response) {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("DEMO_API_UNAVAILABLE");
  return response.json();
}

async function getOrStartSession() {
  const existing = await fetch("/api/demo/session", { credentials: "same-origin" });
  if (existing.ok) {
    const session = (await parseJson(existing)) as SessionView;
    csrfToken = session.csrfToken;
    return session;
  }
  if (existing.status !== 401) throw new Error("DEMO_SESSION_UNAVAILABLE");
  const started = await fetch("/api/demo/session/start", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "AGENT" }),
  });
  if (!started.ok) throw new Error("DEMO_SESSION_UNAVAILABLE");
  const session = (await parseJson(started)) as SessionView;
  csrfToken = session.csrfToken;
  return session;
}

export async function demoApi(path: string, body?: unknown) {
  if (!csrfToken) await getOrStartSession();
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
    await getOrStartSession();
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
}
