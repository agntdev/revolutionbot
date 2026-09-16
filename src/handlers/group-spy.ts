import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addEvent, getPlayer, groupKey, isGroup, statsText } from "../game.js";
const composer = new Composer<Ctx>();
composer.on("message:text", async (ctx, next) => {
  if (ctx.message.text !== "جاسوس") return next();
  if (!isGroup(ctx)) { await ctx.reply("جاسوسی فقط در گروه انجام می‌شود."); return; }
  const spyId = ctx.from?.id; const targetId = ctx.message.reply_to_message?.from?.id;
  if (!spyId || !targetId || spyId === targetId) { await ctx.reply("برای جاسوسی، به پیام بازیکن هدف پاسخ بده."); return; }
  const group = groupKey(ctx); const spy = getPlayer(ctx, spyId, group); const target = getPlayer(ctx, targetId, group);
  if (!spy || !target) { await ctx.reply("این شخص هنوز وارد بازی نشده."); return; }
  if (spy.state !== "active" || target.state !== "active") { await ctx.reply("فقط بازیکن‌های فعال را می‌شود زیر نظر گرفت."); return; }
  if (spy.gold < 1000) { await ctx.reply("برای جاسوسی ۱۰۰۰ طلا لازم داری."); return; }
  spy.gold -= 1000; addEvent(ctx, "spy", spyId, targetId);
  try { await ctx.api.sendMessage(spyId, `گزارش جاسوسی از ${target.name}\n${statsText(target)}`); } catch { await ctx.reply("گزارش خصوصی ارسال نشد؛ اول در گفت‌وگوی خصوصی با من /start را بزن."); return; }
  await ctx.reply("جاسوسی انجام شد");
});
composer.callbackQuery("group:spy", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply("در گروه به پیام بازیکن پاسخ بده و «جاسوس» را بفرست."); });
export default composer;
