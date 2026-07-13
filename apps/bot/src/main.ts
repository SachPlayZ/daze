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
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { message_id: number; chat: { id: number; type: string } };
  };
};

type TgGetUpdatesResult = { ok: boolean; result: TgUpdate[] };
type InlineKeyboard = { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] };

async function tgCall<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

async function reply(chatId: number, text: string, replyMarkup?: InlineKeyboard): Promise<void> {
  await tgCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

async function edit(chatId: number, messageId: number, text: string, replyMarkup?: InlineKeyboard): Promise<void> {
  await tgCall("editMessageText", { chat_id: chatId, message_id: messageId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

async function answerCallback(callbackQueryId: string): Promise<void> { await tgCall("answerCallbackQuery", { callback_query_id: callbackQueryId }); }

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
  await reply(chatId, "Welcome to Daze.\nEvery moment changes your game.", {
    inline_keyboard: [
      [{ text: "🔗 Link wallet", callback_data: "link" }, { text: "⚽ Fixtures", callback_data: "today" }],
      [{ text: "📋 My team", callback_data: "team" }, { text: "📊 My points", callback_data: "points" }],
      [{ text: "⚙️ Notifications", callback_data: "settings" }],
      [{ text: "Open Daze ↗", url: APP_URL }],
    ],
  });
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
  await reply(chatId, "Link your wallet to receive personal match updates.", {
    inline_keyboard: [[{ text: "Link wallet ↗", url: `${APP_URL}/link?token=${token}` }]],
  });
}

const countryFlags: Record<string, string> = { argentina: "🇦🇷", belgium: "🇧🇪", brazil: "🇧🇷", england: "🏴", france: "🇫🇷", germany: "🇩🇪", italy: "🇮🇹", japan: "🇯🇵", mexico: "🇲🇽", morocco: "🇲🇦", netherlands: "🇳🇱", paraguay: "🇵🇾", portugal: "🇵🇹", spain: "🇪🇸", sweden: "🇸🇪", uruguay: "🇺🇾" };
const flagFor = (team: string | null) => countryFlags[(team ?? "").trim().toLowerCase()] ?? "🏳️";
const fixtureLabel = (fixture: { home_team_name: string | null; away_team_name: string | null; id: string }) => `${flagFor(fixture.home_team_name)} ${fixture.home_team_name ?? "Home"} vs ${flagFor(fixture.away_team_name)} ${fixture.away_team_name ?? "Away"}`;

async function handleToday(chatId: number): Promise<void> {
  const res = await db().query<{ id: string; kickoff_at: Date; home_team_name: string | null; away_team_name: string | null }>(
    "select id, kickoff_at, home_team_name, away_team_name from fixtures where kickoff_at > now() order by kickoff_at asc limit 8",
  );
  if (!res.rows.length) {
    await reply(chatId, "No upcoming fixtures found. Check back closer to kick-off.");
    return;
  }
  const next = res.rows[0]!;
  const kickoff = new Date(next.kickoff_at).toUTCString().replace(/ GMT$/, " UTC");
  await reply(chatId, `Upcoming fixtures\n\n${fixtureLabel(next)}\nKick-off: ${kickoff}`, {
    inline_keyboard: [
      ...res.rows.map((fixture) => [{ text: fixtureLabel(fixture), callback_data: `fixture:${fixture.id}` }]),
      [{ text: "Open Daze ↗", url: `${APP_URL}/fixtures` }],
    ],
  });
}

async function handleFixture(chatId: number, fixtureId: string): Promise<void> {
  const result = await db().query<{ id: string; kickoff_at: Date; home_team_name: string | null; away_team_name: string | null; feed_state: string; lifecycle: string }>(
    "select id, kickoff_at, home_team_name, away_team_name, feed_state, lifecycle from fixtures where id = $1",
    [fixtureId],
  );
  const fixture = result.rows[0];
  if (!fixture) { await reply(chatId, "That fixture is no longer available."); return; }
  await reply(chatId, `${fixtureLabel(fixture)}\n${new Date(fixture.kickoff_at).toUTCString().replace(/ GMT$/, " UTC")}\nStatus: ${fixture.lifecycle.replaceAll("_", " ")}`, {
    inline_keyboard: [[{ text: "Open fixture ↗", url: `${APP_URL}/fixtures` }, { text: "← Fixtures", callback_data: "today" }]],
  });
}

function contestPickerText(command: string, rows: { contest_id: string; fixture_id: string; kickoff_at: Date }[]): string {
  const list = rows.map((r) => `• ${r.contest_id} — fixture ${r.fixture_id} (${new Date(r.kickoff_at).toUTCString().replace(/ GMT$/, " UTC")})`).join("\n");
  return `You're in multiple contests. Reply with ${command} <contestId>:\n\n${list}`;
}

async function handleTeam(chatId: number, telegramUserId: string, args: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "Your Telegram account is not linked yet. Use /link to connect your wallet first.");
    return;
  }
  const res = await db().query<{ contest_id: string; fixture_id: string; kickoff_at: Date; canonical_json: { formation: string; playerIds: string[]; captainId: string; viceCaptainId: string }; locked_at: Date }>(
    `select lt.contest_id, c.fixture_id, f.kickoff_at, lt.canonical_json, lt.locked_at
     from locked_teams lt join contests c on c.id = lt.contest_id join fixtures f on f.id = c.fixture_id
     where lt.wallet = $1 order by f.kickoff_at desc`,
    [wallet],
  );
  if (!res.rows.length) {
    await reply(chatId, `You haven't locked a team yet.\nVisit ${APP_URL} to build your XI.`);
    return;
  }
  const requested = args.trim();
  if (requested) {
    const match = res.rows.find((r) => r.contest_id === requested);
    if (!match) { await reply(chatId, `No locked team found for contest ${requested}.\nUse /team to see your contests.`); return; }
    return void (await sendTeam(chatId, match));
  }
  if (res.rows.length > 1) { await reply(chatId, contestPickerText("/team", res.rows)); return; }
  await sendTeam(chatId, res.rows[0]!);
}

async function sendTeam(chatId: number, row: { contest_id: string; canonical_json: { formation: string; playerIds: string[]; captainId: string; viceCaptainId: string }; locked_at: Date }): Promise<void> {
  const lockedTs = new Date(row.locked_at).toUTCString().replace(/ GMT$/, " UTC");
  await reply(chatId,
    `Your locked squad for contest ${row.contest_id}:\n\n` +
    `Formation: ${row.canonical_json.formation}\n` +
    `Players (note: player IDs shown — names available on the web app):\n${row.canonical_json.playerIds.map((id) => `  • ${id}`).join("\n")}\n\n` +
    `Captain: player ${row.canonical_json.captainId}\n` +
    `Vice-captain: player ${row.canonical_json.viceCaptainId}\n\n` +
    `Locked at: ${lockedTs}`,
  );
}

async function handlePoints(chatId: number, telegramUserId: string, args: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "Your Telegram account is not linked yet. Use /link to connect your wallet first.");
    return;
  }
  const res = await db().query<{ contest_id: string; fixture_id: string; kickoff_at: Date; total: number; rank: number | null }>(
    `select et.contest_id, c.fixture_id, f.kickoff_at, et.total, et.rank
     from entry_totals et join contests c on c.id = et.contest_id join fixtures f on f.id = c.fixture_id
     where et.wallet = $1 order by f.kickoff_at desc`,
    [wallet],
  );
  if (!res.rows.length) {
    await reply(chatId, `You haven't entered a contest yet.\nVisit ${APP_URL} to lock your team and enter.`);
    return;
  }
  const requested = args.trim();
  if (requested) {
    const match = res.rows.find((r) => r.contest_id === requested);
    if (!match) { await reply(chatId, `You haven't entered contest ${requested}.\nUse /points to see your contests.`); return; }
    return void (await sendPoints(chatId, match));
  }
  if (res.rows.length > 1) { await reply(chatId, contestPickerText("/points", res.rows)); return; }
  await sendPoints(chatId, res.rows[0]!);
}

