import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { buildInventoryCard, toAttachment } from "../../lib/cardImage.js";
import { SHOP_ITEMS } from "../../lib/shopData.js";

// Emoji lookup — crafted items get a default gem
const ITEM_EMOJI: Record<string, string> = {};
for (const item of SHOP_ITEMS) ITEM_EMOJI[item.name] = item.emoji;

const CRAFTED_EMOJI: Record<string, string> = {
  "Iron Sword": "🗡️",
  "Enchanted Shield": "🔮",
  "Master Bait": "✨",
  "Dragon Sword": "🔥",
  "Small Fish": "🐟",
  "Medium Fish": "🐠",
  "Salmon": "🐟",
  "Lobster": "🦞",
  "Treasure Chest": "💰",
  "Golden Fish": "✨",
};

function getEmoji(name: string): string {
  return ITEM_EMOJI[name] ?? CRAFTED_EMOJI[name] ?? "📦";
}

export const data = new SlashCommandBuilder()
  .setName("inventory")
  .setDescription("View your inventory")
  .addUserOption(opt =>
    opt.setName("user").setDescription("User to view (defaults to yourself)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const target = interaction.options.getUser("user") ?? interaction.user;
  const guildId = interaction.guildId!;

  await getOrCreateUser(target.id, guildId, target.username);

  const [invResult, userResult] = await Promise.all([
    query(
      `SELECT item_name, quantity FROM inventory WHERE discord_id = $1 AND guild_id = $2 ORDER BY item_name`,
      [target.id, guildId]
    ),
    query(
      `SELECT coins FROM users WHERE discord_id = $1 AND guild_id = $2`,
      [target.id, guildId]
    ),
  ]);

  const items = invResult.rows.map(r => ({
    name: r.item_name,
    emoji: getEmoji(r.item_name),
    quantity: parseInt(r.quantity),
  }));

  const coins = parseInt(userResult.rows[0]?.coins ?? "0");
  const avatarUrl = target.displayAvatarURL({ extension: "png", size: 64 });

  const buf = await buildInventoryCard(target.username, avatarUrl, items, coins);
  await interaction.editReply({ files: [toAttachment(buf)] });
}
