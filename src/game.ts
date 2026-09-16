import type { Context } from "grammy";
import type { Ctx } from "./bot.js";
import { adminChatId } from "./toolkit/index.js";

export type PlayerState = "active" | "destroyed";
export interface Player {
  id: number;
  name: string;
  state: PlayerState;
  destroyedAt: number | null;
  gold: number;
  soldiers: number;
  production: number;
  barracks: number;
  joinedAt: number;
}
export interface GameState {
  players: Record<string, Player>;
  groups: Record<string, string[]>;
  events: Array<{ type: string; actor: number; target?: number; at: number }>;
}

// One seam for all game time. Tests and recovery tooling can replace this.
let clock: () => number = () => Date.now();
export const now = (): number => clock();
export function setGameClock(next: (() => number) | undefined): void {
  clock = next ?? (() => Date.now());
}

export function groupKey(ctx: Context): string {
  return String(ctx.chat?.id ?? "private");
}
export function isGroup(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}
export function state(ctx: Ctx): GameState {
  const session = ctx.session as typeof ctx.session & { game?: GameState };
  if (!session.game) session.game = { players: {}, groups: {}, events: [] };
  return session.game;
}
export function playerKey(group: string, id: number): string {
  return `${group}:${id}`;
}
export function getPlayer(ctx: Ctx, id: number, group = groupKey(ctx)): Player | undefined {
  return state(ctx).players[playerKey(group, id)];
}
export function addEvent(ctx: Ctx, type: string, actor: number, target?: number): void {
  state(ctx).events.push({ type, actor, target, at: now() });
}
export function addToGroup(ctx: Ctx, group: string, id: number): void {
  const s = state(ctx);
  const ids = (s.groups[group] ??= []);
  const key = String(id);
  if (!ids.includes(key)) ids.push(key);
}
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
export function formatNumber(n: number): string {
  return String(Math.trunc(n)).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
export function displayName(ctx: Context): string {
  const f = ctx.from;
  return f?.first_name ?? "بازیکن";
}
export function statsText(p: Player): string {
  return `وضعیت شما\nتولیدی: ${formatNumber(p.production)}\nپادگان: ${formatNumber(p.barracks)}\nسرباز: ${formatNumber(p.soldiers)}\nطلا: ${formatNumber(p.gold)}`;
}
export function cooldownText(p: Player): string {
  const left = Math.max(0, 5 * 24 * 60 * 60 * 1000 - (now() - (p.destroyedAt ?? now())));
  const days = Math.ceil(left / (24 * 60 * 60 * 1000));
  return `هنوز نمی‌شود برگشت؛ ${formatNumber(days)} روز دیگر دوباره تلاش کن.`;
}
export async function notifyAdmin(ctx: Ctx, text: string): Promise<void> {
  const id = adminChatId(ctx as unknown as { env?: Record<string, unknown> | null });
  if (!id) return;
  try { await ctx.api.sendMessage(id, text); } catch { /* an unavailable owner must not break a game */ }
}
export async function privateOnly(ctx: Ctx): Promise<boolean> {
  if (ctx.chat?.type === "private") return true;
  await ctx.reply("این بخش را در گفت‌وگوی خصوصی با من باز کن.");
  return false;
}
export function activePlayer(ctx: Ctx, id: number, group = groupKey(ctx)): Player | undefined {
  const p = getPlayer(ctx, id, group);
  return p?.state === "active" ? p : undefined;
}
export function ensurePlayer(ctx: Ctx, id: number, group = groupKey(ctx)): Player {
  const s = state(ctx);
  const key = playerKey(group, id);
  const existing = s.players[key];
  if (existing) return existing;
  const p: Player = { id, name: displayName(ctx), state: "active", destroyedAt: null, gold: 2000, soldiers: 0, production: 0, barracks: 0, joinedAt: now() };
  s.players[key] = p;
  addToGroup(ctx, group, id);
  return p;
}
export function join(ctx: Ctx, id: number): { player: Player; fresh: boolean; blocked: boolean } {
  const group = groupKey(ctx);
  const existing = getPlayer(ctx, id, group);
  if (existing?.state === "active") return { player: existing, fresh: false, blocked: false };
  if (existing && existing.destroyedAt !== null && now() - existing.destroyedAt <= 5 * 24 * 60 * 60 * 1000) return { player: existing, fresh: false, blocked: true };
  if (existing) { existing.state = "active"; existing.destroyedAt = null; existing.gold = 2000; existing.soldiers = 0; existing.production = 0; existing.barracks = 0; existing.joinedAt = now(); return { player: existing, fresh: false, blocked: false }; }
  return { player: ensurePlayer(ctx, id, group), fresh: true, blocked: false };
}
