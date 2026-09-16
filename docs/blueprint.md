# انقلاب — persistent group war — Bot specification

**Archetype:** community

**Voice:** warm and encouraging — write every user-facing message, button label, error, and empty state in this voice.

A Persian-language, persistent, turnless text war game that runs inside Telegram groups and private chats. Players join by sending «انقلاب», build production and barracks, attack, transfer gold, and spy. All player state is stored persistently; daily resource accrual runs at 12:00 Asia/Tehran.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Persian-speaking friend groups on Telegram
- Casual multiplayer gamers who want a lightweight persistent group game
- Group admins who host social games inside Telegram groups

## Success criteria

- Players can join by sending «انقلاب» and receive ۲۰۰۰ gold; join events recorded to persistence
- Private-menu in /start shows وضعیت, ساخت, وضعیت بازیکن‌ها and returns private-only player stats
- Build (تولیدی/پادگان) purchases deduct gold and increment buildings; insufficient-gold paths produce friendly Persian errors
- Group attack, transfer, and spy flows work when used as replies; attack resolution matches spec and announces results in group
- Daily cron at 12:00 Asia/Tehran reliably adds gold and soldiers to active players only
- Admin notifications delivered to ADMIN_CHAT_ID for new-player events and fatal errors

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main private menu (Persian) showing وضعیت، ساخت، وضعیت بازیکن‌ها
  - outputs: private menu message with inline buttons
- **وضعیت** (button, actor: user, callback: menu:status) — Show private player stats (production, barracks, soldiers, gold) — visible only to that player
  - outputs: private stats card
- **ساخت** (button, actor: user, callback: menu:build) — Open build submenu with ساخت تولیدی، ساخت پادگان، لغو
  - outputs: build submenu inline keyboard
- **وضعیت بازیکن‌ها** (button, actor: user, callback: menu:players_list) — List players who ever used «انقلاب» in this group (up to 50) marking active vs destroyed; visible in private
  - outputs: players list (private or group per spec)
- **Join — انقلاب** (message, actor: user, command: /plain message exact match) — User sends exactly «انقلاب» in group or private to join or resurrect after cooldown; grants ۲۰۰۰ gold and marks active
  - inputs: message text == 'انقلاب', sender Telegram id, chat id
  - outputs: join confirmation (in same chat), admin notification to ADMIN_CHAT_ID
- **حمله (reply with 'حمله')** (callback, actor: user, callback: group:attack) — Attacker replies to a target's message with text «حمله» in a group to resolve an attack; announces outcome in group
  - inputs: attacker id, target id (from replied message), attacker & target player records
  - outputs: group result announcement, player state updates persisted
- **انتقال X (reply with 'انتقال ۵۰۰')** (callback, actor: user, callback: group:transfer) — Reply to target with 'انتقال {amount}' to transfer gold if sender has enough; announces transfer in group
  - inputs: amount parsed from text, sender id, target id
  - outputs: group transfer announcement or private error to sender, player records updated
- **جاسوس (reply with 'جاسوس')** (callback, actor: user, callback: group:spy) — Reply to a target with «جاسوس» to pay ۱۰۰۰ gold and receive full target stats privately; group sees only 'جاسوسی انجام شد'
  - inputs: spy id, target id, spy gold check
  - outputs: private detailed spy report to spy, group short confirmation, player gold updated

## Flows

### Join / انقلاب
_Trigger:_ message exact 'انقلاب' in group or private

1. Validate sender Telegram id
2. Load or create Player record scoped to this group (assumption: per-group) or global per missing_fields
3. If player.state == destroyed and now < destroyed_at + 5 days -> reply with cooldown days remaining
4. If player.state == destroyed and cooldown elapsed -> reset stats to zero, set state active, grant ۲۰۰۰ gold, set joined_at
5. If new player -> create Player with ۲۰۰۰ gold and joined_at
6. Persist player record
7. Send confirmation message in same chat (group or private) in Persian
8. Notify ADMIN_CHAT_ID of new-player event

_Data touched:_ Player, Group, GameEvent

### Private menu: وضعیت
_Trigger:_ callback menu:status or /start + button

1. Verify chat is private — if not, instruct user to open a private chat
2. Load Player by Telegram id and group context
3. Render private stats (production_count, barracks_count, soldiers, gold)
4. Send as private message

