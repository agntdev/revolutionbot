import { Composer } from "grammy";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "انتقال X (reply with 'انتقال ۵۰۰')", data: "group:transfer" }) if the toolkit exposes it.

const composer = new Composer();

composer.callbackQuery("group:transfer", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Reply to target with 'انتقال {amount}' to transfer gold if sender has enough; announces transfer in group");
});

export default composer;
