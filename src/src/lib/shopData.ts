export interface ShopItem {
  name: string;
  price: number;
  description: string;
  emoji: string;
  sellPrice: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { name: "Fishing Rod", price: 50, description: "Needed to go fishing", emoji: "🎣", sellPrice: 20 },
  { name: "Bait", price: 10, description: "Increases fishing success", emoji: "🪱", sellPrice: 4 },
  { name: "Sword", price: 150, description: "Used for dueling — increases attack", emoji: "⚔️", sellPrice: 60 },
  { name: "Shield", price: 100, description: "Used for dueling — increases defense", emoji: "🛡️", sellPrice: 40 },
  { name: "Potion", price: 30, description: "Heals 20 HP in duels", emoji: "🧪", sellPrice: 12 },
  { name: "Crafting Kit", price: 80, description: "Required for crafting items", emoji: "🔨", sellPrice: 30 },
  { name: "Magic Crystal", price: 200, description: "Rare crafting ingredient", emoji: "💎", sellPrice: 80 },
  { name: "Lucky Charm", price: 120, description: "Increases luck in games", emoji: "🍀", sellPrice: 50 },
  { name: "Ancient Map", price: 300, description: "Rare quest item", emoji: "🗺️", sellPrice: 120 },
  { name: "Dragon Scale", price: 500, description: "Legendary crafting material", emoji: "🐉", sellPrice: 200 },
];

export function getItem(name: string): ShopItem | undefined {
  return SHOP_ITEMS.find(i => i.name.toLowerCase() === name.toLowerCase());
}

export interface CraftRecipe {
  output: string;
  outputEmoji: string;
  ingredients: { name: string; qty: number }[];
  description: string;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    output: "Iron Sword",
    outputEmoji: "🗡️",
    ingredients: [{ name: "Crafting Kit", qty: 1 }, { name: "Sword", qty: 1 }],
    description: "A sharpened iron sword",
  },
  {
    output: "Enchanted Shield",
    outputEmoji: "🔮",
    ingredients: [{ name: "Shield", qty: 1 }, { name: "Magic Crystal", qty: 1 }],
    description: "A magically enhanced shield",
  },
  {
    output: "Master Bait",
    outputEmoji: "✨",
    ingredients: [{ name: "Bait", qty: 3 }, { name: "Lucky Charm", qty: 1 }],
    description: "Supercharged bait for rare fish",
  },
  {
    output: "Dragon Sword",
    outputEmoji: "🔥",
    ingredients: [{ name: "Dragon Scale", qty: 1 }, { name: "Iron Sword", qty: 1 }, { name: "Magic Crystal", qty: 1 }],
    description: "A legendary weapon forged from dragon scales",
  },
];