_Data touched:_ Player

### Build purchase (تولیدی / پادگان)
_Trigger:_ callback from ساخت submenu

1. Confirm chat is private
2. Parse selected building type and cost (تولیدی=۵۰۰, پادگان=۱۰۰۰)
3. Load Player record and check gold >= cost
4. If insufficient -> send friendly Persian error
5. If sufficient -> deduct gold, increment corresponding building count, persist
6. Send confirmation message with updated counts

_Data touched:_ Player, GameEvent

### Attack (حمله)
_Trigger:_ reply in group with text 'حمله'

1. Ensure message is in group context
2. Resolve attacker id and target id from replied-to message
3. Verify both attacker and target are players in this group's game; if not, send friendly reminder
4. Compare attacker.soldiers vs target.soldiers
5. If attacker > target: target destroyed (state=destroyed, destroyed_at=now, soldiers=0), attacker.soldiers -= target_original_soldiers
6. If attacker < target: attacker destroyed (state=destroyed, destroyed_at=now, soldiers=0), target.soldiers -= attacker_original_soldiers
7. If tie: both destroyed
8. Persist updates atomically to avoid race conditions
9. Announce result in group in Persian with remaining soldiers for winner

_Data touched:_ Player, GameEvent

### Transfer gold (انتقال)
_Trigger:_ reply in group with text 'انتقال {amount}'

1. Parse amount from message and normalize numerals
2. Verify sender has enough gold
3. If insufficient -> private or reply error message
4. If sufficient -> subtract from sender, add to recipient, persist both records atomically
5. Announce transfer in group

_Data touched:_ Player, GameEvent

### Spy (جاسوس)
_Trigger:_ reply in group with text 'جاسوس'

1. Verify spy has >= ۱۰۰۰ gold
2. If insufficient -> friendly error
3. If sufficient -> deduct ۱۰۰۰ gold, persist
4. Send full target stats privately to spy (production, barracks, soldiers, gold)
5. Post only 'جاسوسی انجام شد' in group
6. Log event for auditing

_Data touched:_ Player, GameEvent

### Daily Cron — resource accrual
_Trigger:_ scheduled cron at 12:00 Asia/Tehran

1. Enumerate active players (per-group scope) in persistence
2. For each active player: add 100 gold per production_count and 10 soldiers per barracks_count
3. Persist per-player updates atomically; destroyed players receive no accrual
4. If errors occur, notify ADMIN_CHAT_ID with error details and context

_Data touched:_ Player, GameEvent

### Admin notifications & fatal error handling
_Trigger:_ new-player events or runtime/fatal errors

1. Format short Persian (or bilingual) admin message describing event
2. Send to ADMIN_CHAT_ID
3. Attach relevant player or group id and recent logs where permitted

_Data touched:_ GameEvent

## Owner-supplied settings

The OWNER provides these; they are collected in chat and injected into the environment at deploy. Read each one from the environment where it is used (`ctx.env.<KEY>` / `env.<KEY>` on Cloudflare Workers; `process.env.<KEY>` only as a Node/harness fallback — never the sole read). Do NOT invent your own way of learning the value, do NOT ask for it in a bot message, and do NOT hardcode a default.

- **ADMIN_CHAT_ID** — Owner/admin Telegram chat id that receives new-player and fatal error notifications
  - this is the OWNER's own chat id; the platform already knows it. Read `ADMIN_CHAT_ID` via `ctx.env` (prefer toolkit `adminChatId` / `requireOwner`) — never ask a user, never treat whoever writes first as the admin, never invent claim-admin or open manage for everyone.
  - may be UNSET at runtime: the bot must still start, and the feature needing ADMIN_CHAT_ID must say so plainly instead of failing.

Your behavioral specs run WITHOUT these values, so no spec may depend on one.

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

An entity that merely NAMES an owner-supplied setting above (an admin chat, an API account) is not something to store or discover — read it from the environment.

- **Player** _(retention: persistent)_ — Per-player persistent state (scoped by group unless owner confirms global scope)
  - fields: telegram_id, display_name, state (active|destroyed), destroyed_at (timestamp|null), gold (integer), soldiers (integer), production_count (integer), barracks_count (integer), joined_at (timestamp)
