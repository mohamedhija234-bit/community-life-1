import type { Client } from "discord.js";

export function registerReady(client: Client) {
  client.once("clientReady", () => {
    console.log(`✅ Bot logged in as ${client.user?.tag}`);
    client.user?.setActivity("the Community Life Simulator", { type: 0 });
  });
}
