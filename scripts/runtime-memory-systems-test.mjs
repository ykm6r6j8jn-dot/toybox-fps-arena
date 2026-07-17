import assert from "node:assert/strict";
import {
  memoryUsageMiB,
  pruneTimedMap,
  websocketSendDecision
} from "../runtime-memory-systems.mjs";

assert.equal(websocketSendDecision({ readyState: 0 }), "closed");
assert.equal(websocketSendDecision({ readyState: 1, bufferedAmount: 0, payloadType: "snapshot" }), "send");
assert.equal(websocketSendDecision({ readyState: 1, bufferedAmount: 140 * 1024, payloadType: "snapshot" }), "skip");
assert.equal(websocketSendDecision({ readyState: 1, bufferedAmount: 140 * 1024, payloadType: "hit" }), "send");
assert.equal(websocketSendDecision({ readyState: 1, bufferedAmount: 1024 * 1024, payloadType: "hit" }), "terminate");

const entries = new Map([
  ["protected", { updatedAt: 1 }],
  ["expired", { updatedAt: 1 }],
  ["old", { updatedAt: 80 }],
  ["new", { updatedAt: 95 }]
]);
const removed = pruneTimedMap(entries, {
  now: 100,
  maxAgeMs: 30,
  maxEntries: 2,
  protectedKeys: new Set(["protected"])
});
assert.equal(removed, 2);
assert.deepEqual([...entries.keys()], ["protected", "new"]);

assert.deepEqual(memoryUsageMiB({
  rss: 64 * 1024 * 1024,
  heapUsed: 12.54 * 1024 * 1024,
  heapTotal: 20 * 1024 * 1024,
  external: 2 * 1024 * 1024,
  arrayBuffers: 512 * 1024
}), { rss: 64, heapUsed: 12.5, heapTotal: 20, external: 2, arrayBuffers: 0.5 });

console.log("runtime memory systems passed");
