import "./env.js";
import { randomBytes } from "node:crypto";
import { db, ensureSchema } from "./db.js";

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

if (!TOKEN) { log("Daze bot: TELEGRAM_BOT_TOKEN is not set. Exiting."); process.exit(1); }

// ── Telegram API helpers ───────────────────────────────────────────────────

type TgUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number };
    text?: string;
  };
};

type TgGetUpdatesResult = { ok: boolean; result: TgUpdate[] };

async function tgCall<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

async function reply(chatId: number, text: string): Promise<void> {
  await tgCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

// ── DB helpers ─────────────────────────────────────────────────────────────

async function linkedWallet(telegramUserId: string): Promise<string | null> {
  const res = await db().query<{ wallet: string }>(
    "select wallet from telegram_links where telegram_user_id = $1",
    [telegramUserId],
  );
  return res.rows[0]?.wallet ?? null;
}

async function ensureNotificationPrefs(wallet: string): Promise<{
  reminders: boolean; point_impacts: boolean; rank_changes: boolean;
  reconciliation: boolean; final_results: boolean; paused: boolean;
}> {
  await db().query(
    `insert into notification_preferences (wallet) values ($1) on conflict (wallet) do nothing`,
    [wallet],
  );
  const res = await db().query<{
    reminders: boolean; point_impacts: boolean; rank_changes: boolean;
    reconciliation: boolean; final_results: boolean; paused: boolean;
  }>(
    "select reminders, point_impacts, rank_changes, reconciliation, final_results, paused from notification_preferences where wallet = $1",
    [wallet],
  );
  return res.rows[0]!;
}

// ── Command handlers ───────────────────────────────────────────────────────

async function handleStart(chatId: number): Promise<void> {
  await reply(chatId,
    "Welcome to Daze — World Cup fantasy, live by TxLINE.\n\n" +
    "Build your XI, pick your captain, lock your team before kick-off, and earn points for every verified on-pitch moment.\n\n" +
    "Commands:\n" +
    "/link — connect your wallet to this Telegram account\n" +
    "/today — see upcoming fixtures\n" +
    "/team — view your locked squad\n" +
    "/points — check your score and rank\n" +
    "/settings — manage notifications\n" +
    "/unlink — disconnect your wallet\n" +
    "/stop — pause all notifications\n\n" +
    "Head to the app to build your squad: " + APP_URL,
  );
}

async function handleLink(chatId: number, telegramUserId: string): Promise<void> {
  const token = randomBytes(24).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60_000);
  await db().query(
    `insert into telegram_link_tokens (token, telegram_user_id, created_at, expires_at)
     values ($1, $2, $3, $4)`,
    [token, telegramUserId, now.toISOString(), expiresAt.toISOString()],
  );
  await reply(chatId,
    `Open this link within 10 minutes to connect your wallet:\n${APP_URL}/link?token=${token}\n\n` +
    "Once you connect your wallet on that page, your Telegram account will be linked and you'll receive live score updates.",
  );
}

async function handleToday(chatId: number): Promise<void> {
  const res = await db().query<{ id: string; kickoff_at: Date; feed_state: string; lifecycle: string }>(
    "select id, kickoff_at, feed_state, lifecycle from fixtures where kickoff_at > now() order by kickoff_at asc limit 10",
  );
  if (!res.rows.length) {
    await reply(chatId, "No upcoming fixtures found. Check back closer to kick-off.");
    return;
  }
  const lines = res.rows.map((r) => {
    const dt = new Date(r.kickoff_at).toUTCString().replace(/ GMT$/, " UTC");
    return `• Fixture ${r.id}\n  Kick-off: ${dt}\n  Feed: ${r.feed_state} (${r.lifecycle})`;
  });
  await reply(chatId, "Upcoming fixtures:\n\n" + lines.join("\n\n"));
}

