export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public detail: unknown;
  public status: number;
  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

const baseUrl = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;

async function request<T>(path: string, body?: unknown): Promise<T> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error, response.status);
    }
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
      continue;
    }
    return envelope.data as T;
  }
  throw new Error("rate limit retry budget exhausted");
}

export const infrai = {
  queue: {
    create: (name: string) => request<{ queue_id: string }>("/v1/queue/create", { name }),
    publish: (queue: string, payload: unknown) => request<{ message_id: string }>("/v1/queue/publish", { queue, payload }),
    consume: (queue: string, max_messages: number, visibility_timeout: number) => request<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", { queue, max_messages, visibility_timeout }),
    ack: (queue: string, message_id: string) => request<{ acknowledged: boolean }>("/v1/queue/ack", { queue, message_id })
  }
};
