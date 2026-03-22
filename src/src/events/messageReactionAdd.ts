import type { Client, MessageReaction, User } from "discord.js";
import { getOrCreateUser, addXp } from "../lib/userUtils.js";
import { incrementQuestProgress } from "../commands/profile/quest.js";
import { query } from "../db/schema.js";

export function registerReactionAdd(client: Client) {
  client.on("messageReactionAdd", async (reaction: MessageReaction, user: User) => {
    if (user.bot) return;

    // Fetch full reaction if partial
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }
    if (!reaction.message.guildId) return;

    const guildId = reaction.message.guildId;
    await getOrCreateUser(user.id, guildId, user.username);
    await addXp(user.id, guildId, 3);
    await incrementQuestProgress(user.id, guildId, "react");

    // Handle event participation — if the message has the event embed and user reacts ⚔️
    if (reaction.emoji.name === "⚔️") {
      const activeEvent = await query(
        `SELECT id FROM events WHERE guild_id = $1 AND active = TRUE ORDER BY started_at DESC LIMIT 1`,
        [guildId]
      );
      if (activeEvent.rows.length > 0) {
        const eventId = activeEvent.rows[0].id;
        await query(
          `INSERT INTO event_participants (event_id, discord_id, guild_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [eventId, user.id, guildId]
        );
      }
    }
  });
}
