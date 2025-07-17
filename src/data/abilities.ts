import { ExtendedPlayer } from "../commands/gamelogic/buffdebufflogic";

export interface AbilityInterface {
  name: string; // Name of the ability
  description?: string; // Optional description for clarity
  type:
    | "attack"
    | "attack_many" // Attack multiple targets
    | "increase_self"
    | "increase_hit"
    | "increase_many"
    | "increase_many_hit" // Increase for many people and hit one target
    | "increase_many_hit_many" // Increase for many people and hit many targets
    | "decrease_hit"
    | "decrease_many_hit" // Decrease for many people and hit one target
    | "passive"
    | "decrease"
    | "buff_self"
    | "buff"
    | "buff_hit"
    | "buff_many" // Buff multiple targets
    | "debuff"
    | "debuff_many" // Debuff multiple targets
    | "heal"
    | "heal_many"
    | "heal_hit"
    | "special"
    | "special_hit"
    | "special_many" // Special effects on multiple targets
    | "increase_buff" // Increase hit and apply a buff
    | "increase_debuff" // Increase hit and apply a debuff
    | "decrease_buff" // Decrease hit and apply a buff
    | "decrease_debuff" // Decrease hit and apply a debuff
    | "debuff_many_hit"
    | "hit_buff" // hit and buff (different from buff and hit)
    | "hit_debuff" //  hit and debuff (different from debuff and hit)
    | "hit_special" //  hit and special effect
    | "heal_buff" // Heal and apply a buff
    | "heal_debuff" // Heal and apply a debuff
    | "special_buff" // Special effect with buff
    | "special_debuff" // Special effect with debuff
    | "heal_special_effect" // Heal and apply special effect
    | "buff_special_effect" // Buff and apply special effect
    | "debuff_special_effect" // Debuff and apply special effect
    | "increase_hit_heal" // Increase hit and heal
    | "decrease_hit_heal" // Decrease hit and heal
    | "increase_hit_special_effect" // Increase hit and special effect
    | "decrease_hit_special_effect" // Decrease hit and special effect
    | "increase_buff_hit" // Increase stats, buff, and hit
    | "decrease_buff_hit" // Decrease stats, buff, and hit
    | "increase_buff_special_effect" // Increase stats, buff, and special effect
    | "decrease_buff_special_effect" // Decrease stats, buff, and special effect
    | "increase_debuff_hit" // Increase stats, debuff, and hit
    | "decrease_debuff_hit" // Decrease stats, debuff, and hit
    | "debuff_hit"
    | "increase_debuff_special_effect" // Increase stats, debuff, and special effect
    | "decrease_debuff_special_effect"; // Decrease stats, debuff, and special effect
  logicType?: string;
  unique?: boolean; // Whether the ability is unique to a character
  value_name?: string;
  value_amount?: Record<
    string,
    number | { state: boolean; [key: string]: any }
  >; // Effect values (e.g., { attack: 50, speed: 20 })
  targets?: ExtendedPlayer | ExtendedPlayer[]; // Single or multiple targets
  selection?: any;
  turnLimit?: number; // How many turns the effect lasts
  flat?: boolean; // Whether the value is a flat increase/decrease or percentage
  cooldown: number; // Cooldown in turns or seconds
}

