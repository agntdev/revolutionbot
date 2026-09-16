import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addEvent, cooldownText, join, notifyAdmin, formatNumber } from "../game.js";

const composer = new Composer<Ctx>();
composer.on("message:text", async (ctx, next) => {
  if (ctx.message.text !== "انقلاب") return next();
  const id = ctx.from?.id;
  if (!id) { await ctx.reply("نتوانستم هویتت را بخوانم؛ دوباره تلاش کن."); return; }
  const result = join(ctx, id);
  if (result.blocked) { await ctx.reply(cooldownText(result.player)); return; }
  addEvent(ctx, "join", id);
  await ctx.reply(result.fresh ? `خوش آمدی! با ${formatNumber(2000)} طلا وارد بازی شدی.` : `دوباره زنده شدی! ${formatNumber(2000)} طلا گرفتی.`);
  if (result.fresh) await notifyAdmin(ctx, `بازیکن جدید: ${id} در گروه ${ctx.chat?.id ?? "private"}`);
});
export default composer;
