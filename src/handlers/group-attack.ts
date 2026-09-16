import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { addEvent, getPlayer, groupKey, isGroup, now, state } from "../game.js";

const composer = new Composer<Ctx>();
async function attack(ctx: Ctx): Promise<void> {
  if (!isGroup(ctx)) { await ctx.reply("حمله فقط در گروه انجام می‌شود."); return; }
  const targetId = ctx.message?.reply_to_message?.from?.id; const attackerId = ctx.from?.id;
  if (!targetId || !attackerId || targetId === attackerId) { await ctx.reply("برای حمله، به پیام بازیکن هدف پاسخ بده."); return; }
  const group = groupKey(ctx); const attacker = getPlayer(ctx, attackerId, group); const target = getPlayer(ctx, targetId, group);
  if (!attacker || !target) { await ctx.reply("این شخص هنوز وارد بازی نشده."); return; }
  if (attacker.state !== "active" || target.state !== "active") { await ctx.reply("فقط بازیکن‌های فعال می‌توانند وارد نبرد شوند."); return; }
  const a = attacker.soldiers; const t = target.soldiers; addEvent(ctx, "attack", attackerId, targetId);
  if (a > t) { target.state = "destroyed"; target.destroyedAt = now(); target.soldiers = 0; attacker.soldiers = a - t; await ctx.reply(`حمله موفق بود؛ ${attacker.name} پیروز شد و ${target.name} نابود شد. سربازان باقی‌مانده: ${attacker.soldiers}`); }
  else if (a < t) { attacker.state = "destroyed"; attacker.destroyedAt = now(); attacker.soldiers = 0; target.soldiers = t - a; await ctx.reply(`حمله شکست خورد؛ ${target.name} پیروز شد و ${attacker.name} نابود شد. سربازان باقی‌مانده: ${target.soldiers}`); }
  else { attacker.state = "destroyed"; attacker.destroyedAt = now(); attacker.soldiers = 0; target.state = "destroyed"; target.destroyedAt = now(); target.soldiers = 0; await ctx.reply("نبرد مساوی شد؛ هر دو بازیکن نابود شدند."); }
}
composer.on("message:text", async (ctx, next) => { if (ctx.message.text !== "حمله") return next(); await attack(ctx); });
composer.callbackQuery("group:attack", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply("در گروه، به پیام یک بازیکن پاسخ بده و «حمله» را بفرست."); });
export default composer;
