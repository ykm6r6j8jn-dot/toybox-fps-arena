const realtimePayloadTypes = new Set([
  "snapshot",
  "baccarat_snapshot",
  "poker_snapshot"
]);

export const defaultWsSoftBufferBytes = 128 * 1024;
export const defaultWsHardBufferBytes = 1024 * 1024;

export function websocketSendDecision({
  readyState,
  bufferedAmount = 0,
  payloadType = "",
  softLimit = defaultWsSoftBufferBytes,
  hardLimit = defaultWsHardBufferBytes
} = {}) {
  if (readyState !== 1) return "closed";
  const queuedBytes = Math.max(0, Number(bufferedAmount) || 0);
  if (queuedBytes >= hardLimit) return "terminate";
  if (realtimePayloadTypes.has(String(payloadType)) && queuedBytes >= softLimit) return "skip";
  return "send";
}

export function pruneTimedMap(map, {
  now = Date.now(),
  maxAgeMs = Infinity,
  maxEntries = Infinity,
  timestamp = (value) => value?.updatedAt || 0,
  protectedKeys = new Set()
} = {}) {
  let removed = 0;
  for (const [key, value] of map) {
    if (protectedKeys.has(key)) continue;
    const updatedAt = Math.max(0, Number(timestamp(value, key)) || 0);
    if (now - updatedAt <= maxAgeMs) continue;
    map.delete(key);
    removed += 1;
  }
  if (map.size <= maxEntries) return removed;
  const candidates = [...map.entries()]
    .filter(([key]) => !protectedKeys.has(key))
    .sort((left, right) => (Number(timestamp(left[1], left[0])) || 0) - (Number(timestamp(right[1], right[0])) || 0));
  for (const [key] of candidates) {
    if (map.size <= maxEntries) break;
    map.delete(key);
    removed += 1;
  }
  return removed;
}

export function memoryUsageMiB(usage = {}) {
  const toMiB = (value) => Math.round((Math.max(0, Number(value) || 0) / 1024 / 1024) * 10) / 10;
  return {
    rss: toMiB(usage.rss),
    heapUsed: toMiB(usage.heapUsed),
    heapTotal: toMiB(usage.heapTotal),
    external: toMiB(usage.external),
    arrayBuffers: toMiB(usage.arrayBuffers)
  };
}
