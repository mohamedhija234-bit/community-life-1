import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { query } from "../../db/schema.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("setperk")
  .setDescription("Set a role granted automatically at a level milestone (Admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addIntegerOption(opt => opt.setName("level").setDescription("Level required").setRequired(true).setMinValue(1))
  .addRoleOption(opt => opt.setName("role").setDescription("Role to grant").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.guildId!;
  const level   = interaction.options.getInteger("level", true);
  const role    = interaction.options.getRole("role", true);

  await query(
    `INSERT INTO perks (guild_id, level_required, role_id) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, level_required) DO UPDATE SET role_id = $3`,
    [guildId, level, role.id]
  );

  const buf = await buildResultCard({
    accent: "green",
    emoji: "🔓",
    title: "Perk Configured!",
    fields: [
      { label: "Level Required", value: `${level}`,    color: "#57F287" },
      { label: "Role Granted",   value: role.name,     color: "#5865F2" },
    ],
    footer: "Members will receive this role automatically when they hit the level.",
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
