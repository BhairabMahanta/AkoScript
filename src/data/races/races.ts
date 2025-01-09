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
  magicDefense: number;
  divinePower: number;
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
      magicDefense: 60,
      divinePower: 5,
    },
    abilities: ["Adaptable Nature", "Versatile Training"],
    description:
      "Versatile and adaptable, humans possess a balanced set of abilities. Good allrounder prospect",
    spAllocation: {
      staticNum: 6,
      static: [
        "hp",
        "attack",
        "defense",
        "magic",
        "magicDefense",
        "divinePower",
      ], // All stats for balance
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
      magicDefense: 70,
      divinePower: 10,
    },
    abilities: ["Elven Grace", "Nature's Favor"],
    description:
      "Graceful and attuned to nature, elves excel in agility and magical prowess. Good healer prospect",
    spAllocation: {
      staticNum: 6,
      static: [
        "hp",
        "attack",
        "defense",
        "magic",
        "magicDefense",
        "divinePower",
      ], // All stats for balance
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
      attack: 55,
      defense: 80,
      magic: 25,
      magicDefense: 50,
      divinePower: 5,
      speed: 40,
    },
    abilities: ["Colossal Strength", "Unyielding Will"],
    description:
      "Massive and powerful, GiantKin dominate battles with brute force. Good Tank prospect",
    spAllocation: {
      staticNum: 6,
      static: [
        "hp",
        "attack",
        "defense",
        "magic",
        "magicDefense",
        "divinePower",
      ], // All stats for balance
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
  },
  Shadeborn: {
    stats: {
      hp: 1400,
      attack: 60,
      defense: 70,
      magic: 40,
      speed: 90,
      magicDefense: 60,
      divinePower: 5,
    },
    abilities: ["Sneaky Tricks", "Lucky Charm"],
    description:
      "Evoking beings born from the shadows, mysterious and stealthy. Good assassin prospect",
    spAllocation: {
      staticNum: 6,
      static: [
        "hp",
        "attack",
        "defense",
        "magic",
        "magicDefense",
        "divinePower",
      ], // All stats for balance
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
  },
  Dwarf: {
    abilities: ["Arcane Brilliance", "Inventive Mind"],
    description:
      "Resilient and sturdy, dwarves are skilled craftsmen and formidable warriors.",
    spAllocation: {
      staticNum: 6,
      static: [
        "hp",
        "attack",
        "defense",
        "magic",
        "magicDefense",
        "divinePower",
      ], // All stats for balance
      dynamic: {
        hp: 1,
        attack: 1,
        defense: 1,
        magic: 1,
      }, // Balanced dynamic allocation
    },
    stats: {
      hp: 2400,
      attack: 55,
      defense: 65,
      magic: 40,
      speed: 60,
      magicDefense: 60,
      divinePower: 5,
    },
  },
};

export default races;
