import TelegramBot from "node-telegram-bot-api";
import { append, readState, upsertState } from "./google/sheets.js";
import { today } from "./utils/time.js";
import { cfg } from "./config.js";

export type UserState = "IDLE"|"WAIT_PHOTO"|"WORKING"|"BREAK"|"FINISH_CASH"|"FINISH_CONS"|"FINISH_NOTE"|"FINISH_PENDING";

export async function setState(user_id:string, state:UserState, payload:any={}) {
  await upsertState(user_id, state, payload);
}
export async function getState(user_id:string){
  return await readState(user_id);
}

export async function reminderTick(bot: TelegramBot){
  const st = await readState(String(cfg.adminId));
  return;
}

export async function logEvent(row:any[]){
  await append("events", row);
}
export async function appendBreak(user_id:string, start:number, end?:number){
  const dur = end ? Math.max(0, Math.floor((end-start)/1000)) : 0;
  await append("breaks", [today(), user_id, start, end||"", dur]);
}