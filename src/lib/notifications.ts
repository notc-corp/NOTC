import { db } from "@/lib/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegram(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // Notifications are best-effort — never crash the main flow
  }
}

async function getChatId(companyId: number | null | undefined): Promise<string | null> {
  if (!companyId) return null;
  const [company] = await db.select({ telegramChatId: companies.telegramChatId })
    .from(companies)
    .where(eq(companies.id, companyId));
  return company?.telegramChatId ?? null;
}

export async function notifyExpenseAdded(opts: {
  companyId: number | null | undefined;
  driverName: string;
  category: string;
  amountCents: number;
  stationName?: string | null;
}) {
  const chatId = await getChatId(opts.companyId);
  if (!chatId) return;

  const amount = `$${(opts.amountCents / 100).toFixed(2)}`;
  const station = opts.stationName ? ` at ${opts.stationName}` : "";
  await sendTelegram(
    chatId,
    `🧾 <b>New expense</b>\nDriver: ${opts.driverName}\nCategory: ${opts.category}\nAmount: ${amount}${station}`
  );
}

export async function notifyTripCompleted(opts: {
  companyId: number | null | undefined;
  driverName: string;
  miles: number | null;
  totalExpensesCents: number;
}) {
  const chatId = await getChatId(opts.companyId);
  if (!chatId) return;

  const miles = opts.miles != null ? `${opts.miles.toFixed(0)} mi` : "N/A";
  const total = `$${(opts.totalExpensesCents / 100).toFixed(2)}`;
  await sendTelegram(
    chatId,
    `✅ <b>Trip completed</b>\nDriver: ${opts.driverName}\nMiles: ${miles}\nExpenses: ${total}`
  );
}

export async function notifyLoginBlocked(opts: {
  companyId: number | null | undefined;
  driverName: string;
  username: string;
  lockDurationMins: number;
}) {
  const chatId = await getChatId(opts.companyId);
  if (!chatId) return;

  const duration = opts.lockDurationMins >= 60
    ? `${opts.lockDurationMins / 60} hour(s)`
    : `${opts.lockDurationMins} minutes`;

  await sendTelegram(
    chatId,
    `🔒 <b>Account locked</b>\nDriver: ${opts.driverName} (@${opts.username})\n5 wrong PIN attempts — blocked for ${duration}.\nUnlock in the Drivers panel if needed.`
  );
}

export async function notifyAnomaly(opts: {
  companyId: number | null | undefined;
  driverName: string;
  message: string;
  severity: "info" | "warning" | "critical";
}) {
  const chatId = await getChatId(opts.companyId);
  if (!chatId) return;

  const icon = opts.severity === "critical" ? "🚨" : opts.severity === "warning" ? "⚠️" : "ℹ️";
  await sendTelegram(
    chatId,
    `${icon} <b>Anomaly detected</b>\nDriver: ${opts.driverName}\n${opts.message}`
  );
}
