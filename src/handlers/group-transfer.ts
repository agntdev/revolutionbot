import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addEvent, formatNumber, getPlayer, groupKey, isGroup, normalizeDigits } from "../game.js";
const composer = new Composer<Ctx>();
composer.on("message:text", async (ctx, next) => {
  const m = /^انتقال\s+([۰-۹٠-٩\d]+)$/.exec(ctx.message.text.trim()); if (!m) return next();
  if (!isGroup(ctx)) { await ctx.reply("انتقال طلا فقط در گروه انجام می‌شود."); return; }
  const amount = Number(normalizeDigits(m[1])); const fromId = ctx.from?.id; const toId = ctx.message.reply_to_message?.from?.id;
  if (!fromId || !toId || !Number.isSafeInteger(amount) || amount <= 0) { await ctx.reply("برای انتقال، به پیام بازیکن پاسخ بده و مبلغ مثبت بنویس."); return; }
  const group = groupKey(ctx); const from = getPlayer(ctx, fromId, group); const to = getPlayer(ctx, toId, group);
  if (!from || !to) { await ctx.reply("این شخص هنوز وارد بازی نشده."); return; }
  if (from.state !== "active" || to.state !== "active") { await ctx.reply("انتقال فقط بین بازیکن‌های فعال ممکن است."); return; }
  if (from.gold < amount) { await ctx.reply("طلای کافی نداری."); return; }
  from.gold -= amount; to.gold += amount; addEvent(ctx, "transfer", fromId, toId);
  await ctx.reply(`${formatNumber(amount)} طلا به ${to.name} منتقل شد.`);
});
composer.callbackQuery("group:transfer", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply("در گروه به پیام بازیکن پاسخ بده و «انتقال مبلغ» را بفرست."); });
export default composer;
