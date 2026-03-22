import { Client, GatewayIntentBits, Partials } from "discord.js";
import type { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { initDatabase } from "./db/schema.js";
import { registerReady } from "./events/ready.js";
import { registerInteractionCreate } from "./events/interactionCreate.js";
import { registerMessageCreate } from "./events/messageCreate.js";
import { registerReactionAdd } from "./events/messageReactionAdd.js";

// Commands
import * as profileCmd    from "./commands/profile/profile.js";
import * as dailyCmd      from "./commands/profile/daily.js";
import * as questCmd      from "./commands/profile/quest.js";
import * as inventoryCmd  from "./commands/profile/inventory.js";
import * as fishCmd       from "./commands/games/fish.js";
import * as rollCmd       from "./commands/games/roll.js";
import * as duelCmd       from "./commands/games/duel.js";
import * as craftCmd      from "./commands/games/craft.js";
import * as shopCmd       from "./commands/economy/shop.js";
import * as buyCmd        from "./commands/economy/buy.js";
import * as sellCmd       from "./commands/economy/sell.js";
import * as tradeCmd      from "./commands/economy/trade.js";
import * as leaderboardCmd from "./commands/social/leaderboard.js";
import * as startEventCmd  from "./commands/admin/startevent.js";
import * as endEventCmd    from "./commands/admin/endevent.js";
import * as setPerkCmd     from "./commands/admin/setperk.js";

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands: Command[] = [
  profileCmd, dailyCmd, questCmd, inventoryCmd,
  fishCmd, rollCmd, duelCmd, craftCmd,
  shopCmd, buyCmd, sellCmd, tradeCmd,
  leaderboardCmd,
  startEventCmd, endEventCmd, setPerkCmd,
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

const commandMap = new Map<string, Command>();
for (const cmd of commands) {
  commandMap.set(cmd.data.name, cmd);
}

registerReady(client);
registerInteractionCreate(client, commandMap);
registerMessageCreate(client);
registerReactionAdd(client);

async function main() {
  if (!process.env.DISCORD_TOKEN)  throw new Error("DISCORD_TOKEN is required");
  if (!process.env.DATABASE_URL)   throw new Error("DATABASE_URL is required");

  await initDatabase();
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
