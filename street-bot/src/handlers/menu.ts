import TelegramBot from "node-telegram-bot-api";
import { getState, setState, appendBreak } from "../state.js";

export async function handleMenu(){ }

export async function handleBreakToggle(bot:TelegramBot, msg:TelegramBot.Message){
  const userId = String(msg.from?.id||"");
  const chatId = msg.chat.id;
  const st = await getState(userId);
  const t = Date.now();

  if (st.state !== "WORKING" && st.state !== "BREAK") {
    await bot.sendMessage(chatId, "Спочатку натисніть Start та зафіксуйте зміну.");
    return;
  }
  if (st.state === "WORKING") {
    await setState(userId, "BREAK", { ...st.payload, breakStart: t });
    await appendBreak(userId, t);
    await bot.sendMessage(chatId, "Пауза почата. Натисніть ще раз, коли закінчите.");
  } else {
    const start = st.payload?.breakStart || t;
    await setState(userId, "WORKING", { ...st.payload, breakStart: undefined });
    await appendBreak(userId, start, t);
    const mins = Math.round((t - start)/60000);
    await bot.sendMessage(chatId, `Пауза завершена. Тривалість ~${mins} хв.`);
  }
}