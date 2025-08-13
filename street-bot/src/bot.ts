import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import { cfg } from "./config.js";
import { ensureSheets } from "./google/sheets.js";
import { handleStart } from "./handlers/start.js";
import { handleMenu, handleBreakToggle } from "./handlers/menu.js";
import { handleSupport } from "./handlers/support.js";
import { handleFinishWizard } from "./handlers/finish.js";
import { reminderTick } from "./state.js";

export async function startBot() {
  await ensureSheets();
  const bot = new TelegramBot(cfg.token, { polling: true });

  bot.onText(/^\/start|^start$/i, (msg) => handleStart(bot, msg));
  bot.on("location", (msg) => handleStart(bot, msg, { locationOnly: true }));

  bot.on("document", (msg) => handleStart(bot, msg, { document: true }));
  bot.on("photo", (msg) => handleStart(bot, msg, { photo: true }));

  bot.onText(/^Дощ|^Перекур$/i, (msg) => handleBreakToggle(bot, msg));
  bot.onText(/^Support$/i, (msg) => handleSupport(bot, msg));
  bot.onText(/^Завершити$/i, (msg) => handleFinishWizard(bot, msg));

  bot.onText(/^\/ping$/i, (m) => bot.sendMessage(m.chat.id, "pong ✅"));
  bot.onText(/^\/where$/i, async (m) => {
    if (String(m.from?.id) !== String(cfg.adminId)) return;
    const link = `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/edit`;
    await bot.sendMessage(m.chat.id, `📄 Таблиця: ${link}`);
  });

  cron.schedule("* * * * *", () => reminderTick(bot));

  console.log("Bot started");
}