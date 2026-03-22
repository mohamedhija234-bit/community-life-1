import {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type ChatInputCommandInteraction, ComponentType,
} from "discord.js";
import { getOrCreateUser, addItem, removeItem } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("trade")
  .setDescription("Trade an item with another member")
  .addUserOption(opt => opt.setName("user").setDescription("Who to trade with").setRequired(true))
  .addStringOption(opt => opt.setName("item").setDescription("Item you want to give").setRequired(true))
  .addIntegerOption(opt =>
    opt.setName("quantity").setDescription("How many (default: 1)").setRequired(false).setMinValue(1).setMaxValue(99)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const sender   = interaction.user;
  const receiver = interaction.options.getUser("user", true);
  const itemName = interaction.options.getString("item", true);
  const qty      = interaction.options.getInteger("quantity") ?? 1;
  const guildId  = interaction.guildId!;

  if (receiver.id === sender.id) {
    const buf = await buildResultCard({ accent: "red", emoji: "❌", title: "Can't trade with yourself!" });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }
  if (receiver.bot) {
    const buf = await buildResultCard({ accent: "red", emoji: "🤖", title: "Can't trade with a bot!" });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  await getOrCreateUser(sender.id,   guildId, sender.username);
  await getOrCreateUser(receiver.id, guildId, receiver.username);

  const inv = await query(
    `SELECT quantity FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name ILIKE $3`,
    [sender.id, guildId, itemName]
  );

  if (inv.rows.length === 0 || parseInt(inv.rows[0].quantity) < qty) {
    const buf = await buildResultCard({
      accent: "red", emoji: "❌", title: "Item Not Found",
      subtitle: `You don't have ${itemName} ×${qty} to trade.`,
    });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  // Button row for receiver to accept/decline
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("trade_accept").setLabel("Accept").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId("trade_decline").setLabel("Decline").setStyle(ButtonStyle.Danger).setEmoji("❌"),
  );

  const challengeEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("🤝 Trade Request")
    .setDescription(
      `${receiver}, **${sender.username}** wants to give you **${itemName}** ×${qty}!\n\nYou have 60 seconds to respond.`
    );

  const msg = await interaction.editReply({ embeds: [challengeEmbed], components: [row] });

  try {
    const btn = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: i => i.user.id === receiver.id,
      time: 60_000,
    });

    if (btn.customId === "trade_decline") {
      const buf = await buildResultCard({
        accent: "red", emoji: "🙅", title: "Trade Declined",
        subtitle: `${receiver.username} declined the trade.`,
      });
      await btn.update({ embeds: [], components: [], files: [toAttachment(buf)] }); return;
    }

    const realItemResult = await query(
      `SELECT item_name FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name ILIKE $3`,
      [sender.id, guildId, itemName]
    );
    const realItemName = realItemResult.rows[0]?.item_name ?? itemName;

    await removeItem(sender.id,   guildId, realItemName, qty);
    await addItem(receiver.id, guildId, realItemName, qty);

    await query(
      `INSERT INTO trades (guild_id, from_user, to_user, item_name, quantity, status) VALUES ($1,$2,$3,$4,$5,'completed')`,
      [guildId, sender.id, receiver.id, realItemName, qty]
    );

    const buf = await buildResultCard({
      accent: "green",
      emoji: "🤝",
      title: "Trade Complete!",
      fields: [
        { label: "From",  value: sender.username,   color: "#e8eaf6" },
        { label: "To",    value: receiver.username, color: "#e8eaf6" },
        { label: "Item",  value: `${realItemName} ×${qty}`, color: "#57F287" },
      ],
    });

    await btn.update({ embeds: [], components: [], files: [toAttachment(buf)] });
  } catch {
    const buf = await buildResultCard({
      accent: "red", emoji: "⏰", title: "Trade Expired",
      subtitle: `${receiver.username} didn't respond in time.`,
    });
    await interaction.editReply({ embeds: [], components: [], files: [toAttachment(buf)] });
  }
}
