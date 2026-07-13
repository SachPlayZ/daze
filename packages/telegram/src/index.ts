export type CommittedImpact = { minute: number | null; action: string; playerName: string; basePoints: number; appliedPoints: number; previousTotal: number; nextTotal: number; previousRank: number | null; nextRank: number | null; contestUrl: string };
const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;
const minuteLabel = (minute: number | null) => minute === null ? "Match update" : `${minute}′`;

/** Telegram text is derived only from committed ledger/rank projections. */
export function pointImpactMessage(impact: CommittedImpact): string {
  if (!impact.playerName.trim() || !impact.contestUrl.startsWith("http")) throw new Error("Committed impact is incomplete.");
  const multiplier = impact.appliedPoints === impact.basePoints * 2 ? " · Captain ×2" : "";
  const rank = impact.previousRank !== null && impact.nextRank !== null && impact.previousRank !== impact.nextRank ? `\nRank #${impact.previousRank} → #${impact.nextRank}` : "";
  return `${minuteLabel(impact.minute)} · ${impact.playerName}\n${impact.action} ${signed(impact.basePoints)}${multiplier}\nYour total: ${impact.previousTotal} → ${impact.nextTotal}${rank}\n${impact.contestUrl}`;
}

export function correctionMessage(input: { previousImpact: number; correctedImpact: number; newTotal: number; contestUrl: string }): string {
  if (!input.contestUrl.startsWith("http")) throw new Error("Contest URL is required.");
  return `Score correction: the earlier event was amended by the official feed.\nPrevious impact: ${signed(input.previousImpact)}\nCorrected impact: ${signed(input.correctedImpact)}\nNew total: ${input.newTotal}\n${input.contestUrl}`;
}

export function rankChangeMessage(input: { previousRank: number; nextRank: number; contestUrl: string }): string {
  if (!input.contestUrl.startsWith("http")) throw new Error("Contest URL is required.");
  const direction = input.nextRank < input.previousRank ? "up" : "down";
  return `Rank update: you moved ${direction}, #${input.previousRank} → #${input.nextRank}.\n${input.contestUrl}`;
}

export function finalResultMessage(input: { rank: number; total: number; payout: number; contestUrl: string }): string {
  if (!input.contestUrl.startsWith("http")) throw new Error("Contest URL is required.");
  const payoutLine = input.payout > 0 ? `Payout: ${input.payout} tokens\n` : "";
  return `Final result: rank #${input.rank}, ${input.total} points.\n${payoutLine}${input.contestUrl}`;
}

export type TelegramHttp = (input: string, init: RequestInit) => Promise<Response>;
/** Server-only Telegram client; accepts only positive direct-message user IDs. */
export class TelegramClient {
  constructor(private readonly token: string, private readonly http: TelegramHttp = fetch) { if (!token) throw new Error("Telegram bot token is required."); }
  async sendDirectMessage(telegramUserId: string, text: string): Promise<void> {
    if (!/^\d+$/.test(telegramUserId) || BigInt(telegramUserId) <= 0n) throw new Error("Telegram notifications may only target a direct user ID.");
    const response = await this.http(`https://api.telegram.org/bot${this.token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: telegramUserId, text, disable_web_page_preview: true }) });
    if (!response.ok) throw new Error(`Telegram delivery failed (${response.status}).`);
  }
}
