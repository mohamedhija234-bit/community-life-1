import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, addCoins, removeItem } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { SHOP_ITEMS } from "../../lib/shopData.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("sell")
  .setDescription("Sell an item from your inventory")
  .addStringOption(opt =>
    opt.setName("item").setDescription("Item name to sell").setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName("quantity").setDescription("How many (default: 1)").setRequired(false).setMinValue(1).setMaxValue(99)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const { id: discordId, username } = interaction.user;
  const guildId  = interaction.guildId!;
  const itemName = interaction.options.getString("item", true);
  const qty      = interaction.options.getInteger("quantity") ?? 1;

  await getOrCreateUser(discordId, guildId, username);

  const shopItem = SHOP_ITEMS.find(i => i.name.toLowerCase() === itemName.toLowerCase());
  const sellPrice = shopItem?.sellPrice ?? 5;

  const inv = await query(
    `SELECT item_name, quantity FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name ILIKE $3`,
    [discordId, guildId, itemName]
  );

  if (inv.rows.length === 0 || parseInt(inv.rows[0].quantity) < qty) {
    const buf = await buildResultCard({
      accent: "red",
      emoji: "❌",
      title: "Item Not Found",
      subtitle: `You don't have ${itemName} ×${qty} in your inventory.`,
      footer: "Use /inventory to see what you have.",
    });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  const realName = inv.rows[0].item_name as string;
  await removeItem(discordId, guildId, realName, qty);
  const earned = sellPrice * qty;
  await addCoins(discordId, guildId, earned);

  const buf = await buildResultCard({
    accent: "yellow",
    emoji: "💰",
    title: "Item Sold!",
    fields: [
      { label: "Item",   value: `${realName} ×${qty}`, color: "#e8eaf6" },
      { label: "Earned", value: `💰 ${earned}`,         color: "#FEE75C" },
    ],
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
