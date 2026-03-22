import {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  type ChatInputCommandInteraction, ComponentType,
} from "discord.js";
import { getOrCreateUser, addXp, addCoins, removeCoins, grantAchievement } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { incrementQuestProgress } from "../profile/quest.js";
import { buildDuelCard, buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("duel")
  .setDescription("Challenge another member to a duel!")
  .addUserOption(opt => opt.setName("opponent").setDescription("Who to duel?").setRequired(true))
  .addIntegerOption(opt =>
    opt.setName("bet").setDescription("Coins to wager (optional)").setRequired(false).setMinValue(0).setMaxValue(500)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const challenger = interaction.user;
  const opponent   = interaction.options.getUser("opponent", true);
  const bet        = interaction.options.getInteger("bet") ?? 0;
  const guildId    = interaction.guildId!;

  if (opponent.id === challenger.id) {
    const buf = await buildResultCard({ accent: "red", emoji: "❌", title: "Can't duel yourself!" });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }
  if (opponent.bot) {
    const buf = await buildResultCard({ accent: "red", emoji: "🤖", title: "Can't duel a bot!" });
    await interaction.editReply({ files: [toAttachment(buf)] }); return;
  }

  await getOrCreateUser(challenger.id, guildId, challenger.username);
  await getOrCreateUser(opponent.id,   guildId, opponent.username);

  // Challenge embed + buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("duel_accept").setLabel("Accept").setStyle(ButtonStyle.Success).setEmoji("⚔️"),
    new ButtonBuilder().setCustomId("duel_decline").setLabel("Decline").setStyle(ButtonStyle.Danger).setEmoji("🏃"),
  );

  const challengeEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⚔️ Duel Challenge!")
    .setDescription(
      `${opponent}, **${challenger.username}** challenges you to a duel!` +
      (bet > 0 ? `\nBet: **${bet}** coins each` : "")
    )
    .setFooter({ text: "You have 60 seconds to respond!" });

  const msg = await interaction.editReply({ embeds: [challengeEmbed], components: [row] });

  try {
    const btn = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: i => i.user.id === opponent.id,
      time: 60_000,
    });

    if (btn.customId === "duel_decline") {
      const buf = await buildResultCard({
        accent: "red", emoji: "🏃", title: "Duel Declined",
        subtitle: `${opponent.username} backed down.`,
      });
      await btn.update({ embeds: [], components: [], files: [toAttachment(buf)] }); return;
    }

    // Bet handling
    if (bet > 0) {
      const c1 = await removeCoins(challenger.id, guildId, bet);
      const c2 = await removeCoins(opponent.id,   guildId, bet);
      if (!c1 || !c2) {
        if (c1) await addCoins(challenger.id, guildId, bet);
        if (c2) await addCoins(opponent.id,   guildId, bet);
        const buf = await buildResultCard({
          accent: "red", emoji: "💸", title: "Bet Failed",
          subtitle: "One player doesn't have enough coins.",
        });
        await btn.update({ embeds: [], components: [], files: [toAttachment(buf)] }); return;
      }
    }

    // Gear bonuses
    const getBonus = async (uid: string) => {
      const items = await query(
        `SELECT item_name FROM inventory WHERE discord_id = $1 AND guild_id = $2`,
        [uid, guildId]
      );
      const names: string[] = items.rows.map((r: { item_name: string }) => r.item_name);
      let atk = 0, def = 0;
      if (names.includes("Dragon Sword"))     atk += 30;
      else if (names.includes("Iron Sword"))  atk += 15;
      else if (names.includes("Sword"))       atk += 8;
      if (names.includes("Enchanted Shield")) def += 20;
      else if (names.includes("Shield"))      def += 10;
      return { atk, def };
    };

    const cBonus = await getBonus(challenger.id);
    const oBonus = await getBonus(opponent.id);
    const cRoll = Math.floor(Math.random() * 20) + 1 + cBonus.atk - oBonus.def;
    const oRoll = Math.floor(Math.random() * 20) + 1 + oBonus.atk - cBonus.def;

    const winner = cRoll >= oRoll ? challenger : opponent;
    const loser  = winner.id === challenger.id ? opponent : challenger;

    const XP_WIN = 60, XP_LOSE = 15;
    await addXp(winner.id, guildId, XP_WIN);
    await addXp(loser.id,  guildId, XP_LOSE);
    if (bet > 0) await addCoins(winner.id, guildId, bet * 2);

    await Promise.all([
      incrementQuestProgress(challenger.id, guildId, "duel"),
      incrementQuestProgress(opponent.id,   guildId, "duel"),
      grantAchievement(winner.id, guildId, "First Victory"),
    ]);

    const buf = await buildDuelCard({
      challenger: {
        username:  challenger.username,
        avatarUrl: challenger.displayAvatarURL({ extension: "png", size: 128 }),
        roll: cRoll,
      },
      opponent: {
        username:  opponent.username,
        avatarUrl: opponent.displayAvatarURL({ extension: "png", size: 128 }),
        roll: oRoll,
      },
      winner: winner.username,
      bet,
      xpWinner: XP_WIN,
      xpLoser:  XP_LOSE,
    });

    await btn.update({ embeds: [], components: [], files: [toAttachment(buf)] });
  } catch {
    const buf = await buildResultCard({
      accent: "red", emoji: "⏰", title: "Challenge Expired",
      subtitle: `${opponent.username} didn't respond in time.`,
    });
    await interaction.editReply({ embeds: [], components: [], files: [toAttachment(buf)] });
  }
}
