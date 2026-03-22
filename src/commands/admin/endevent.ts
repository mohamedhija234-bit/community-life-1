import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { query } from "../../db/schema.js";
import { addXp, addCoins } from "../../lib/userUtils.js";
import { SERVER_EVENTS } from "../../lib/questData.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("endevent")
  .setDescription("End the current event and distribute rewards (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guildId = interaction.guildId!;

  const activeEvent = await query(
    `SELECT * FROM events WHERE guild_id = $1 AND active = TRUE ORDER BY started_at DESC LIMIT 1`,
    [guildId]
  );

  if (activeEvent.rows.length === 0) {
    const buf = await buildResultCard({
      accent: "red", emoji: "❌", title: "No Active Event",
      subtitle: "Start one with /startevent.",
    });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  const evt = activeEvent.rows[0];
  const eventKey  = Object.keys(SERVER_EVENTS).find(k => SERVER_EVENTS[k].name === evt.event_name);
  const eventData = eventKey ? SERVER_EVENTS[eventKey] : null;

  const xpReward    = eventData?.participantRewardXp    ?? 50;
  const coinsReward = eventData?.participantRewardCoins ?? 40;

  const participants = await query(
    `SELECT discord_id FROM event_participants WHERE event_id = $1`, [evt.id]
  );

  for (const p of participants.rows) {
    await addXp(p.discord_id, guildId, xpReward);
    await addCoins(p.discord_id, guildId, coinsReward);
  }

  await query(
    `UPDATE events SET active = FALSE, ended_at = NOW(), participants = $1 WHERE id = $2`,
    [participants.rows.length, evt.id]
  );

  const buf = await buildResultCard({
    accent: "green",
    emoji: "🏁",
    title: `${evt.event_name} Ended!`,
    subtitle: "Rewards distributed to all participants.",
    fields: [
      { label: "Participants", value: `${participants.rows.length}`,  color: "#e8eaf6" },
      { label: "XP Each",     value: `+${xpReward}`,                 color: "#57F287" },
      { label: "Coins Each",  value: `+${coinsReward}`,              color: "#FEE75C" },
    ],
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
