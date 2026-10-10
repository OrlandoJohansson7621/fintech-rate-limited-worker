import { z } from "zod";
import { infrai } from "./infrai.js";

export const paymentEvent = z.object({
  payment_id: z.string().min(1), amount: z.number().positive(), currency: z.string().length(3), customer_id: z.string().min(1)
});
export type PaymentEvent = z.infer<typeof paymentEvent>;

export function decideRisk(event: PaymentEvent): "approve" | "review" {
  return event.amount >= 10000 ? "review" : "approve";
}

export function auditNotification(event: PaymentEvent, decision: string) {
  return { payment_id: event.payment_id, decision, amount: event.amount, currency: event.currency };
}

export async function runWorker(): Promise<void> {
  const queueName = "payment-risk-events";
  const queue = await infrai.queue.create(queueName);
  console.log(`queue ready: ${queue.queue_id}`);
  const batch = await infrai.queue.consume(queueName, 5, 30);
  for (const message of batch.messages ?? []) {
    const parsed = paymentEvent.safeParse(message.payload);
    if (!parsed.success) { console.error("invalid payment event", message.message_id); continue; }
    const decision = decideRisk(parsed.data);
    await infrai.queue.publish(queueName, auditNotification(parsed.data, decision));
    await infrai.queue.ack(queueName, message.message_id);
    console.log(JSON.stringify({ payment_id: parsed.data.payment_id, decision }));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) runWorker().catch(error => { console.error(error); process.exitCode = 1; });
