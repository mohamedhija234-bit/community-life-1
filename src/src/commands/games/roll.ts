import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, addXp, addCoins, removeCoins } from "../../lib/userUtils.js";
import { incrementQuestProgress } from "../profile/quest.js";
import { buildResultCard, toAttachment } from "../../lib/cardImage.js";

export const data = new SlashCommandBuilder()
  .setName("roll")
  .setDescription("Roll the dice and gamble your coins!")
  .addIntegerOption(opt =>
    opt.setName("bet").setDescription("How many coins to bet (1–500)").setRequired(true).setMinValue(1).setMaxValue(500)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const { id: discordId, username } = interaction.user;
  const guildId = interaction.guildId!;
  const bet = interaction.options.getInteger("bet", true);

  await getOrCreateUser(discordId, guildId, username);

  const success = await removeCoins(discordId, guildId, bet);
  if (!success) {
    const buf = await buildResultCard({
      accent: "red",
      emoji: "❌",
      title: "Not Enough Coins",
      subtitle: `You need ${bet} coins to place this bet.`,
    });
    await interaction.editReply({ files: [toAttachment(buf)] });
    return;
  }

  const dice = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const yourRoll  = Math.floor(Math.random() * 6) + 1;
  const houseRoll = Math.floor(Math.random() * 6) + 1;

  let resultLine = "";
  let accent: "green" | "yellow" | "red" = "green";

  if (yourRoll > houseRoll) {
    const mult = yourRoll === 6 && houseRoll === 1 ? 3 : 2;
    const winnings = bet * mult;
    await addCoins(discordId, guildId, winnings);
    await addXp(discordId, guildId, 10);
    resultLine = `You won  💰 ${winnings}  (×${mult})`;
    accent = "green";
  } else if (yourRoll === houseRoll) {
    await addCoins(discordId, guildId, bet);
    resultLine = "Tie — your bet is returned";
    accent = "yellow";
  } else {
    await addXp(discordId, guildId, 2);
    resultLine = `You lost  💰 ${bet}`;
    accent = "red";
  }

  await incrementQuestProgress(discordId, guildId, "dice");

  const buf = await buildResultCard({
    accent,
    emoji: "🎲",
    title: "Dice Roll!",
    fields: [
      { label: "Your Roll",  value: `${dice[yourRoll - 1]} ${yourRoll}`,   color: "#e8eaf6" },
      { label: "House Roll", value: `${dice[houseRoll - 1]} ${houseRoll}`, color: "#99aab5" },
    ],
    bodyLines: [resultLine],
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
