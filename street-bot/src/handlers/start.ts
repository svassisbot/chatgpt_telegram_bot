import TelegramBot from "node-telegram-bot-api";
import { cfg } from "../config.js";
import { getSettings, append } from "../google/sheets.js";
import { saveTelegramFileToDrive } from "../google/drive.js";
import { gpsFromBuffer } from "../utils/exif.js";
import { mainMenu, shiftMenu } from "../utils/keyboards.js";
import { now, tsIso, today } from "../utils/time.js";
import { getState, setState, logEvent } from "../state.js";

export async function handleStart(bot:TelegramBot, msg:TelegramBot.Message, flags?:{document?:boolean, photo?:boolean, locationOnly?:boolean}){
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id||"");
  const settings = await getSettings();
  const u = settings.find(s => s.tg === userId);
  if (!u) {
    await bot.sendMessage(chatId, "Ви не зареєстровані у системі.");
    return;
  }

  if (!flags || (!flags.document && !flags.photo && !flags.locationOnly)) {
    await setState(userId, "WAIT_PHOTO", {});
    await bot.sendMessage(chatId,
      "Вітаю! Надішліть свіже фото як документ з увімкненою геолокацією або поділіться геопозицією.",
      { parse_mode:"Markdown", reply_markup: mainMenu });
    return;
  }

  if (flags.locationOnly && msg.location) {
    const startTs = now();
    await setState(userId, "WORKING", { startTs, lat: msg.location.latitude, lng: msg.location.longitude });
    await append("shifts", [today(), userId, u.worker, u.city, startTs, msg.location.latitude, msg.location.longitude, "", "", "", "", "", "", u.folder]);
    await logEvent([tsIso(startTs), userId, u.worker, u.city, "start", "tg_location", "", "", msg.location.latitude, msg.location.longitude, "tg"]);
    await bot.sendMessage(chatId, "Початок зміни зафіксовано ✅", { reply_markup: shiftMenu });
    return;
  }

  const fileId = flags?.document ? msg.document?.file_id : msg.photo?.slice(-1)[0]?.file_id;
  if (!fileId) return;
  const file = await bot.getFile(fileId);
  const link = `https://api.telegram.org/file/bot${cfg.token}/${file.file_path}`;

  if (!u.folder) { await bot.sendMessage(chatId, "У вашому профілі порожній PhotosFolder."); return; }

  const filename = `${today()}_${u.worker}_${Date.now()}.jpg`;
  const { fileId: driveFileId, buf } = await saveTelegramFileToDrive(link, filename, u.folder);

  const gps = gpsFromBuffer(buf);
  if (!gps) {
    await setState(userId, "WAIT_PHOTO", {});
    await logEvent([tsIso(now()), userId, u.worker, u.city, "photo_saved", filename, fileId, driveFileId, "", "", "tg"]);
    await bot.sendMessage(chatId, "Фото збережено, але геоміток немає. Надішліть геопозицію через скріпку → Location.", { parse_mode:"Markdown" });
    return;
  }

  const startTs = now();
  await setState(userId, "WORKING", { startTs, lat: gps.lat, lng: gps.lng });
  await append("shifts", [today(), userId, u.worker, u.city, startTs, gps.lat, gps.lng, "", "", "", "", "", "", u.folder]);
  await logEvent([tsIso(startTs), userId, u.worker, u.city, "start", "exif", fileId, driveFileId, gps.lat, gps.lng, "exif"]);

  await bot.sendMessage(chatId, "Початок зміни зафіксовано ✅", { reply_markup: shiftMenu });
}