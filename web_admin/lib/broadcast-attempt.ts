export type BroadcastAttempt = { identity: string; operationId: string };

/** Keep retries of one in-memory composer intent on the same server operation. */
export function broadcastAttempt(
  previous: BroadcastAttempt | null,
  payload: Record<string, string | undefined>,
  newId: () => string = () => crypto.randomUUID(),
): BroadcastAttempt {
  const identity = JSON.stringify(Object.entries(payload).filter(([, value]) => value !== undefined).sort(([left], [right]) => left.localeCompare(right)));
  return previous?.identity === identity ? previous : { identity, operationId: newId() };
}
