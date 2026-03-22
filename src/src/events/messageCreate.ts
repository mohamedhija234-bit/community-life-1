import type { Client, Message } from "discord.js";
import { getOrCreateUser, addXp, addCoins, checkAndAssignPerks } from "../lib/userUtils.js";
import { query } from "../db/schema.js";
import { incrementQuestProgress } from "../commands/profile/quest.js";

const XP_COOLDOWN_MS = 60_000; // 1 minute cooldown between XP gains from chat

export function registerMessageCreate(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot || !message.guildId) return;

    const discordId = message.author.id;
    const guildId = message.guildId;
    const username = message.author.username;

    await getOrCreateUser(discordId, guildId, username);

    // Check cooldown
    const userResult = await query(`SELECT last_xp_gain FROM users WHERE discord_id = $1 AND guild_id = $2`, [discordId, guildId]);
    const lastGain = userResult.rows[0]?.last_xp_gain ? new Date(userResult.rows[0].last_xp_gain).getTime() : 0;
    const now = Date.now();

    if (now - lastGain < XP_COOLDOWN_MS) return;

    const xpGain = Math.floor(Math.random() * 8) + 5;
    const coinsGain = Math.floor(Math.random() * 3) + 1;

    const { leveled, newLevel } = await addXp(discordId, guildId, xpGain);
    await addCoins(discordId, guildId, coinsGain);
    await incrementQuestProgress(discordId, guildId, "chat");

    if (leveled) {
      try {
        const member = await message.guild!.members.fetch(discordId);
        await checkAndAssignPerks(member, newLevel);
        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
          await message.channel.send(
            `🎉 **${username}** leveled up to **Level ${newLevel}**! Keep it up!`
          );
        }
      } catch {
        // Channel may not be accessible
      }
    }
  });
}
