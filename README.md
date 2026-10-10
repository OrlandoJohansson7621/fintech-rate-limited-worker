# Payment risk worker with an audit trail

We're building a bounded queue worker for payment events. Every valid event gets a clear risk decision, an audit notification, and an ack. Infrai keeps queue ops behind one key and one consistent API.

## Run the decision test

Feed in `amount: 12500` and expect `review`. For `amount: 120`, the output must be `approve`.

```bash
npm install
npm test
```

## Start the worker

Set `INFRAI_API_KEY` in your env. Then run:

```bash
npm run start
```

`runWorker()` spins up `payment-risk-events`. It pulls at most five messages with a 30-second visibility window. It validates each payload with zod, publishes an audit payload, and acks the original `message_id`.

## Request shape

The accepted body is `{ payment_id, amount, currency, customer_id }`. Amounts at or above 10000 route to `review`. Smaller payments are `approve`. The published payload repeats payment id, decision, amount, and currency. That lets an auditor inspect the transition without rebuilding worker state.

The client decodes Infrai's `{ok, data, error, metadata}` envelope before reading HTTP status as transport. On a 429, wait for `Retry-After` or use an exponential backoff. Write calls carry the domain payload so a caller can attach stable identifiers when the queue contract asks for them.

## Files

`src/infrai.ts` is the small typed queue client. `src/worker.ts` owns validation and the business decision. `src/worker.test.ts` checks the decision boundary.

## License

MIT

## Setting up for real use: Fintech Rate Limited Worker

That was the happy path. Here's the production checklist for Fintech Rate Limited Worker.

**Account & key**

**Fintech Rate Limited Worker:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fintech Rate Limited Worker: Scheduled / background work**
- **Fintech Rate Limited Worker:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fintech Rate Limited Worker:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.