async function sendPoints(chatId: number, row: { contest_id: string; total: number; rank: number | null }): Promise<void> {
  const rankText = row.rank !== null ? `Rank: #${row.rank}` : "Rank: not yet assigned";
  await reply(chatId, `Your score for contest ${row.contest_id}:\nTotal points: ${row.total}\n${rankText}\n\nFull leaderboard: ${APP_URL}`);
}

type NotificationPrefs = { reminders: boolean; point_impacts: boolean; rank_changes: boolean; reconciliation: boolean; final_results: boolean; paused: boolean };
type Setting = "reminders" | "point_impacts" | "rank_changes" | "reconciliation" | "final_results" | "paused";
const settingLabels: Record<Setting, string> = { reminders: "Reminders", point_impacts: "Match moments", rank_changes: "Rank moves", reconciliation: "Corrections", final_results: "Final result", paused: "All notifications" };
const indicator = (value: boolean) => value ? "🟢" : "⚪️";
function settingsKeyboard(prefs: NotificationPrefs): InlineKeyboard {
  const toggle = (key: Exclude<Setting, "paused">) => ({ text: `${indicator(prefs[key])} ${settingLabels[key]}`, callback_data: `setting:${key}` });
  return { inline_keyboard: [
    [toggle("point_impacts"), toggle("rank_changes")],
    [toggle("reminders"), toggle("reconciliation")],
    [toggle("final_results")],
    [{ text: prefs.paused ? "▶ Resume notifications" : "⏸ Pause all", callback_data: "setting:paused" }],
    [{ text: "← Home", callback_data: "home" }],
  ] };
}

