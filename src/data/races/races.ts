interface Race {
  stats: Stats; // Base stats for the race
  abilities: string[]; // Unique abilities of the race
  description: string; // Short description of the race
  spAllocation: SpAllocation; // How stat points are allocated per level
}

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
}

interface SpAllocation {
  static: string[]; // Example: ["health", "attack"]
  staticNum: number; // Fixed points to allocate to `static` stats
  dynamic: {
    [statName: string]: number; // Map stat names to allocation values
  };
}

const races: { [key: string]: Race } = {
  Human: {
    stats: {
      hp: 2100,
      attack: 60,
      defense: 60,
      magic: 60,
      speed: 65,
    },
    abilities: ["Adaptable Nature", "Versatile Training"],
    description:
      "Versatile and adaptable, humans possess a balanced set of abilities.",
    spAllocation: {
      staticNum: 4,
      static: ["hp", "attack", "defense", "magic"], // All stats for balance
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
  },
  Elf: {
    stats: {
      hp: 1800,
      attack: 50,
      defense: 45,
      magic: 85,
      speed: 95,
    },
    abilities: ["Elven Grace", "Nature's Favor"],
    description:
      "Graceful and attuned to nature, elves excel in agility and magical prowess.",
    spAllocation: {
      staticNum: 2,
      static: ["magic", "speed"], // Focus on magic and speed
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
  },
  GiantKin: {
    stats: {
      hp: 2500,
      attack: 75,
      defense: 80,
      magic: 25,
      speed: 40,
    },
    abilities: ["Colossal Strength", "Unyielding Will"],
    description:
      "Massive and powerful, GiantKin dominate battles with brute force.",
    spAllocation: {
      staticNum: 3,
      static: ["hp", "attack", "defense"], // Focus on strength-based stats
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
  },
  Halfling: {
    stats: {
      hp: 1400,
      attack: 60,
      defense: 70,
      magic: 40,
      speed: 90,
    },
    abilities: ["Sneaky Tricks", "Lucky Charm"],
    description:
      "Small and nimble, halflings are expert thieves and stealthy adventurers.",
    spAllocation: {
      staticNum: 2,
      static: ["speed", "defense"], // Focus on speed and defense
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
  },

  Gnome: {
    abilities: ["Arcane Brilliance", "Inventive Mind"],
    description:
      "Intelligent and inventive, gnomes excel in arcane magic and technological innovations.",
    spAllocation: {
      staticNum: 3,
      static: ["hp", "attack", "defense"], // Focus on strength-based stats
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
    stats: {
      hp: 1400,
      attack: 60,
      defense: 70,
      magic: 40,
      speed: 90,
    },
  },
};

export default races;
