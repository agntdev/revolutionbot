import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem, requireOwner } from "../toolkit/index.js";
import { addEvent, formatNumber, state } from "../game.js";

registerMainMenuItem({ label: "مدیریت", data: "admin:menu", order: 90 });
const composer = new Composer<Ctx>();
composer.callbackQuery("admin:menu", async (ctx) => { await ctx.answerCallbackQuery(); if (await requireOwner(ctx)) await ctx.reply("ابزارهای مدیریت را انتخاب کن.", { reply_markup: inlineKeyboard([[inlineButton("اجرای روزانه", "admin:cron"), inlineButton("خروجی بازی", "admin:export")], [inlineButton("⬅️ برگشت", "menu:main")]]) }); });
composer.callbackQuery("admin:cron", async (ctx) => {
  await ctx.answerCallbackQuery(); if (!(await requireOwner(ctx))) return;
  const s = state(ctx); let changed = 0;
  for (const p of Object.values(s.players)) if (p.state === "active") { p.gold += p.production * 100; p.soldiers += p.barracks * 10; changed++; }
  addEvent(ctx, "cron", ctx.from.id); await ctx.reply(`افزایش روزانه انجام شد؛ ${formatNumber(changed)} بازیکن فعال به‌روزرسانی شد.`);
});
composer.callbackQuery("admin:export", async (ctx) => {
  await ctx.answerCallbackQuery(); if (!(await requireOwner(ctx))) return;
  const s = state(ctx); const active = Object.values(s.players).filter((p) => p.state === "active").length;
  await ctx.reply(`خلاصه بازی\nبازیکن‌ها: ${formatNumber(Object.keys(s.players).length)}\nفعال: ${formatNumber(active)}\nرویدادها: ${formatNumber(s.events.length)}`);
});
export default composer;
