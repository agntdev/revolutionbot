import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { groupKey, privateOnly, state } from "../game.js";

registerMainMenuItem({ label: "وضعیت بازیکن‌ها", data: "menu:players_list", order: 30 });
const composer = new Composer<Ctx>();
composer.callbackQuery("menu:players_list", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!(await privateOnly(ctx))) return;
  const s = state(ctx); const ids = s.groups[groupKey(ctx)] ?? [];
  if (ids.length === 0) { await ctx.reply("هنوز بازیکنی وارد نشده — در گروه «انقلاب» را بفرست.", { reply_markup: inlineKeyboard([[inlineButton("⬅️ برگشت", "menu:main")]]) }); return; }
  const lines = ids.slice(0, 50).map((id) => { const p = s.players[`${groupKey(ctx)}:${id}`]; return p ? `${p.name} — ${p.state === "active" ? "فعال" : "نابود شده"}` : ""; }).filter(Boolean);
  const more = ids.length > 50 ? "\nفهرست به ۵۰ نفر اول محدود شده است." : "";
  await ctx.reply(`بازیکن‌های این گروه:\n${lines.join("\n")}${more}`, { reply_markup: inlineKeyboard([[inlineButton("⬅️ برگشت", "menu:main")]]) });
});
export default composer;
