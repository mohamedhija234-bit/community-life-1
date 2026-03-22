import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, removeCoins, addItem } from "../../lib/userUtils.js";
import { SHOP_ITEMS } from "../../lib/shopData.js";
import { incrementQuestProgress } from "../profile/quest.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("buy")
  .setDescription("Buy an item from the shop")
  .addStringOption(opt =>
    opt.setName("item").setDescription("Item to buy").setRequired(true)
      .addChoices(...SHOP_ITEMS.map(i => ({ name: i.name, value: i.name })))
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

  const item = SHOP_ITEMS.find(i => i.name === itemName);
  if (!item) {
    const buf = await buildResultCard({ accent: "red", emoji: "❌", title: `Item not found: ${itemName}` });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  const totalCost = item.price * qty;
  const paid = await removeCoins(discordId, guildId, totalCost);
  if (!paid) {
    const buf = await buildResultCard({
      accent: "red",
      emoji: "💸",
      title: "Not Enough Coins",
      subtitle: `${item.emoji} ${itemName} ×${qty} costs ${totalCost} coins.`,
      footer: "Earn coins by chatting, fishing, or claiming your daily!",
    });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  await addItem(discordId, guildId, itemName, qty);
  await incrementQuestProgress(discordId, guildId, "buy");

  const buf = await buildResultCard({
    accent: "green",
    emoji: item.emoji,
    title: "Purchase Successful!",
    subtitle: item.description,
    fields: [
      { label: "Item",  value: `${item.name} ×${qty}`, color: "#57F287" },
      { label: "Spent", value: `💰 ${totalCost}`,       color: "#FEE75C" },
    ],
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
