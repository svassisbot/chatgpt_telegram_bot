export const cfg = {
  token: process.env.TELEGRAM_TOKEN!,
  sheetId: process.env.SHEET_ID!,
  adminId: process.env.ADMIN_TG_ID || "",
  reminderMin: Number(process.env.REMINDER_MINUTES || 30),
  tz: process.env.TZ || "Europe/Madrid",
  sa: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL!,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
  }
};