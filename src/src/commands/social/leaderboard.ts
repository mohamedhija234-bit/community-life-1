import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { query } from "../../db/schema.js";
import { buildLeaderboardCard, toAttachment, type AccentKey } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View the server leaderboard")
  .addStringOption(opt =>
    opt.setName("type").setDescription("What to rank by").setRequired(true)
      .addChoices(
        { name: "XP",               value: "xp" },
        { name: "Coins",            value: "coins" },
        { name: "Level",            value: "level" },
        { name: "Quests Completed", value: "quests" },
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guildId = interaction.guildId!;
  const type    = interaction.options.getString("type", true);

  type RowData = { username: string; value: string | number };
  let rows: RowData[] = [];
  let title  = "";
  let accent: AccentKey = "blurple";

  if (type === "xp") {
    const res = await query(
      `SELECT username, xp AS value FROM users WHERE guild_id = $1 ORDER BY xp DESC LIMIT 10`, [guildId]
    );
    rows = res.rows; title = "✨ XP Leaderboard"; accent = "blurple";
  } else if (type === "coins") {
    const res = await query(
      `SELECT username, coins AS value FROM users WHERE guild_id = $1 ORDER BY coins DESC LIMIT 10`, [guildId]
    );
    rows = res.rows; title = "💰 Coins Leaderboard"; accent = "yellow";
  } else if (type === "level") {
    const res = await query(
      `SELECT username, level AS value FROM users WHERE guild_id = $1 ORDER BY level DESC, xp DESC LIMIT 10`, [guildId]
    );
    rows = res.rows; title = "📊 Level Leaderboard"; accent = "green";
  } else if (type === "quests") {
    const res = await query(
      `SELECT u.username, COUNT(q.id) AS value FROM users u
       LEFT JOIN quests q ON q.discord_id = u.discord_id AND q.guild_id = u.guild_id AND q.completed = TRUE
       WHERE u.guild_id = $1 GROUP BY u.username ORDER BY value DESC LIMIT 10`,
      [guildId]
    );
    rows = res.rows; title = "📋 Quests Leaderboard"; accent = "pink";
  }

  const leaderRows = rows.map((r, i) => ({
    rank: i + 1,
    username: r.username,
    value: String(r.value),
  }));

  const buf = await buildLeaderboardCard(title, leaderRows, accent);
  await interaction.editReply({ files: [toAttachment(buf)] });
}
