import { google } from "googleapis";
import { cfg } from "../config.js";

let auth: any;
const sheets = google.sheets("v4");
autoInitAuth();

function autoInitAuth(){
  auth = new google.auth.JWT(cfg.sa.client_email, undefined, cfg.sa.private_key, [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ]);
}

export async function ensureSheets() {
  const need = {
    settings: ["Worker","City","TelegramID","PhotosFolder","ManagerContact","InstructionFiles"],
    events:   ["ts","user_id","worker","city","type","data","fileId","driveFileId","lat","lng","source"],
    shifts:   ["date","user_id","worker","city","start_ts","start_lat","start_lng","end_ts","work_sec","break_sec","cash","consumables","note","drive_folder"],
    breaks:   ["date","user_id","break_start_ts","break_end_ts","dur_sec"],
    state:    ["user_id","state","payload_json","last_ts"]
  } as const;
  for (const [sheetName, header] of Object.entries(need)) {
    try {
      await sheets.spreadsheets.values.get({ auth, spreadsheetId: cfg.sheetId, range: `${sheetName}!A1:Z1` });
    } catch {
      await sheets.spreadsheets.batchUpdate({
        auth, spreadsheetId: cfg.sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
      });
      await sheets.spreadsheets.values.update({
        auth, spreadsheetId: cfg.sheetId, range: `${sheetName}!A1:${col(header.length)}1`,
        valueInputOption: "RAW", requestBody: { values: [header] }
      });
    }
  }
}

export async function getSettings() {
  const res = await sheets.spreadsheets.values.get({ auth, spreadsheetId: cfg.sheetId, range: `settings!A1:Z999` });
  const rows = res.data.values || [];
  const header = rows[0]?.map((h: string)=>h.trim().toLowerCase()) || [];
  const idx = (name: string) => header.indexOf(name.toLowerCase());
  return rows.slice(1).map(r => ({
    worker: r[idx("worker")] || "",
    city: r[idx("city")] || "",
    tg: String(r[idx("telegramid")] || "").trim(),
    folder: r[idx("photosfolder")] || "",
    manager: r[idx("managercontact")] || "",
    instructionFiles: (r[idx("instructionfiles")] || "").split(",").map((s:string)=>s.trim()).filter(Boolean)
  }));
}

export async function append(sheet: string, row: any[]) {
  await sheets.spreadsheets.values.append({
    auth, spreadsheetId: cfg.sheetId, range: `${sheet}!A1`,
    valueInputOption: "RAW", requestBody: { values: [row] }
  });
}

export async function upsertState(user_id: string, state: string, payload: any) {
  const res = await sheets.spreadsheets.values.get({ auth, spreadsheetId: cfg.sheetId, range: `state!A2:D9999` });
  const data = res.data.values || [];
  const rowIndex = data.findIndex(r => String(r[0]) === String(user_id));
  const now = Date.now().toString();
  const values = [[user_id, state, JSON.stringify(payload||{}), now]];
  if (rowIndex === -1) {
    await append("state", values[0]);
  } else {
    await sheets.spreadsheets.values.update({
      auth, spreadsheetId: cfg.sheetId, range: `state!A${rowIndex+2}:D${rowIndex+2}`,
      valueInputOption: "RAW", requestBody: { values }
    });
  }
}

export async function readState(user_id: string) {
  const res = await sheets.spreadsheets.values.get({ auth, spreadsheetId: cfg.sheetId, range: `state!A2:D9999` });
  const row = (res.data.values || []).find(r => String(r[0]) === String(user_id));
  if (!row) return { state: "IDLE", payload: {} as any, last: 0 };
  return { state: row[1] || "IDLE", payload: safeJSON(row[2]), last: Number(row[3] || 0) };
}

export async function sumBreakSeconds(date: string, user_id: string): Promise<number> {
  const res = await sheets.spreadsheets.values.get({ auth, spreadsheetId: cfg.sheetId, range: `breaks!A2:E9999` });
  const rows = res.data.values || [];
  let sum = 0;
  for (const r of rows) {
    if (!r || r.length < 5) continue;
    if (String(r[0]) !== date) continue;
    if (String(r[1]) !== String(user_id)) continue;
    const dur = Number(r[4] || 0);
    if (isFinite(dur)) sum += dur;
  }
  return sum;
}

export async function updateShiftFinish(user_id: string, endTs: number, workSec: number, breakSec: number, cash: number|string, cons: string, note: string){
  const res = await sheets.spreadsheets.values.get({ auth, spreadsheetId: cfg.sheetId, range: `shifts!A2:N9999` });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => String(r[1]) === String(user_id) && (!r[7] || String(r[7]).trim()===""));
  if (idx === -1) {
    // якщо не знайшли активний рядок — не падаємо, просто додаємо новий (fallback)
    await append("shifts", [new Date(endTs).toISOString().slice(0,10), user_id, "", "", "", "", "", endTs, workSec, breakSec, cash, cons, note, ""]);
    return;
  }
  const rowNumber = idx + 2; // бо починали з A2
  await sheets.spreadsheets.values.update({
    auth, spreadsheetId: cfg.sheetId, range: `shifts!H${rowNumber}:M${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[endTs, workSec, breakSec, cash, cons, note]] }
  });
}

function safeJSON(s?: string){ try { return s? JSON.parse(s):{} } catch { return {} } }
function col(n:number){ const A="ABCDEFGHIJKLMNOPQRSTUVWXYZ"; let s=""; while(n>0){ s=A[(n-1)%26]+s; n=Math.floor((n-1)/26);} return s; }