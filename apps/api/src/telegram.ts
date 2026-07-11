import { randomBytes } from "node:crypto";
export type TelegramLinkToken = { token: string; telegramUserId: string; expiresAt: string };
export type TelegramLinkStore = { save(token: TelegramLinkToken): Promise<void>; consume(token: string, telegramUserId: string): Promise<TelegramLinkToken | null> };
export async function issueTelegramLink(telegramUserId: string, store: TelegramLinkStore, now = new Date()): Promise<TelegramLinkToken> { const value = { token: randomBytes(24).toString("base64url"), telegramUserId, expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString() }; await store.save(value); return value; }
export async function consumeTelegramLink(token: string, telegramUserId: string, store: TelegramLinkStore, now = new Date()): Promise<boolean> { const value = await store.consume(token, telegramUserId); return Boolean(value && new Date(value.expiresAt) > now); }

