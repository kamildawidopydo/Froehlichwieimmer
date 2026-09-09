/**
 * Session 82.101 · No-op stub für Legacy-Kaufkraft-Telemetrie.
 *
 * Der Legacy-Insert nach `insufficient_buying_power_events` (Supabase-Only)
 * ist entfernt; ein Mongo-Telemetrie-Endpoint existiert noch nicht. Bis dahin
 * bleibt der Aufruf funktional, persistiert aber nichts — der Kunden-Flow wird
 * nicht blockiert und es entsteht keine Fake-Telemetrie.
 */
export async function logInsufficientBuyingPowerEvent(_client, _payload = {}) {
  return;
}
