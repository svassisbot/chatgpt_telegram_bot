import TelegramBot from "node-telegram-bot-api";
import { getSettings, readState, sumBreakSeconds, updateShiftFinish } from "../google/sheets.js";
import { setState, logEvent } from "../state.js";
import { today, now, tsIso } from "../utils/time.js";
import { cfg } from "../config.js";

export async function handleFinishWizard(bot:TelegramBot, msg:TelegramBot.Message){
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id||"");
  const st = await readState(userId);
  if (st.state !== "WORKING" && st.state !== "BREAK") {
    await bot.sendMessage(chatId, "Зміна не активна. Спочатку Start.");
    return;
  }

  if (st.state === "BREAK" && st.payload?.breakStart) {
    st.payload.breakStart = undefined;
    await setState(userId, "WORKING", { ...st.payload });
  }

  await setState(userId, "FINISH_CASH", { ...st.payload });
  await bot.sendMessage(chatId, "Крок 1/3. Вкажіть касу за сьогодні (число).");

  const remindInMs = cfg.reminderMin * 60_000;
  setTimeout(async ()=>{
    const cur = await readState(userId);
    if ((cur.state || "").startsWith("FINISH_"))
      await bot.sendMessage(chatId, "Нагадування: завершіть звіт (каса/розхідники/коментар).");
  }, remindInMs);

  bot.once("message", async (m1)=>{
    const cash = Number((m1.text||"").trim().replace(",","."));
    await setState(userId, "FINISH_CONS", { ...st.payload, cash });
    await bot.sendMessage(chatId, "Крок 2/3. Розхідники (текст/число).");

    bot.once("message", async (m2)=>{
      const cons = (m2.text||"").trim();
      await setState(userId, "FINISH_NOTE", { ...st.payload, cash, cons });
      await bot.sendMessage(chatId, "Крок 3/3. Коментар дня (можна ‘—’).");

      bot.once("message", async (m3)=>{
        const note = (m3.text||"—").trim();
        const endTs = now();
        const u = (await getSettings()).find(s=>s.tg===userId);
        if (!u) return;

        const startTs = Number(st.payload.startTs);
        const breakSec = await sumBreakSeconds(today(), userId);
        const workSec = Math.max(0, Math.floor((endTs - startTs)/1000) - breakSec);
        await updateShiftFinish(userId, endTs, workSec, breakSec, cash, cons, note);
        await logEvent([tsIso(endTs), userId, u.worker, u.city, "finish", "", "", "", "", "", ""]);

        await setState(userId, "IDLE", {});
        await bot.sendMessage(chatId, "Дякуємо за робочий день! ✅");
      });
    });
  });
}