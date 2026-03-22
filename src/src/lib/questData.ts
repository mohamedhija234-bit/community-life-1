export interface QuestTemplate {
  name: string;
  description: string;
  goal: number;
  rewardXp: number;
  rewardCoins: number;
  emoji: string;
}

export const DAILY_QUESTS: QuestTemplate[] = [
  { name: "Chat Champion", description: "Send 10 messages today", goal: 10, rewardXp: 50, rewardCoins: 30, emoji: "💬" },
  { name: "Reaction Rush", description: "React to 5 messages", goal: 5, rewardXp: 30, rewardCoins: 20, emoji: "❤️" },
  { name: "Fisher's Daily", description: "Go fishing 3 times", goal: 3, rewardXp: 40, rewardCoins: 25, emoji: "🎣" },
  { name: "Gambler's Luck", description: "Roll the dice 5 times", goal: 5, rewardXp: 35, rewardCoins: 22, emoji: "🎲" },
  { name: "Shop Spender", description: "Buy 1 item from the shop", goal: 1, rewardXp: 25, rewardCoins: 15, emoji: "🛒" },
  { name: "Coin Collector", description: "Earn 50 coins through activities", goal: 50, rewardXp: 60, rewardCoins: 40, emoji: "💰" },
  { name: "Duel Master", description: "Challenge someone to a duel", goal: 1, rewardXp: 45, rewardCoins: 30, emoji: "⚔️" },
];

export function getRandomQuest(): QuestTemplate {
  return DAILY_QUESTS[Math.floor(Math.random() * DAILY_QUESTS.length)];
}

export interface ServerEvent {
  name: string;
  description: string;
  emoji: string;
  participantRewardXp: number;
  participantRewardCoins: number;
}

export const SERVER_EVENTS: Record<string, ServerEvent> = {
  "monster-invasion": {
    name: "Monster Invasion",
    description: "A horde of monsters is attacking the server! Unite to defeat them!",
    emoji: "👹",
    participantRewardXp: 100,
    participantRewardCoins: 75,
  },
  "festival": {
    name: "Grand Festival",
    description: "The annual festival has begun! Celebrate with your fellow members!",
    emoji: "🎉",
    participantRewardXp: 80,
    participantRewardCoins: 60,
  },
  "treasure-hunt": {
    name: "Treasure Hunt",
    description: "Rumor has it that buried treasure lies hidden in the server. Find it!",
    emoji: "🗺️",
    participantRewardXp: 120,
    participantRewardCoins: 100,
  },
  "dragon-raid": {
    name: "Dragon Raid",
    description: "A fearsome dragon has appeared! Heroes needed to drive it back!",
    emoji: "🐉",
    participantRewardXp: 150,
    participantRewardCoins: 120,
  },
  "harvest-season": {
    name: "Harvest Season",
    description: "It's harvest time! Collect resources and share with the community!",
    emoji: "🌾",
    participantRewardXp: 70,
    participantRewardCoins: 50,
  },
};
