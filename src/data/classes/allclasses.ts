interface ClassDetails {
  abilities: string[]; // List of abilities for the class
  description: string; // Description of the class
  state?: string; // Optional state property, can be "locked" or undefined
}

interface Classes {
  [key: string]: ClassDetails; // Index signature for class names
}

const classes: Classes = {
  Berserker: {
    abilities: ["Bloodlust", "Raging Strike"],
    description:
      "A fierce warrior who enters a state of uncontrollable rage, dealing massive damage.",
  },
  Sentinel: {
    abilities: ["Arena Spin", "Crowd Control"],
    description:
      "A master of close-quarters combat, specializing in arena-style duels.",
  },
  Oracle: {
    abilities: ["Divine Insight", "Healing Hands"],
    description: "A visionary who provides foresight, buffs, and crowd control",
  },
  Mage: {
    abilities: ["Frost Nova", "Thunderstorm", "Fireball"],
    description:
      "A powerful mage focused on different elements and destructive spells.",
  },
  Artisan: {
    abilities: ["Crafting", "Tinkering"],
    description:
      "A creator of tools, weapons, and potions to support the party.",
  },
  Cleric: {
    abilities: ["Healing Light", "Divine Protection"],
    description:
      " A holy warrior who can heal wounds and protect allies using divine magic.",
  },
  Assassin: {
    abilities: ["Backstab", "Shadow Step"],
    description:
      "A deadly stealthy killer, striking from the shadows with precision and speed.",
  },
  Knight: {
    abilities: ["Shield Bash", "Defend"],
    description:
      "A heavily armored warrior skilled in swordsmanship and defense.",
    state: "locked",
  },
  Samurai: {
    abilities: ["Precision Strike", "Honor's Resolve"],
    state: "locked",
    description:
      "A disciplined warrior from the Far East, known for their precision strikes and code of honor.",
  },
  Sorcerer: {
    abilities: ["Fireball", "Arcane Shield"],
    state: "locked",
    description:
      "Harnesses the power of arcane magic to cast devastating spells.",
  },

  Necromancer: {
    abilities: ["Raise Dead", "Drain Life"],
    state: "locked",
    description:
      "Commands the undead and dark magic to drain life from opponents.",
  },
  Illusionist: {
    abilities: ["Mirror Image", "Mind Trick"],
    state: "locked",
    description:
      "Masters the art of illusions and deception, confusing enemies in battle.",
  },

  Rogue: {
    abilities: ["Dual Wield", "Evasion"],
    state: "locked",
    description:
      "A nimble and agile fighter, specializing in quick strikes and evasive maneuvers.",
  },
  Ninja: {
    abilities: ["Smoke Bomb", "Shuriken Barrage"],
    state: "locked",
    description:
      "An expert in sabotage and espionage, utilizing ninja weapons and techniques.",
  },
};

export default classes;
