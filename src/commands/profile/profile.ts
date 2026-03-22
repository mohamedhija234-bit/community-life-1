import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, totalXpForLevel } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { generateProfileCard } from "../../lib/profileImage.js";

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View a member's profile card")
  .addUserOption(opt =>
    opt.setName("user").setDescription("The user to view (defaults to yourself)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser("user") ?? interaction.user;
  const guildId = interaction.guildId!;

  await getOrCreateUser(target.id, guildId, target.username);
  const user = await query(
    `SELECT * FROM users WHERE discord_id = $1 AND guild_id = $2`,
    [target.id, guildId]
  ).then(r => r.rows[0]);

  const [invResult, achResult, rankResult] = await Promise.all([
    query(
      `SELECT COUNT(*) as cnt FROM inventory WHERE discord_id = $1 AND guild_id = $2`,
      [target.id, guildId]
    ),
    query(
      `SELECT COUNT(*) as cnt FROM achievements WHERE discord_id = $1 AND guild_id = $2`,
      [target.id, guildId]
    ),
    query(
      `SELECT COUNT(*) + 1 as rank FROM users WHERE guild_id = $1 AND xp > (SELECT xp FROM users WHERE discord_id = $2 AND guild_id = $1)`,
      [guildId, target.id]
    ),
  ]);

  const level = parseInt(user.level);
  const xp = parseInt(user.xp);
  const currentLevelXp = totalXpForLevel(level);
  const nextLevelXp = totalXpForLevel(level + 1);
  const xpIntoLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;

  // Pick highest-resolution avatar, fallback to default avatar
  const avatarUrl =
    target.displayAvatarURL({ extension: "png", size: 256 }) ??
    `https://cdn.discordapp.com/embed/avatars/${parseInt(target.discriminator ?? "0") % 5}.png`;

  let imageBuffer: Buffer;
  try {
    imageBuffer = await generateProfileCard({
      username: target.username,
      avatarUrl,
      level,
      xp,
      xpIntoLevel,
      xpNeeded,
      coins: parseInt(user.coins),
      inventoryCount: parseInt(invResult.rows[0]?.cnt ?? "0"),
      achievementCount: parseInt(achResult.rows[0]?.cnt ?? "0"),
      memberSince: new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      rank: parseInt(rankResult.rows[0]?.rank ?? "1"),
    });
  } catch (err) {
    console.error("Profile image generation failed:", err);
    // Fallback to embed on canvas failure
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${target.username}'s Profile`)
        .setThumbnail(avatarUrl)
        .addFields(
          { name: "Level", value: `${level}`, inline: true },
          { name: "XP",    value: `${xp}`,    inline: true },
          { name: "Coins", value: `${parseInt(user.coins)}`, inline: true },
        )]
    });
    return;
  }

  const attachment = new AttachmentBuilder(imageBuffer, { name: "profile.png" });

  await interaction.editReply({ files: [attachment] });
}
