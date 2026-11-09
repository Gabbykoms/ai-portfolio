/** Next may construct request.url with an internal hostname. The incoming Host
 * retains the authority the browser actually contacted. Do not trust arbitrary
 * forwarded-host headers or treat different loopback names/ports as equivalent.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // CLI clients do not send browser Origin headers.
  try {
    const internal = new URL(request.url);
    const host = request.headers.get('host') ?? internal.host;
    const expected = new URL(`${internal.protocol}//${host}`);
    if (expected.host !== host || expected.username || expected.password) return false;
    return origin === expected.origin;
  } catch {
    return false;
  }
}
