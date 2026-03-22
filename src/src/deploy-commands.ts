import { REST, Routes } from "discord.js";

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

const commands = [
  profileCmd.data.toJSON(),
  dailyCmd.data.toJSON(),
  questCmd.data.toJSON(),
  inventoryCmd.data.toJSON(),
  fishCmd.data.toJSON(),
  rollCmd.data.toJSON(),
  duelCmd.data.toJSON(),
  craftCmd.data.toJSON(),
  shopCmd.data.toJSON(),
  buyCmd.data.toJSON(),
  sellCmd.data.toJSON(),
  tradeCmd.data.toJSON(),
  leaderboardCmd.data.toJSON(),
  startEventCmd.data.toJSON(),
  endEventCmd.data.toJSON(),
  setPerkCmd.data.toJSON(),
];

const token    = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID must be set");

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands globally...`);
    const data = await rest.put(Routes.applicationCommands(clientId), { body: commands }) as unknown[];
    console.log(`✅ Successfully registered ${data.length} commands!`);
  } catch (err) {
    console.error("Error registering commands:", err);
    process.exit(1);
  }
})();
