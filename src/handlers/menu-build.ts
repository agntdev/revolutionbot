import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getPlayer, groupKey, privateOnly, state, statsText } from "../game.js";

registerMainMenuItem({ label: "ساخت", data: "menu:build", order: 20 });
const composer = new Composer<Ctx>();
const buildMenu = inlineKeyboard([[inlineButton("ساخت تولیدی", "build:production"), inlineButton("ساخت پادگان", "build:barracks")], [inlineButton("لغو", "menu:main")]]);
composer.callbackQuery("menu:build", async (ctx) => { await ctx.answerCallbackQuery(); if (await privateOnly(ctx)) await ctx.reply("یک ساختمان انتخاب کن. تولیدی روزانه طلا می‌سازد و پادگان سرباز.", { reply_markup: buildMenu }); });
async function buy(ctx: Ctx, kind: "production" | "barracks", cost: number): Promise<void> {
  if (!(await privateOnly(ctx))) return;
  const p = getPlayer(ctx, ctx.from?.id ?? 0, groupKey(ctx));
  if (!p || p.state !== "active") { await ctx.reply("اول «انقلاب» را بفرست تا وارد بازی شوی."); return; }
  if (p.gold < cost) { await ctx.reply(`طلای کافی نداری؛ ${kind === "production" ? "تولیدی" : "پادگان"} ${cost === 500 ? "۵۰۰" : "۱۰۰۰"} طلا می‌خواهد.`); return; }
  p.gold -= cost; if (kind === "production") p.production++; else p.barracks++;
  await ctx.reply(`ساخت انجام شد.\n${statsText(p)}`, { reply_markup: inlineKeyboard([[inlineButton("ساخت دیگر", "menu:build"), inlineButton("⬅️ برگشت", "menu:main")]]) });
}
composer.callbackQuery("build:production", async (ctx) => { await ctx.answerCallbackQuery(); await buy(ctx, "production", 500); });
composer.callbackQuery("build:barracks", async (ctx) => { await ctx.answerCallbackQuery(); await buy(ctx, "barracks", 1000); });
export default composer;
