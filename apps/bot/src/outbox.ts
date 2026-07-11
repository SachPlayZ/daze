export type NotificationIntent = { telegramUserId: string; sourceEventKey: string; sourceRevision: string; type: "POINT_IMPACT" | "CORRECTION" | "RANK_CHANGE" | "FINAL"; message: string };
export type NotificationStore = { hasKey(key: string): Promise<boolean>; enqueue(intent: NotificationIntent & { idempotencyKey: string }): Promise<void> };
export const notificationKey = (intent: Pick<NotificationIntent, "telegramUserId" | "sourceEventKey" | "sourceRevision" | "type">) => `${intent.telegramUserId}:${intent.sourceEventKey}:${intent.sourceRevision}:${intent.type}`;
/** Only call with an intent built from committed ledger rows. */
export async function enqueueNotification(intent: NotificationIntent, store: NotificationStore): Promise<boolean> {
  const idempotencyKey = notificationKey(intent); if (await store.hasKey(idempotencyKey)) return false; await store.enqueue({ ...intent, idempotencyKey }); return true;
}

export { correctionMessage, pointImpactMessage, type CommittedImpact } from "../../../packages/telegram/src";
import { TelegramClient } from "../../../packages/telegram/src";

/** Invoke after the ledger/outbox transaction commits; retries are safe through idempotency keys. */
export async function deliverNotification(intent: NotificationIntent, client: TelegramClient): Promise<void> {
  await client.sendDirectMessage(intent.telegramUserId, intent.message);
}
