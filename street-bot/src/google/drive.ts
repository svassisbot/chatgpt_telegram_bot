import { google } from "googleapis";
import fetch from "node-fetch";
import { cfg } from "../config.js";
import { Readable } from "stream";

const drive = google.drive("v3");
const auth = new google.auth.JWT(cfg.sa.client_email, undefined, cfg.sa.private_key, ["https://www.googleapis.com/auth/drive"]);

export async function saveTelegramFileToDrive(fileUrl: string, filename: string, folderId: string) {
  const buf = Buffer.from(await (await fetch(fileUrl)).arrayBuffer());
  const res = await drive.files.create({
    auth,
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: "image/jpeg", body: BufferToStream(buf) }
  });
  return { fileId: res.data.id!, buf };
}

function BufferToStream(buffer: Buffer){
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}