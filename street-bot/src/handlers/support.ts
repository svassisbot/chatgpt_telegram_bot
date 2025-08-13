import TelegramBot from "node-telegram-bot-api";
import { getSettings } from "../google/sheets.js";
import { supportMenu } from "../utils/keyboards.js";

export async function handleSupport(bot:TelegramBot, msg:TelegramBot.Message){
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id||"");
  const u = (await getSettings()).find(s=>s.tg===userId);
  if (!u) return bot.sendMessage(chatId,"Вас немає в settings.");

  await bot.sendMessage(chatId, "Support:", { reply_markup: supportMenu });

  bot.once("message", async (m) => {
    const txt = (m.text||"").trim();
    if (txt === "Інструкція") {
      for (const f of (u.instructionFiles||[])) await bot.sendDocument(chatId, f);
    } else if (txt === "Зв’язок") {
      if (u.manager) await bot.sendMessage(chatId, `Зв’язок із менеджером: ${u.manager}`);
      else await bot.sendMessage(chatId, "Контакт менеджера не заданий.");
    } else if (txt === "Зауваження") {
      await bot.sendMessage(chatId, "Надішліть текст зауваження одним повідомленням.");
      bot.once("message", async (mm)=> {
        const note = (mm.text||"").trim();
        // Тут можна додати лог у events через Google Sheets
        try {
          const { append } = await import("../google/sheets.js");
          const { tsIso } = await import("../utils/time.js");
          await append("events", [tsIso(Date.now()), userId, u.worker, u.city, "note", note, "", "", "", "", "tg"]);
        } catch {}
        await bot.sendMessage(chatId, "Дякуємо, зафіксовано.");
      });
    } else {
      await bot.sendMessage(chatId, "⬅️ Повернення в меню зміни.");
    }
  });
}