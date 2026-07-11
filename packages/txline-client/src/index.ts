/** Server-only TxLINE client. Never import this package into browser components. */
export class TxlineClient {
  private guestJwt: string | null;
  constructor(private readonly config: { origin: string; apiToken: string; guestJwt?: string }) { this.guestJwt = config.guestJwt ?? null; }

  private async freshGuestJwt(): Promise<string> {
    const response = await fetch(new URL("/auth/guest/start", this.config.origin), { method: "POST", cache: "no-store" });
    if (!response.ok) throw new Error(`TxLINE guest session failed (${response.status}).`);
    const payload = await response.json() as { token?: unknown };
    if (typeof payload.token !== "string" || !payload.token) throw new Error("TxLINE guest session did not return a token.");
    this.guestJwt = payload.token;
    return payload.token;
  }

  async getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
    const jwt = this.guestJwt ?? await this.freshGuestJwt();
    let response = await fetch(new URL(path, this.config.origin), { headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": this.config.apiToken }, signal, cache: "no-store" });
    if (response.status === 401) {
      const refreshedJwt = await this.freshGuestJwt();
      response = await fetch(new URL(path, this.config.origin), { headers: { Authorization: `Bearer ${refreshedJwt}`, "X-Api-Token": this.config.apiToken }, signal, cache: "no-store" });
    }
    if (!response.ok) throw new Error(`TxLINE upstream request failed (${response.status}).`);
    return response.json() as Promise<T>;
  }

  async openEventStream(path: string, signal?: AbortSignal): Promise<Response> {
    const request = async (jwt: string) => fetch(new URL(path, this.config.origin), { headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": this.config.apiToken, Accept: "text/event-stream" }, signal, cache: "no-store" });
    let response = await request(this.guestJwt ?? await this.freshGuestJwt());
    if (response.status === 401) response = await request(await this.freshGuestJwt());
    if (!response.ok || !response.body) throw new Error(`TxLINE score stream failed (${response.status}).`);
    return response;
  }
}

export function txlineFromEnvironment(): TxlineClient {
  const { TXLINE_API_ORIGIN, TXLINE_GUEST_JWT, TXLINE_API_TOKEN } = process.env;
  if (!TXLINE_API_ORIGIN || !TXLINE_API_TOKEN) throw new Error("TxLINE server credentials are not configured.");
  return new TxlineClient({ origin: TXLINE_API_ORIGIN, guestJwt: TXLINE_GUEST_JWT, apiToken: TXLINE_API_TOKEN });
}