async function renderSettings(chatId: number, telegramUserId: string, messageId?: number): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) {
    await reply(chatId, "Link a wallet first to manage personal notifications.", { inline_keyboard: [[{ text: "🔗 Link wallet", callback_data: "link" }]] });
    return;
  }

  const prefs = await ensureNotificationPrefs(wallet);
  const text = prefs.paused ? "Notifications are paused." : "Choose the updates you want from Daze.";
  if (messageId) await edit(chatId, messageId, text, settingsKeyboard(prefs)); else await reply(chatId, text, settingsKeyboard(prefs));
}

async function handleSettings(chatId: number, telegramUserId: string, args: string): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  if (!wallet) { await renderSettings(chatId, telegramUserId); return; }

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
    await renderSettings(chatId, telegramUserId);
    return;
  }
  await renderSettings(chatId, telegramUserId);
}

async function toggleSetting(chatId: number, telegramUserId: string, setting: string, messageId: number): Promise<void> {
  const wallet = await linkedWallet(telegramUserId);
  const valid = new Set<Setting>(["reminders", "point_impacts", "rank_changes", "reconciliation", "final_results", "paused"]);
  if (!wallet || !valid.has(setting as Setting)) { await renderSettings(chatId, telegramUserId, messageId); return; }
  const key = setting as Setting;
  const prefs = await ensureNotificationPrefs(wallet);
  await db().query(`update notification_preferences set ${key} = $1 where wallet = $2`, [!prefs[key], wallet]);
  await renderSettings(chatId, telegramUserId, messageId);
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
  await reply(chatId, "Notifications paused.", { inline_keyboard: [[{ text: "▶ Resume notifications", callback_data: "setting:paused" }]] });
}

// ── Update dispatcher ──────────────────────────────────────────────────────

async function handleCallback(update: TgUpdate["callback_query"]): Promise<void> {
  if (!update?.message || update.message.chat.type !== "private") { if (update) await answerCallback(update.id); return; }
  const chatId = update.message.chat.id;
  const telegramUserId = String(update.from.id);
  const action = update.data ?? "";
  await answerCallback(update.id);
  if (action === "home") return void (await handleStart(chatId));
  if (action === "link") return void (await handleLink(chatId, telegramUserId));
  if (action === "today") return void (await handleToday(chatId));
  if (action === "team") return void (await handleTeam(chatId, telegramUserId, ""));
  if (action === "points") return void (await handlePoints(chatId, telegramUserId, ""));
  if (action === "settings") return void (await renderSettings(chatId, telegramUserId, update.message.message_id));
  if (action.startsWith("fixture:")) return void (await handleFixture(chatId, action.slice("fixture:".length)));
  if (action.startsWith("setting:")) return void (await toggleSetting(chatId, telegramUserId, action.slice("setting:".length), update.message.message_id));
}

async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) return void (await handleCallback(update.callback_query));
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
      case "/team": await handleTeam(chatId, telegramUserId, args); break;
      case "/points": await handlePoints(chatId, telegramUserId, args); break;
      case "/settings": await handleSettings(chatId, telegramUserId, args); break;
      case "/unlink": await handleUnlink(chatId, telegramUserId); break;
      case "/stop": await handleStop(chatId, telegramUserId); break;
      default:
        if (command.startsWith("/")) await reply(chatId, "Use the buttons below to manage Daze.", { inline_keyboard: [[{ text: "Open Daze menu", callback_data: "home" }]] });
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
        allowed_updates: ["message", "callback_query"],
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
  await tgCall("setMyCommands", { commands: [
    { command: "start", description: "Open Daze" },
    { command: "link", description: "Link your wallet" },
    { command: "today", description: "Upcoming fixtures" },
    { command: "team", description: "Your team" },
    { command: "points", description: "Your points" },
    { command: "settings", description: "Notifications" },
  ] });
  log("Daze bot: schema ready.");
  log(`Daze bot: polling for updates (app=${APP_URL})`);
  await pollLoop();
}

main().catch((error) => { log("Daze bot crashed:", error); process.exitCode = 1; });
