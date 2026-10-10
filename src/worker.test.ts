import assert from "node:assert/strict";
import { decideRisk, paymentEvent } from "./worker.js";

const event = paymentEvent.parse({ payment_id: "pay_42", amount: 12500, currency: "USD", customer_id: "cus_9" });
assert.equal(decideRisk(event), "review");
assert.equal(decideRisk({ ...event, amount: 120 }), "approve");
console.log("risk decision test passed");
