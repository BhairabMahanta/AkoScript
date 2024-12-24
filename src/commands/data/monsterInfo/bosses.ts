export interface BossStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  mana: number;
  // Add other stats if required
}

export interface Boss {
  name: string;
  stats: BossStats;
  abilities: string[];
  attackPattern: string[];
  index: number;
}

export const bosses: Record<string, Boss> = {
  "Dragon Lord": {
    name: "Dragon Lord",
    stats: {
      hp: 1000,
      attack: 150,
      defense: 100,
      speed: 80,
      mana: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe"],
    index: 0,
  },
  "Giant Spider": {
    name: "Giant Spider",
    stats: {
      hp: 800,
      attack: 120,
      defense: 80,
      speed: 120,
      mana: 100,
    },
    abilities: ["Venom Strike", "Web Trap"],
    attackPattern: ["Basic Attack", "Venom Strike", "Web Trap"],
    index: 0,
  },
  // Add more bosses as needed
};