// Define the abilities object with a strict set of ability names as keys
const abilities: { [key: string]: AbilityInterface } = {
  "Shield Bash": {
    description:
      "Delivers a powerful blow with the shield, slowing the opponent.",
    name: "Shield Bash",
    cooldown: 3,
    type: "decrease_hit",
    logicType: "decrease_speed",
    unique: true,
    value_amount: { speed: 20 },
    turnLimit: 2,
    flat: true,
  },
  Defend: {
    description:
      "Raises a defensive stance, reducing incoming damage for a short duration.",
    name: "Defend",
    cooldown: 3,
    type: "buff_many",
    logicType: "increase_defense",
    selection: "modal_3",
    unique: true,
    value_amount: { defense: 110 },
    turnLimit: 2,
    flat: true,
  },
  Bloodlust: {
    description:
      "Enters a state of frenzy, increasing attack speed and damage temporarily.",
    name: "Bloodlust",
    cooldown: 3,
    type: "buff_self",
    logicType: "increase_attack_and_increase_speed",
    unique: true,
    value_amount: { attack: 110, speed: 20 },
    turnLimit: 1,
    flat: true,
  },
  "Raging Strike": {
    description:
      "Unleashes a wild and uncontrolled strike, dealing massive damage.",
    name: "Raging Strike",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Arena Spin": {
    description:
      "Performs a spinning attack, hitting multiple opponents in the vicinity.",
    name: "Arena Spin",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Crowd Control": {
    description:
      "Taunts the enemy, forcing them to focus attacks on the Gladiator.",
    name: "Crowd Control",
    cooldown: 3,
    type: "debuff_many",
    logicType: "apply_taunt",
    unique: true,
    value_amount: {
      taunt: {
        state: true,
      },
    },
    turnLimit: 2,
  },
  "Precision Strike": {
    description:
      "Executes a swift and precise strike, dealing critical damage.",
    name: "Precision Strike",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Honor's Resolve": {
    description:
      "Enters a defensive stance, gaining increased resistance to status effects.",
    name: "Honor's Resolve",
    cooldown: 3,
    type: "buff_self",
    logicType: "apply_immunity",
    unique: true,
    turnLimit: 2,
  },
  Fireball: {
    description: "Hurls a ball of fire at the enemy, causing damage over time.",
    name: "Fireball",
    cooldown: 3,
    type: "debuff_hit",
    logicType: "apply_burn",
    unique: true,
    value_amount: {
      burn: {
        state: true,
        percentage: 4,
      },
    },
    turnLimit: 2,
  },
  "Arcane Shield": {
    description:
      "Creates a protective shield that absorbs incoming magic attacks.",
    name: "Arcane Shield",
    cooldown: 3,
    type: "buff_self",
    logicType: "apply_shield",
    unique: true,
    value_amount: {
      shield: {
        state: true,
        amount: 50,
      },
    },
    turnLimit: 3,
  },
  "Frost Nova": {
    description:
      "Freezes enemies in a radius, slowing their movement and attack speed.",
    name: "Frost Nova",
    cooldown: 3,
    type: "debuff_many_hit",
    logicType: "apply_freeze",
    unique: true,
    value_amount: {
      freeze: {
        state: true,
      },
    },
    turnLimit: 1,
  },
  Thunderstorm: {
    description:
      "Calls forth a powerful lightning storm, damaging multiple opponents.",
    name: "Thunderstorm",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Raise Dead": {
    description: "Summons a skeletal minion to aid in battle.",
    name: "Raise Dead",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Drain Life": {
    description:
      "Drains the life force from the enemy, healing the necromancer.",
    name: "Drain Life",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Mirror Image": {
    description: "Creates multiple illusory copies to confuse opponents.",
    name: "Mirror Image",
    cooldown: 3,
    type: "buff_self",
    logicType: "apply_evasion",
    unique: true,
    value_name: "evasion",
    value_amount: {
      evasion: {
        state: true,
      },
    },
    turnLimit: 2,
  },
  "Mind Trick": {
    description:
      "Imposes an illusion on the enemy, disorienting their movement.",
    name: "Mind Trick",
    cooldown: 3,
    type: "debuff",
    logicType: "apply_confusion",
    unique: true,
    value_name: "confusion",
    value_amount: {
      confusion: {
        state: true,
      },
    },
    turnLimit: 3,
  },
  Backstab: {
    description: "Strikes the enemy from behind, dealing massive damage.",
    name: "Backstab",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Shadow Step": {
    description: "Teleports behind the enemy, gaining a positional advantage.",
    name: "Shadow Step",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Dual Wield": {
    description: "Wields two weapons simultaneously, increasing attack speed.",
    name: "Dual Wield",
    cooldown: 3,
    type: "decrease_hit",
  },
  Evasion: {
    description:
      "Dodges incoming attacks, reducing damage taken for a short period.",
    name: "Evasion",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Smoke Bomb": {
    description:
      "Creates a cloud of smoke, obscuring vision and providing a chance to escape.",
    name: "Smoke Bomb",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Shuriken Barrage": {
    description: "Throws a flurry of shurikens, hitting multiple targets.",
    name: "Shuriken Barrage",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Charming Presence": {
    description: "Charms the enemy, temporarily making them passive.",
    name: "Charming Presence",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Acrobatic Flourish": {
    description:
      "Performs a dazzling display of acrobatics, increasing evasion.",
    name: "Acrobatic Flourish",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Healing Light": {
    description: "Restores health to the cleric or an ally.",
    name: "Healing Light",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Divine Protection": {
    description:
      "Provides a shield that absorbs incoming damage for a short duration.",
    name: "Divine Protection",
    cooldown: 3,
    type: "decrease_hit",
  },

  "Adaptable Nature": {
    description: "Gains a small bonus to all attributes.",
    name: "Adaptable Nature",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Versatile Training": {
    description: "Can learn and master a wider range of skills.",
    name: "Versatile Training",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Elven Grace": {
    description:
      "Increased agility and dexterity, improving evasion and accuracy.",
    name: "Elven Grace",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Nature's Favor": {
    description: "Enhanced affinity with nature-based magic.",
    name: "Nature's Favor",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Dwarven Resilience": {
    description: "Higher resistance to physical damage and status effects.",
    name: "Dwarven Resilience",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Master Craftsman": {
    description: "Proficient in crafting weapons and armor.",
    name: "Master Craftsman",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Feral Strength": {
    description:
      "Increased physical strength, dealing more damage in melee combat.",
    name: "Feral Strength",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Savage Fury": {
    description: "Becomes more powerful as health decreases.",
    name: "Savage Fury",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Sneaky Tricks": {
    description:
      "Increased chances of successfully stealing or evading detection.",
    name: "Sneaky Tricks",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Lucky Charm": {
    description: "Occasionally gains a small advantage in critical situations.",
    name: "Lucky Charm",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Arcane Brilliance": {
    description: "Innate proficiency in arcane magic.",
    name: "Arcane Brilliance",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Inventive Mind": {
    description: "Can create and utilize unique gadgets and contraptions.",
    name: "Inventive Mind",
    cooldown: 3,
    type: "decrease_hit",
  },

  // Familiars

  "Wannabe Dragon": {
    description:
      "Believes he became a dragon, increasing attack speed and damage temporarily.",
    name: "Wannabe Dragon",
    cooldown: 3,
    type: "buff_self",
    logicType: "increase_attack_and_increase_speed",
    unique: true,
    value_amount: { attack: 110, speed: 20 },
    turnLimit: 1,
    flat: true,
  },
  "Fire Spit": {
    name: "Fire Spit",
    description: "Attack with a goddamn puke",
    cooldown: 3,
    type: "attack",
  },
  "Ice Breath": {
    description: "Freezes an enemy, slowing their movement and attack speed.",
    name: "Ice Breath",
    cooldown: 3,
    type: "decrease_hit",
    logicType: "decrease_speed",
    unique: true,
    value_amount: {
      speed: -0,
    },
    turnLimit: 1,
  },

  "Flame Strike": {
    name: "Flame Strike",
    description: "Attack with a fiery strike",
    cooldown: 3,
    type: "decrease_hit",
  },
  "Dragon Claw": {
    name: "Dragon Claw",
    description: "Slash with powerful dragon claws",
    cooldown: 2,
    type: "decrease_hit",
  },
   "Aqua Blast": {
    name: "Aqua Blast",
    description: "Blast your opponent with water",
    cooldown: 3,
    type: "attack",
  },
  "Healing Wave": {
    description: "Freezes an enemy, slowing their movement and attack speed.",
    name: "Ice Breath",
    cooldown: 3,
    type: "increase_many",
    logicType: "increase_hp",
    unique: true,
    value_amount: {
      speed: -0,
    },
    turnLimit: 1,
  },
  "Fire Breath": {
    name: "Fire Breath",
    description: "Breathe fire on your opponent",
    cooldown: 0,
    type: "decrease_hit",
  },

  "Tail Swipe": {
    name: "Tail Swipe",
    description: "Swipe your opponent with your tail",
    cooldown: 0,
    type: "decrease_hit",
  },
  "Venom Strike": {
    name: "Venom Strike",
    description: "Strike your opponent with venom",
    cooldown: 0,
    type: "decrease_hit",
  },
  "Web Trap": {
    name: "Web Trap",
    description: "Trap your opponent in a web",
    cooldown: 0,
    type: "decrease_hit",
  },
};

export default abilities;