async function handleTeam(chatId: number, telegramUserId: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "Your Telegram account is not linked yet. Use /link to connect your wallet first.");
    return;
  }
  const res = await db().query<{ contest_id: string; canonical_json: { formation: string; playerIds: string[]; captainId: string; viceCaptainId: string }; locked_at: Date }>(
    "select contest_id, canonical_json, locked_at from locked_teams where wallet = $1 order by locked_at desc limit 1",
    [wallet],
  );
  if (!res.rows[0]) {
    await reply(chatId, `You haven't locked a team yet.\nVisit ${APP_URL} to build your XI.`);
    return;
  }
  const { contest_id: contestId, canonical_json: team, locked_at } = res.rows[0];
  const lockedTs = new Date(locked_at).toUTCString().replace(/ GMT$/, " UTC");
  await reply(chatId,
    `Your locked squad for contest ${contestId}:\n\n` +
    `Formation: ${team.formation}\n` +
    `Players (note: player IDs shown — names available on the web app):\n${team.playerIds.map((id) => `  • ${id}`).join("\n")}\n\n` +
    `Captain: player ${team.captainId}\n` +
    `Vice-captain: player ${team.viceCaptainId}\n\n` +
    `Locked at: ${lockedTs}`,
  );
}

async function handlePoints(chatId: number, telegramUserId: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "Your Telegram account is not linked yet. Use /link to connect your wallet first.");
    return;
  }
  const res = await db().query<{ contest_id: string; total: number; rank: number | null }>(
    "select contest_id, total, rank from entry_totals where wallet = $1 order by updated_at desc limit 1",
    [wallet],
  );
  if (!res.rows[0]) {
    await reply(chatId, `You haven't entered a contest yet.\nVisit ${APP_URL} to lock your team and enter.`);
    return;
  }
  const { contest_id: contestId, total, rank } = res.rows[0];
  const rankText = rank !== null ? `Rank: #${rank}` : "Rank: not yet assigned";
  await reply(chatId, `Your score for contest ${contestId}:\nTotal points: ${total}\n${rankText}\n\nFull leaderboard: ${APP_URL}`);
}

async function handleSettings(chatId: number, telegramUserId: string, args: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "Your Telegram account is not linked yet. Use /link to connect your wallet first.");
    return;
  }

  const parts = args.trim().toLowerCase().split(/\s+/);
  const settingName = parts[0];
  const settingValue = parts[1];

  const validSettings: Record<string, string> = {
    reminders: "reminders",
    "point-impacts": "point_impacts",
    "point_impacts": "point_impacts",
    "rank-changes": "rank_changes",
    "rank_changes": "rank_changes",
    reconciliation: "reconciliation",
    "final-results": "final_results",
    "final_results": "final_results",
  };

  if (settingName && settingName in validSettings && (settingValue === "on" || settingValue === "off")) {
    const col = validSettings[settingName]!;
    const val = settingValue === "on";
    await db().query(
      `insert into notification_preferences (wallet, ${col}) values ($1, $2)
       on conflict (wallet) do update set ${col} = excluded.${col}`,
      [wallet, val],
    );
    await reply(chatId, `Updated: ${settingName} is now ${settingValue}.`);
    return;
  }

  const prefs = await ensureNotificationPrefs(wallet);
  const on = (v: boolean) => (v ? "on" : "off");
  await reply(chatId,
    "Your notification settings:\n\n" +
    `reminders: ${on(prefs.reminders)}\n` +
    `point_impacts: ${on(prefs.point_impacts)}\n` +
    `rank_changes: ${on(prefs.rank_changes)}\n` +
    `reconciliation: ${on(prefs.reconciliation)}\n` +
    `final_results: ${on(prefs.final_results)}\n` +
    `paused: ${on(prefs.paused)}\n\n` +
    "To toggle a setting, reply:\n" +
    "  /settings reminders off\n" +
    "  /settings point_impacts on\n" +
    "  /settings rank_changes off\n" +
    "  /settings reconciliation on\n" +
    "  /settings final_results on\n\n" +
    "To pause all notifications: /stop\n" +
    "To resume: /settings paused off",
  );
}

