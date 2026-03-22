import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getOrCreateUser, addXp, addCoins, addItem } from "../../lib/userUtils.js";
import { query } from "../../db/schema.js";
import { incrementQuestProgress } from "../profile/quest.js";
import { buildResultCard, toAttachment, type AccentKey } from "../../lib/cardImage.js";

const FISH_OUTCOMES = [
  { name: "Old Boot",       emoji: "👢", rarity: "junk",      xp: 2,   coins: 0,   chance: 15 },
  { name: "Seaweed",        emoji: "🌿", rarity: "junk",      xp: 3,   coins: 1,   chance: 15 },
  { name: "Small Fish",     emoji: "🐟", rarity: "common",    xp: 10,  coins: 8,   chance: 30 },
  { name: "Medium Fish",    emoji: "🐠", rarity: "uncommon",  xp: 20,  coins: 15,  chance: 20 },
  { name: "Salmon",         emoji: "🐟", rarity: "uncommon",  xp: 25,  coins: 20,  chance: 10 },
  { name: "Lobster",        emoji: "🦞", rarity: "rare",      xp: 40,  coins: 35,  chance: 6  },
  { name: "Treasure Chest", emoji: "💰", rarity: "rare",      xp: 50,  coins: 80,  chance: 3  },
  { name: "Golden Fish",    emoji: "✨", rarity: "legendary", xp: 100, coins: 150, chance: 1  },
];

const RARITY_ACCENT: Record<string, AccentKey> = {
  junk: "grey", common: "green", uncommon: "blurple", rare: "yellow", legendary: "pink",
};

export const data = new SlashCommandBuilder()
  .setName("fish")
  .setDescription("Go fishing and try to catch something!");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const { id: discordId, username } = interaction.user;
  const guildId = interaction.guildId!;

  await getOrCreateUser(discordId, guildId, username);

  const inv = await query(
    `SELECT quantity FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name = 'Fishing Rod'`,
    [discordId, guildId]
  );

  if (inv.rows.length === 0) {
    const buf = await buildResultCard({
      accent: "red",
      emoji: "🎣",
      title: "No Fishing Rod!",
      subtitle: "You need a Fishing Rod to fish. Buy one from /shop.",
    });
    await interaction.editReply({ files: [toAttachment(buf)] });
    return;
  }

  const hasBait = await query(
    `SELECT item_name FROM inventory WHERE discord_id = $1 AND guild_id = $2 AND item_name IN ('Bait','Master Bait')`,
    [discordId, guildId]
  );
  const luckyBoost = hasBait.rows.find((r: {item_name: string}) => r.item_name === "Master Bait") ? 2
    : hasBait.rows.length > 0 ? 1 : 0;

  const roll = Math.random() * 100;
  let cumulative = 0;
  let caught = FISH_OUTCOMES[0];
  for (const outcome of FISH_OUTCOMES) {
    const adjChance = outcome.rarity === "legendary" && luckyBoost
      ? outcome.chance * (1 + luckyBoost) : outcome.chance;
    cumulative += adjChance;
    if (roll <= cumulative) { caught = outcome; break; }
  }

  if (caught.rarity !== "junk") await addItem(discordId, guildId, caught.name);
  await addXp(discordId, guildId, caught.xp);
  await addCoins(discordId, guildId, caught.coins);
  await incrementQuestProgress(discordId, guildId, "fish");

  const isLegendary = caught.rarity === "legendary";
  const buf = await buildResultCard({
    accent: RARITY_ACCENT[caught.rarity] ?? "blurple",
    emoji: caught.emoji,
    title: isLegendary ? "🌟 LEGENDARY CATCH!" : "Fishing Result!",
    subtitle: `You caught: ${caught.name}`,
    fields: [
      { label: "Rarity",  value: caught.rarity.toUpperCase(), color: isLegendary ? "#EB459E" : undefined },
      { label: "XP",      value: `+${caught.xp}`,   color: "#57F287" },
      { label: "Coins",   value: `+${caught.coins}`, color: "#FEE75C" },
    ],
    footer: luckyBoost ? "Bait bonus active 🍀" : undefined,
  });

  await interaction.editReply({ files: [toAttachment(buf)] });
}
