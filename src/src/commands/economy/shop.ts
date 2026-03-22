import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { SHOP_ITEMS } from "../../lib/shopData.js";
import { buildShopCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("Browse the server shop");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const buf = await buildShopCard(
    SHOP_ITEMS.map(i => ({
      name: i.name,
      emoji: i.emoji,
      price: i.price,
      description: i.description,
      sellPrice: i.sellPrice,
    }))
  );

  await interaction.editReply({ files: [toAttachment(buf)] });
}
