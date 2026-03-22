import { query } from "../db/schema.js";
import type { Guild, GuildMember } from "discord.js";

export async function getOrCreateUser(discordId: string, guildId: string, username: string) {
  await query(
    `INSERT INTO users (discord_id, guild_id, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (discord_id, guild_id) DO UPDATE SET username = $3`,
    [discordId, guildId, username]
  );
  const result = await query(
    `SELECT * FROM users WHERE discord_id = $1 AND guild_id = $2`,
    [discordId, guildId]
  );
  return result.rows[0];
}

export function xpForLevel(level: number): number {
  return level * 100;
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

export async function addXp(discordId: string, guildId: string, amount: number): Promise<{ leveled: boolean; newLevel: number }> {
  const user = await query(`SELECT * FROM users WHERE discord_id = $1 AND guild_id = $2`, [discordId, guildId]);
  if (user.rows.length === 0) return { leveled: false, newLevel: 1 };

  const u = user.rows[0];
  const newXp = parseInt(u.xp) + amount;
  let newLevel = parseInt(u.level);
  let leveled = false;

  while (newXp >= totalXpForLevel(newLevel + 1)) {
    newLevel++;
    leveled = true;
  }

  await query(
    `UPDATE users SET xp = $1, level = $2, last_xp_gain = NOW() WHERE discord_id = $3 AND guild_id = $4`,
    [newXp, newLevel, discordId, guildId]
  );

  return { leveled, newLevel };
}

export async function addCoins(discordId: string, guildId: string, amount: number) {
  await query(
    `UPDATE users SET coins = coins + $1 WHERE discord_id = $2 AND guild_id = $3`,
    [amount, discordId, guildId]
  );
}

export async function removeCoins(discordId: string, guildId: string, amount: number): Promise<boolean> {
  const user = await query(`SELECT coins FROM users WHERE discord_id = $1 AND guild_id = $2`, [discordId, guildId]);
  if (user.rows.length === 0 || parseInt(user.rows[0].coins) < amount) return false;
  await query(
    `UPDATE users SET coins = coins - $1 WHERE discord_id = $2 AND guild_id = $3`,
    [amount, discordId, guildId]
  );
  return true;
}

export async function addItem(discordId: string, guildId: string, itemName: string, quantity = 1) {
  await query(
    `INSERT INTO inventory (discord_id, guild_id, item_name, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (discord_id, guild_id, item_name) DO UPDATE SET quantity = inventory.quantity + $4`,
    [discordId, guildId, itemName, quantity]
  );
}

export async function removeItem(discordId: string, guildId: string, itemName: string, quantity = 1): Promise<boolean> {
  const inv = await query(
    `SELECT quantity FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name = $3`,
    [discordId, guildId, itemName]
  );
  if (inv.rows.length === 0 || parseInt(inv.rows[0].quantity) < quantity) return false;
  if (parseInt(inv.rows[0].quantity) === quantity) {
    await query(`DELETE FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name = $3`, [discordId, guildId, itemName]);
  } else {
    await query(
      `UPDATE inventory SET quantity = quantity - $1 WHERE discord_id = $2 AND guild_id = $3 AND item_name = $4`,
      [quantity, discordId, guildId, itemName]
    );
  }
  return true;
}

export async function grantAchievement(discordId: string, guildId: string, achievementName: string): Promise<boolean> {
  try {
    await query(
      `INSERT INTO achievements (discord_id, guild_id, achievement_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [discordId, guildId, achievementName]
    );
    return true;
  } catch {
    return false;
  }
}

export async function checkAndAssignPerks(member: GuildMember, level: number) {
  const perks = await query(
    `SELECT * FROM perks WHERE guild_id = $1 AND level_required <= $2 ORDER BY level_required ASC`,
    [member.guild.id, level]
  );
  for (const perk of perks.rows) {
    try {
      const role = member.guild.roles.cache.get(perk.role_id);
      if (role && !member.roles.cache.has(perk.role_id)) {
        await member.roles.add(role);
      }
    } catch {
      // Role may have been deleted or no permission
    }
  }
}

export function progressBar(current: number, max: number, length = 10): string {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}
