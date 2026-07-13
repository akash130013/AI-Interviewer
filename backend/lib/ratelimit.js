// Simple in-memory sliding-window rate limiter (per serverless instance).
// Not perfect across cold starts / multiple instances, but blocks the
// common abuse case of hammering one warm instance. For stricter limits,
// move to Upstash Redis or a Supabase counter table later.

const buckets = new Map();

/**
 * @param {string} key        e.g. `${userId}:chat`
 * @param {number} limit      max requests per window
 * @param {number} windowMs   window length in ms
 * @returns {boolean} true if allowed, false if rate-limited
 */
function allowRequest(key, limit, windowMs) {
  const now = Date.now();
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  buckets.set(key, timestamps);

  // Prevent unbounded memory growth
  if (buckets.size > 10000) buckets.clear();
  return true;
}

module.exports = { allowRequest };