async function handleUnlink(chatId: number, telegramUserId: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "No linked wallet found for this Telegram account.");
    return;
  }
  await db().query("delete from telegram_links where telegram_user_id = $1", [telegramUserId]);
  await reply(chatId, "Your wallet has been unlinked. You will no longer receive score notifications.\nUse /link to reconnect at any time.");
}

async function handleStop(chatId: number, telegramUserId: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "Your Telegram account is not linked yet. Use /link to connect your wallet first.");
    return;
  }
  await db().query(
    `insert into notification_preferences (wallet, paused) values ($1, true)
     on conflict (wallet) do update set paused = true`,
    [wallet],
  );
  await reply(chatId, "Notifications paused. You will no longer receive score DMs.\nTo resume, send: /settings paused off");
}

// ── Update dispatcher ──────────────────────────────────────────────────────

async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  const telegramUserId = String(msg.from?.id ?? "");
  if (!telegramUserId) return;

  const text = msg.text.trim();
  const spaceIdx = text.indexOf(" ");
  const rawCommand = spaceIdx === -1 ? text : text.slice(0, spaceIdx);
  // Strip bot username suffix (e.g. /start@DazeBot)
  const command = rawCommand.split("@")[0]!.toLowerCase();
  const args = spaceIdx === -1 ? "" : text.slice(spaceIdx + 1);

  // Personal commands: only in private chat (prevents group data leakage per AGENTS.md 13.2)
  const isPrivate = chatType === "private";
  const personalCommands = new Set(["/team", "/points", "/settings", "/unlink", "/stop", "/link"]);

  if (personalCommands.has(command) && !isPrivate) {
    await reply(chatId, "Personal commands only work in a private chat with this bot.");
    return;
  }

  try {
    switch (command) {
      case "/start": await handleStart(chatId); break;
      case "/link": await handleLink(chatId, telegramUserId); break;
      case "/today": await handleToday(chatId); break;
      case "/team": await handleTeam(chatId, telegramUserId); break;
      case "/points": await handlePoints(chatId, telegramUserId); break;
      case "/settings": await handleSettings(chatId, telegramUserId, args); break;
      case "/unlink": await handleUnlink(chatId, telegramUserId); break;
      case "/stop": await handleStop(chatId, telegramUserId); break;
      default:
        if (command.startsWith("/")) {
          await reply(chatId, "Unknown command. Available: /start /link /today /team /points /settings /unlink /stop");
        }
    }
  } catch (error) {
    log("handler error for command", command, error instanceof Error ? error.message : error);
    try { await reply(chatId, "Something went wrong. Please try again."); } catch { /* ignore */ }
  }
}

// ── Long-polling loop ──────────────────────────────────────────────────────

async function pollLoop(): Promise<never> {
  let offset = 0;
  let backoffMs = 1000;

  for (;;) {
    try {
      const result = await tgCall<TgGetUpdatesResult>("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message"],
      });

      if (!result.ok) {
        log("getUpdates returned ok=false; retrying.");
        await new Promise((r) => setTimeout(r, backoffMs + Math.random() * 500));
        backoffMs = Math.min(backoffMs * 2, 30_000);
        continue;
      }

      backoffMs = 1000;

      for (const update of result.result) {
        offset = update.update_id + 1;
        handleUpdate(update).catch((error) =>
          log("unhandled update error:", error instanceof Error ? error.message : error),
        );
      }
    } catch (error) {
      log("poll error:", error instanceof Error ? error.message : error);
      await new Promise((r) => setTimeout(r, backoffMs + Math.random() * 500));
      backoffMs = Math.min(backoffMs * 2, 30_000);
    }
  }
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await ensureSchema();
  log("Daze bot: schema ready.");
  log(`Daze bot: polling for updates (app=${APP_URL})`);
  await pollLoop();
}

main().catch((error) => { log("Daze bot crashed:", error); process.exitCode = 1; });
