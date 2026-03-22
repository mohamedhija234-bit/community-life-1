import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { query } from "../../db/schema.js";
import { SERVER_EVENTS } from "../../lib/questData.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("startevent")
  .setDescription("Start a server-wide event (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption(opt =>
    opt.setName("name").setDescription("Event to start").setRequired(true)
      .addChoices(...Object.keys(SERVER_EVENTS).map(k => ({ name: SERVER_EVENTS[k].name, value: k })))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guildId  = interaction.guildId!;
  const eventKey = interaction.options.getString("name", true);
  const eventData = SERVER_EVENTS[eventKey];

  if (!eventData) {
    const buf = await buildResultCard({ accent: "red", emoji: "❌", title: "Unknown event type." });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  const existing = await query(
    `SELECT id FROM events WHERE guild_id = $1 AND active = TRUE`, [guildId]
  );
  if (existing.rows.length > 0) {
    const buf = await buildResultCard({
      accent: "red", emoji: "⚠️", title: "Event Already Active",
      subtitle: "Use /endevent to close the current event first.",
    });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  const result = await query(
    `INSERT INTO events (guild_id, event_name, description, started_by, active)
     VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [guildId, eventData.name, eventData.description, interaction.user.id]
  );
  const eventId = result.rows[0].id;

  const buf = await buildResultCard({
    accent: "yellow",
    emoji: eventData.emoji,
    title: `${eventData.name} Has Begun!`,
    subtitle: eventData.description,
    fields: [
      { label: "XP Reward",   value: `+${eventData.participantRewardXp}`,    color: "#57F287" },
      { label: "Coin Reward", value: `+${eventData.participantRewardCoins}`,  color: "#FEE75C" },
    ],
    bodyLines: ["React ⚔️ to the message below to participate!"],
    footer: `Event ID: ${eventId}  ·  Use /endevent to close`,
  });

  const msg = await interaction.editReply({ files: [toAttachment(buf)] });
  try { await msg.react("⚔️"); } catch {}
}
