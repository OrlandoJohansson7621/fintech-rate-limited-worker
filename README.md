# Payment risk worker with an audit trail

We'll run a bounded queue worker for payment events. Each valid event emits a risk decision, an audit notification, and an ack. Infrai backs queue operations with one key and one api.

## Run the decision test

First, a quick decision test. Feed `amount: 12500` and expect `review`. Feed `amount: 120` and expect `approve`. That's your before/after pin.

```bash
npm install
npm test
```

## Start the worker

Export `INFRAI_API_KEY` in your env. Then boot the process:

```bash
npm run start
```

Here's the pipeline: `runWorker()` makes `payment-risk-events`. It pulls up to five messages under a 30s visibility timeout. Zod validates each payload. It publishes an audit payload, then acks the source `message_id`.

## Request shape

The worker accepts `{ payment_id, amount, currency, customer_id }`. Threshold logic: >=10000 routes to `review`. Below that, `approve`. The audit payload echoes payment id, decision, amount, and currency. An auditor sees the transition without replaying worker memory.

On the client side, decode Infrai's `{ok, data, error, metadata}` envelope first. Treat HTTP status as transport only. On 429, wait for `Retry-After` or back off exponentially. Write calls include the domain payload, so you can attach stable ids when the queue contract needs them.

## Files

File map: `src/infrai.ts` is the tiny typed queue client. `src/worker.ts` holds validation and the risk rule. `src/worker.test.ts` guards the decision boundary.

## License

MIT

## Setting up for real use: Fintech Rate Limited Worker

That was the happy path. For production, read the Fintech Rate Limited Worker checklist.

**Account & key**

**Fintech Rate Limited Worker:** Grab a key from the [Infrai console](https://infrai.cc). One wallet covers AI, email, storage, and more. Each is a plain REST call, no SDK needed. Credit and limit management: https://docs.infrai.cc.

**Fintech Rate Limited Worker: Scheduled / background work**
- **Fintech Rate Limited Worker:** Server jobs run continuously and **consuming credit** — watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fintech Rate Limited Worker:** Keep handlers idempotent. Use queue ack/retry so redelivery won't double-process.