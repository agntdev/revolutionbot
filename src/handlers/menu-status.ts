import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getPlayer, groupKey, privateOnly, statsText } from "../game.js";

registerMainMenuItem({ label: "وضعیت", data: "menu:status", order: 10 });
const composer = new Composer<Ctx>();
composer.callbackQuery("menu:status", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await privateOnly(ctx))) return;
  const p = getPlayer(ctx, ctx.from.id, groupKey(ctx));
  await ctx.reply(p ? statsText(p) : "هنوز وارد بازی نشده‌ای. در یک گروه یا همین‌جا «انقلاب» را بفرست.", { reply_markup: inlineKeyboard([[inlineButton("⬅️ برگشت", "menu:main")]]) });
});
export default composer;
