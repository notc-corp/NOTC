"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/companies/telegram", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramChatId: chatId.trim() || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-1">Telegram Notifications</h2>
        <p className="text-sm text-slate-500 mb-4">
          Get instant alerts when a driver adds a receipt, completes a trip, or an anomaly is detected.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-700 space-y-2">
          <p className="font-medium">Setup instructions:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Open Telegram and message{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 underline"
              >
                @BotFather
              </a>
            </li>
            <li>Send <code className="bg-slate-200 px-1 rounded">/newbot</code> and follow the steps</li>
            <li>Copy the bot token and add it to your Vercel env as <code className="bg-slate-200 px-1 rounded">TELEGRAM_BOT_TOKEN</code></li>
            <li>
              Message{" "}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 underline"
              >
                @userinfobot
              </a>{" "}
              to get your Chat ID
            </li>
            <li>Paste your Chat ID below and save</li>
          </ol>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Your Telegram Chat ID
        </label>
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="e.g. 123456789"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </section>
    </div>
  );
}