- **Group** _(retention: persistent)_ — Telegram group where the game runs; tracks known player ids and game event log pointers
  - fields: group_id, tracked_player_ids, created_at
- **GameEvent** _(retention: persistent)_ — Append-only log of join/attack/transfer/spy/build/cron events for auditing and conflict resolution
  - fields: event_id, type, actor_id, target_id, payload, timestamp
- **Session (ephemeral)** _(retention: session)_ — Temporary UI state for menus and multi-step confirmations while a user interacts privately
  - fields: user_id, step, payload, expires_at

## Integrations

- **Telegram** (required) — Bot API messaging, inline keyboards, callback queries, reply detection, group and private chat handling
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Provide ADMIN_CHAT_ID to receive notifications
- Manually trigger or replay daily cron (useful for recovery/testing)
- Export or dump persistent game state for backups
- Purge or wipe a specific group's game state
- Set or adjust simple config: timezone (default Asia/Tehran), max players list size (default 50)

## Notifications

- admin:new_player — when a new player joins via «انقلاب» (includes player id and group id)
- admin:fatal_error — when scheduled jobs or core flows hit unrecoverable errors with stack/log snippet
- group:action_announcement — attack/transfer/spy results posted in group per spec

## Permissions & privacy

- Player stats are private by default: shown only in private chat with the bot or privately to a spy who paid the cost
- Group announcements never include private numeric stats except the allowed winner-announcement format and transfer/spy short confirmations
- Persistent storage retains player state indefinitely until owner action (export/purge)
- ADMIN_CHAT_ID receives only administrative notifications (no private player stats included unless debugging with owner consent)

## Edge cases

- Concurrent attacks or transfers: require atomic updates and optimistic locking to avoid negative balances or inconsistent soldier counts
- Attacks and transfers against non-players produce friendly 'این شخص هنوز وارد بازی نشده' messages
- Destroyed players do not receive cron accruals; attempts to act while destroyed either show cooldown or resurrection flow
- Numeral normalization: incoming Persian/Arabic/Western numerals must be parsed (e.g., '۵۰۰' and '500')
- Bot removed from group or group chat permissions changed: detect and pause per-group cron and notify ADMIN_CHAT_ID
- Large groups >50 players: players list truncation with instruction to use internal list or pagination
- Timezone drift: ensure cron runs at 12:00 Asia/Tehran consistently (owner may change timezone)
- Race when destroyed-at boundary equals resurrection attempt time — treat cooldown as strictly > 5*24h since destroyed_at

## Required tests

- Dialog-level acceptance: new user joins via 'انقلاب' in group and receives ۲۰۰۰ gold and admin notification
- Private menu: /start shows buttons and 'وضعیت' returns private-only stats
- Build purchase: buy تولیدی (۵۰۰) and پادگان (۱۰۰۰) with sufficient and insufficient gold paths
- Attack resolution: attacker>target, attacker<target, tie — verify state changes, destroyed_at set, announcements
- Transfer: successful and insufficient-funds cases; atomic updates of both players
- Spy: cost deducted, full stats delivered privately to spy, group sees only 'جاسوسی انجام شد'
- Daily cron: at simulated 12:00 Asia/Tehran add correct gold/soldiers to active players and skip destroyed
- Cooldown/resurrection: destroyed player within 5 days blocked; after 5 days 'انقلاب' resets stats and grants ۲۰۰۰
- Concurrency test: simultaneous transfers/attacks against same target handled without data corruption

## Assumptions

- Game state is scoped per Telegram group by default (players and their stats are per-group). Owner must confirm if a global cross-group player model is desired
- Joining via 'انقلاب' is allowed both in groups and in private chats and grants ۲۰۰۰ gold
- Costs and grants: production=۵۰۰, barracks=۱۰۰۰, spy=۱۰۰۰, starting grant=۲۰۰۰; daily accrual: +100 gold per production, +10 soldiers per barracks
- Destroyed-to-resurrect: 5-day cooldown from destroyed_at; resurrection resets stats to zero and grants ۲۰۰۰ gold
- Language for all UX messages is Persian and uses a warm, encouraging tone
- Max displayed players in list = 50; larger groups are truncated with guidance
