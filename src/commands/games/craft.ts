import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, addXp, addItem, removeItem } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { CRAFT_RECIPES } from "../../lib/shopData.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("craft")
  .setDescription("Craft items using materials in your inventory")
  .addStringOption(opt =>
    opt.setName("item").setDescription("Item to craft").setRequired(true)
      .addChoices(...CRAFT_RECIPES.map(r => ({ name: r.output, value: r.output })))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const { id: discordId, username } = interaction.user;
  const guildId = interaction.guildId!;
  const itemName = interaction.options.getString("item", true);

  await getOrCreateUser(discordId, guildId, username);

  const recipe = CRAFT_RECIPES.find(r => r.output === itemName);
  if (!recipe) {
    const buf = await buildResultCard({ accent: "red", emoji: "❌", title: `No recipe for "${itemName}"` });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  // Check ingredients
  const missing: string[] = [];
  for (const ing of recipe.ingredients) {
    const inv = await query(
      `SELECT quantity FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name = $3`,
      [discordId, guildId, ing.name]
    );
    if (inv.rows.length === 0 || parseInt(inv.rows[0].quantity) < ing.qty) {
      missing.push(`${ing.name} ×${ing.qty}`);
    }
  }

  if (missing.length > 0) {
    const buf = await buildResultCard({
      accent: "red",
      emoji: "🔨",
      title: "Missing Ingredients",
      bodyLines: missing.map(m => `• ${m}`),
    });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  for (const ing of recipe.ingredients) {
    await removeItem(discordId, guildId, ing.name, ing.qty);
  }
  await addItem(discordId, guildId, recipe.output);
  await addXp(discordId, guildId, 30);

  const buf = await buildResultCard({
    accent: "green",
    emoji: recipe.outputEmoji,
    title: "Item Crafted!",
    subtitle: recipe.description,
    fields: [
      { label: "Item",     value: recipe.output, color: "#57F287" },
      { label: "XP",       value: "+30",         color: "#57F287" },
    ],
    bodyLines: [`Ingredients used: ${recipe.ingredients.map(i => `${i.name} ×${i.qty}`).join("  ·  ")}`],
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
