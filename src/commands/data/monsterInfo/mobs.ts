export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  magic?: number; // Optional, since not all mobs may have magic stats
}

export interface Mob {
  name: string;
  stats: Stats;
  abilities: string[];
  attackPattern: string[];
  index: number;
}

export const mobs: Record<string, Mob> = {
  monsterA: {
    name: "monsterA",
    stats: {
      hp: 1000,
      attack: 100,
      defense: 40,
      speed: 95,
      magic: 200,
    },
    abilities: ["Fire Breath", "Tail Swipe"],
    attackPattern: ["Basic Attack", "Fire Breath", "Tail Swipe", "Fire Breath"],
    index: 0,
  },
  monsterB: {
    name: "monsterB",
    stats: {
      hp: 800,
      attack: 70,
      defense: 30,
      speed: 99,
      magic: 100,
    },
    abilities: ["Venom Strike", "Web Trap"],
    attackPattern: ["Basic Attack", "Venom Strike", "Web Trap", "Venom Strike"],
    index: 0,
  },
  // Add more mobs as needed
};
