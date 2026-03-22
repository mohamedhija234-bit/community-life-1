import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, addXp, addCoins, grantAchievement } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { getRandomQuest } from "../../lib/questData.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Claim your daily reward (resets every 24 hours)");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const { id: discordId, username } = interaction.user;
  const guildId = interaction.guildId!;

  await getOrCreateUser(discordId, guildId, username);
  const userResult = await query(
    `SELECT last_daily FROM users WHERE discord_id = $1 AND guild_id = $2`,
    [discordId, guildId]
  );
  const user = userResult.rows[0];

  if (user.last_daily) {
    const diff = Date.now() - new Date(user.last_daily).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) {
      const remaining = 24 - hours;
      const hh = Math.floor(remaining);
      const mm = Math.floor((remaining - hh) * 60);
      const buf = await buildResultCard({
        accent: "red",
        emoji: "⏰",
        title: "Already Claimed!",
        subtitle: `Come back in ${hh}h ${mm}m for your next reward.`,
        footer: "Daily rewards reset every 24 hours",
      });
      await interaction.editReply({ files: [toAttachment(buf)] });
      return;
    }
  }

  const xpGain = Math.floor(Math.random() * 30) + 40;
  const coinsGain = Math.floor(Math.random() * 40) + 60;

  await addXp(discordId, guildId, xpGain);
  await addCoins(discordId, guildId, coinsGain);
  await query(
    `UPDATE users SET last_daily = NOW() WHERE discord_id = $1 AND guild_id = $2`,
    [discordId, guildId]
  );

  // Assign a daily quest
  const quest = getRandomQuest();
  await query(
    `INSERT INTO quests (discord_id, guild_id, quest_name, goal, reward_xp, reward_coins)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
    [discordId, guildId, quest.name, quest.goal, quest.rewardXp, quest.rewardCoins]
  );

  await grantAchievement(discordId, guildId, "First Daily Claim");

  const buf = await buildResultCard({
    accent: "green",
    emoji: "🎁",
    title: "Daily Reward Claimed!",
    subtitle: username,
    fields: [
      { label: "XP Gained",    value: `+${xpGain}`,    color: "#57F287" },
      { label: "Coins Gained", value: `+${coinsGain}`, color: "#FEE75C" },
    ],
    bodyLines: [
      `New quest: ${quest.emoji} ${quest.name}`,
      quest.description,
      `Reward: +${quest.rewardXp} XP  +${quest.rewardCoins} coins`,
    ],
    footer: "Come back in 24 hours for your next reward!",
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
