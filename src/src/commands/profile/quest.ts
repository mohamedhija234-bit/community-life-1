import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, addXp, addCoins } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { buildQuestCard, buildResultCard, toAttachment } from "../../lib/cardImage.js";
import { DAILY_QUESTS } from "../../lib/questData.js";

export const data = new SlashCommandBuilder()
  .setName("quest")
  .setDescription("View your current daily quests");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const { id: discordId, username } = interaction.user;
  const guildId = interaction.guildId!;

  await getOrCreateUser(discordId, guildId, username);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const quests = await query(
    `SELECT * FROM quests WHERE discord_id = $1 AND guild_id = $2 AND assigned_at >= $3 ORDER BY completed ASC, assigned_at DESC`,
    [discordId, guildId, today]
  );

  if (quests.rows.length === 0) {
    const buf = await buildResultCard({
      accent: "yellow",
      emoji: "📋",
      title: "No Quests Today",
      subtitle: "Use /daily to claim your reward and get a quest!",
    });
    await interaction.editReply({ files: [toAttachment(buf)] });
    return;
  }

  const questRows = quests.rows.map(q => {
    const template = DAILY_QUESTS.find(t => t.name === q.quest_name);
    return {
      name: q.quest_name,
      emoji: template?.emoji ?? "📌",
      progress: parseInt(q.progress),
      goal: parseInt(q.goal),
      rewardXp: parseInt(q.reward_xp),
      rewardCoins: parseInt(q.reward_coins),
      completed: q.completed,
    };
  });

  const buf = await buildQuestCard(username, questRows);
  await interaction.editReply({ files: [toAttachment(buf)] });
}

// ─── Quest progress helper (called by other commands) ─────────────────────
export async function incrementQuestProgress(
  discordId: string, guildId: string, questType: string, amount = 1
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const questMap: Record<string, string[]> = {
    chat:  ["Chat Champion", "Coin Collector"],
    fish:  ["Fisher's Daily"],
    dice:  ["Gambler's Luck"],
    buy:   ["Shop Spender"],
    duel:  ["Duel Master"],
    react: ["Reaction Rush"],
  };

  const targets = questMap[questType] ?? [];
  for (const questName of targets) {
    const result = await query(
      `SELECT * FROM quests WHERE discord_id = $1 AND guild_id = $2 AND quest_name = $3 AND assigned_at >= $4 AND completed = FALSE`,
      [discordId, guildId, questName, today]
    );
    if (result.rows.length > 0) {
      const quest = result.rows[0];
      const newProgress = Math.min(parseInt(quest.progress) + amount, parseInt(quest.goal));
      if (newProgress >= parseInt(quest.goal)) {
        await query(
          `UPDATE quests SET progress = $1, completed = TRUE, completed_at = NOW() WHERE id = $2`,
          [newProgress, quest.id]
        );
        await addXp(discordId, guildId, parseInt(quest.reward_xp));
        await addCoins(discordId, guildId, parseInt(quest.reward_coins));
      } else {
        await query(`UPDATE quests SET progress = $1 WHERE id = $2`, [newProgress, quest.id]);
      }
    }
  }
}
