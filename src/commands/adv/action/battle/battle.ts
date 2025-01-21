import { mongoClient } from "../../../../data/mongo/mongo";
const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");

import { quests } from "../../quest/quests";
import {
  critOrNot,
  checkResults,
  toCamelCase,
  generateAttackBarEmoji,
  generateHPBarEmoji,
  getPlayerMoves,
  handleTurnEffects,
  cycleCooldowns,
  getAbilities,
} from "../../../util/glogic";
import { bosses } from "../../../data/monsterInfo/bosses";
import { mobs } from "../../../data/monsterInfo/mobs";
import allFamiliars from "../../../../data/information/allfamiliars";
import { BossAI } from "../../ai/boss";
import { MobAI } from "../../ai/mob";
import {
  BuffDebuffManager,
  ExtendedPlayer,
} from "../../../gamelogic/buffDebuffManager";
const { calculateDamage } = require("../../../../../rust_lib/rust_lib.node");
import classes from "../../../../data/classes/allclasses";
import abilities from "../../../../data/abilities";
import { Ability } from "../../../gamelogic/abilitiesFunction";
import { BuffDebuffLogic } from "../../../gamelogic/buffdebufflogic";

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  TextChannel,
  Interaction,
  Message,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from "discord.js";
interface hasAllies {
  name: string;
  element: string;
}
export interface Enemy {
  type: string;
  name: string;
  element: string; // Primary element for the main enemy
  waves: any[];
  hasAllies: hasAllies[];
  rewards: any;
}

let initialMessage: any = null;

const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("action_normal")
    .setLabel("Basic Attack")
    .setStyle(3),
  new ButtonBuilder().setCustomId("action_dodge").setLabel("Dodge").setStyle(3)
);
import { BattleEmbed, iconMap } from "./sendEmbed";
import { BattleBarManager } from "./fillBar";
import { allEnemies } from "../../../data/monsterInfo/allEnemies";
import { addFloor } from "../../../player/scenarioUpdate/scenarioFunctions";
import { interfaceScenario } from "../../../../data/mongo/scenarioInterface";
import { Scenario, scenarios } from "../../../../data/information/scenarios";
export interface ExtendedEnemy extends Enemy {
  floorNum: number;
}
import _ from "lodash";
class Battle {
  private allEnemiesSource: typeof allEnemies;
  private bossSource: typeof bosses;
  public enemyDetails: ExtendedEnemy;
  private message: any;
  private continue: boolean;
  public player: ExtendedPlayer;
  private bossAIClass: BossAI | null;
  private mobAIClass: MobAI | null;
  private mobs: any[];
  private deckRow: any[];
  private abilityOptions: any[];
  private playerFamiliar: any[];
  public familiarInfo: any[];
  public mobInfo: any[];
  public playerName: string;
  private playerClass: any;
  private playerRace: any;
  public boss: any;
  public currentTurn: any;
  private characters: any[];
  private environment: any[];
  private abilityModal: any;
  private currentTurnIndex: number;
  private nextTurnHappenedCounter: number;
  public battleLogs: any[];
  private cooldowns: any[];
  private initialMessage: any;
  private deadFam: any[];
  private aliveEnemies: any[];
  private aliveTeam: any[];
  private deadEnemies: any[];
  public battleEmbed: any;
  private allEnemies: any[];
  private waves: any[];
  private enemyFirst: boolean;
  private pickEnemyOptions: any;
  private selectMenu: any;
  private pickedChoice: boolean;
  private enemyToHit: any;
  private ability: any;
  private buffDebuffManager: BuffDebuffManager;
  private buffDebuffLogic: BuffDebuffLogic;
  private dodge: { option: any; id: any };
  private currentTurnId: any;
  private taunted: Boolean;
  private initialisedEmbed: any;
  private barManager: BattleBarManager;
  private currentWave: number;
  private selectedScenario: interfaceScenario;

  constructor(
    player: ExtendedPlayer,
    enemy: ExtendedEnemy,
    message: any,
    existScenario: interfaceScenario
  ) {
    this.taunted = false;
    this.allEnemiesSource = JSON.parse(JSON.stringify(allEnemies));
    this.bossSource = JSON.parse(JSON.stringify(bosses));
    this.enemyDetails = enemy;
    this.message = message;
    this.continue = true;
    this.player = player;
    this.bossAIClass = null;
    this.mobAIClass = null;
    this.mobs = [];
    this.deckRow = [];
    this.selectedScenario = existScenario;
    this.abilityOptions = [];
    this.playerFamiliar = [];
    this.currentTurnId = null;
    console.log("yes");

    if (player.deck) {
      this.deckRow = player.deck;
    } else {
      console.log("Player deck is missing!");
    }

    this.familiarInfo = [];
    this.mobInfo = [];
    this.playerName = this.player.name;
    this.playerClass = null;
    this.playerRace = null;

    if (this.enemyDetails.type === "boss") {
      this.boss = this.bossSource[this.enemyDetails.name];
    } else {
      this.boss = this.bossSource["Dragon Lord"];
    }

    this.currentTurn = null;
    this.characters = [];
    this.environment = [];
    this.abilityModal = false;
    this.currentTurnIndex = 0;
    this.nextTurnHappenedCounter = 0;
    this.battleLogs = [];
    this.cooldowns = [];
    this.initialMessage = initialMessage;
    this.deadFam = [];
    this.aliveEnemies = [];
    this.deadEnemies = [];
    this.battleEmbed = null;
    this.allEnemies = [];
    this.aliveTeam = [];
    this.waves = this.enemyDetails.waves;
    this.enemyFirst = false;
    this.pickEnemyOptions = null;
    this.selectMenu = null;
    this.pickedChoice = false;
    this.enemyToHit = null;
    this.ability = new Ability(this);
    this.buffDebuffManager = new BuffDebuffManager(this);
    this.buffDebuffLogic = new BuffDebuffLogic(this);
    this.dodge = { option: null, id: null };
    this.initialisedEmbed = null;
    this.barManager = new BattleBarManager();
    this.currentWave = 0;
  }
  async initialiseStuff(): Promise<void> {
    console.log("initialised");
    try {
      for (const familiar of [...this.deckRow]) {
        if (
          familiar.name &&
          familiar.name !== "empty" &&
          familiar.name !== null &&
          familiar.name !== this.player.name
        ) {
          const matchingFamiliar = this.player.collectionInv.find(
            (item: any) => item.serialId === familiar.serialId
          );

          if (matchingFamiliar) {
            this.familiarInfo.push(matchingFamiliar);
          }
        }
      }

      if (this.enemyDetails.type === "boss") {
        this.boss = this.bossSource[this.enemyDetails.name];
        this.bossAIClass = new BossAI(this, this.enemyDetails);
        this.allEnemies.push(this.boss);
      } else {
        this.boss = this.bossSource["Dragon Lord"];
      }

      this.mobs.push({
        name: this.enemyDetails.name,
        element: this.enemyDetails.element, // First element for the main mob
      });

      if (
        this.enemyDetails.type === "mob" &&
        !this.enemyDetails.hasAllies.includes({ name: "none", element: "none" })
      ) {
        this.enemyDetails.hasAllies.forEach((allyName) => {
          this.mobs.push({
            name: allyName.name,
            element: allyName.element || "Unknown", // Use next elements for allies
          });
        });
      }

      this.getNextWave();

      if (this.enemyDetails.type === "boss") {
        console.log("preTtygay;");
        this.characters = [this.player, ...this.familiarInfo, this.boss];
      } else {
        this.characters = [this.player, ...this.familiarInfo, ...this.mobInfo];
      }
      this.aliveTeam = [this.player, ...this.familiarInfo];

      if (this.player.class != null) {
        this.playerClass = this.player.class;
        this.continue = true;
      } else if (this.player.class === null) {
        (this.message.channel as TextChannel).send(
          "You have to select a class first, use a!selectclass"
        );
        console.log("You have to select a class first, use a!selectclass");
        this.continue = false;
        return;
      }

      if (this.player.race != null) {
        this.playerRace = this.player.race;
      } else if (this.player.class === null) {
        (this.message.channel as TextChannel).send(
          "You have to select a race first, use a!selectrace"
        );
      }

      for (const character of this.characters) {
        try {
          character.maxHp = character.stats.hp;
        } catch (error) {
          console.log("fillBarError:", error);
        }
        character.atkBar = 0;
        character.attackBarEmoji = [];
        character.hpBarEmoji = [];
        character.statuses = {
          buffs: [],
          debuffs: [],
        };
      }

      this.aliveEnemies = this.allEnemies.flat();
    } catch (error) {
      console.log("The error is here:", error);
    }
  }

  //
  async startEmbed(): Promise<void> {
    console.log("initialising");
    await this.initialiseStuff();
    let selectedValue: string | undefined;

    // Create the embed for the adventure command
    this.battleEmbed = new EmbedBuilder()
      .setTitle(`Fight: ${this.enemyDetails.name}`)
      .setDescription(
        `**Player and familiars:**\n __${this.player.name}__ Level: ${
          this.player.exp.level
        } \n __Familiars selected__: ${this.familiarInfo
          .map((familiar: { name: string }) => familiar.name)
          .join(
            ", "
          )} \n\n **Enemy Info**:\nLevel: It not made smh\n Click on the options in the button to find **available** info about the enemies! 
  
          **Automate this battle?**
          Automating has its own issues it does worse than you normally would!! \n\n **Your Power Level vs Recommended**\n- being cooked still\n\n **Difficulty**\n- cooking fr\n\n **Start Battle**\n To start, click on the "Lets Dive into it" button!!`
      );

    // Display options for quests, bosses, mobs, and adventures
    const optionSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("option_krlo")
      .setPlaceholder("Select an option")
      .addOptions([
        { label: "Bosses", value: "klik_bosses" },
        { label: "Mobs", value: "klik_mobs" },
        { label: "Fight", value: "klik_fight" },
      ]);

    const stringMenuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        optionSelectMenu
      );

    const gaeMessage = await (this.message.channel as TextChannel).send({
      embeds: [this.battleEmbed],
      components: [stringMenuRow],
    });

    const filter = (i: any) =>
      ["start_adventure", "cancel_adventure"].includes(i.customId) ||
      i.customId === "option_krlo" ||
      i.customId === "go_in";

    const collector = await gaeMessage.createMessageComponentCollector({
      filter,
      time: 300000,
    });

    collector.on("collect", async (i: any) => {
      if (i.customId === "option_krlo") {
        i.deferUpdate();
        selectedValue = i.values[0]; // Get the selected value

        if (selectedValue?.startsWith("klik_")) {
          console.log("bro clicked fr??:", selectedValue);
          const selectedValueName = selectedValue.replace("klik_", "");
          if (selectedValueName === "fight") {
            await gaeMessage.delete();
            console.log("continue?");
            if (this.continue) {
              console.log("continue hogaya");
              this.startBattle(this.message);
            }
          }
        }
      }
    });
  }
  async getNextTurn(): Promise<ExtendedPlayer | null> {
    let nextTurn: ExtendedPlayer | null = null;
    console.log("Happening1nextTurn");
    const charactersWith100AtkBar = await this.barManager.fillAtkBars(
      this.characters
    );
    console.log("it did reach here");
    if (charactersWith100AtkBar.length === 1) {
      const characterWith100AtkBar = charactersWith100AtkBar[0];

      this.currentTurn = characterWith100AtkBar;
      this.currentTurnId = characterWith100AtkBar._id;

      characterWith100AtkBar.atkBar -= 100;

      characterWith100AtkBar.attackBarEmoji = await generateAttackBarEmoji(
        characterWith100AtkBar.atkBar
      );
    } else if (charactersWith100AtkBar.length > 1) {
      // If multiple characters have reached 100 attack bar, determine the next turn based on speed
      charactersWith100AtkBar.sort((a, b) => b.atkBar - a.atkBar);
      let fastestCharacter = charactersWith100AtkBar[0];
      this.currentTurn = fastestCharacter;
      this.currentTurnId = fastestCharacter._id;
      console.log("fastestCharacter:", fastestCharacter.name);
      fastestCharacter.atkBar -= 100;
      fastestCharacter.attackBarEmoji = await generateAttackBarEmoji(
        fastestCharacter.atkBar
      );
    }

    await this.barManager.fillHpBars(this.characters);
    if (this.nextTurnHappenedCounter >= 1) await this.printBattleResult();

    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.performEnemyTurn();

    this.nextTurnHappenedCounter++;
    return nextTurn;
  }

  async performEnemyTurn(): Promise<void> {
    // Ensure the current turn belongs to an enemy

    const currentEnemy = this.aliveEnemies.find(
      (enemy) => enemy.name === this.currentTurn.name
    );

    if (!currentEnemy) {
      console.log("No valid enemy found for this turn.");
      return;
    }

    // Determine the target (30% chance to target player, otherwise target a random alive familiar)
    const isTargetingPlayer = Math.random() < 0.3;
    const aliveFamiliars = this.familiarInfo.filter(
      (familiar) => familiar.stats.hp > 0
    );
    const targetInfo =
      isTargetingPlayer || aliveFamiliars.length === 0
        ? this.player
        : aliveFamiliars[Math.floor(Math.random() * aliveFamiliars.length)];
    const damage = await this.mobAIClass?.move(this.currentTurn, targetInfo);

    await this.handleStatusEffects(
      targetInfo,
      damage ? damage : 0,
      currentEnemy
    );
    console.log("gogogogo");

    await this.getNextTurn();
    // this.printBattleResult();
    await cycleCooldowns(this.cooldowns);

    // await this.performEnemyTurn();
  }

  async performTurn(): Promise<void> {
    console.log(
      "attacker:",
      this.currentTurn.name,
      "attacking",
      this.enemyToHit.name
    );
    const damage = await this.calculatePFDamage(
      this.currentTurn,
      this.enemyToHit
    );

    // Handle dodge mechanics
    await this.handleStatusEffects(this.enemyToHit, damage, this.currentTurn);
  }
  async handleDodge(
    attacker: ExtendedPlayer,
    target: ExtendedPlayer
  ): Promise<boolean> {
    if (this.dodge.id !== target._id && this.dodge.id !== target.id)
      return false;

    const dodgeOptions: { [key: string]: () => Promise<void> } = {
      dodge_and_increase_attack_bar: async () => {
        target.atkBar += 20;
        this.battleLogs.push(
          `- ${target.name} swiftly dodges the attack increasing 20 attack bar!!`
        );
      },
      dodge: async () => {
        this.battleLogs.push(`- ${target.name} barely dodges the attack!`);
      },
      reduce_damage: async () => {
        const damage = await this.calculatePFDamage(attacker, target);
        const reducedDamage = damage / 2;
        target.stats.hp -= reducedDamage;
        this.battleLogs.push(
          `- ${attacker.name} attacks ${
            target.name
          } for ${reducedDamage} damage. Reduced ${
            damage - reducedDamage
          } damage!!`
        );
      },
      take_hit: async () => {
        const damage = await this.calculatePFDamage(attacker, target);
        target.stats.hp -= damage;
        this.battleLogs.push(
          `+ ${attacker.name} attacks ${target.name} for ${damage} damage. Failed to dodge!`
        );
      },
      take_15x_damage: async () => {
        const damage = await this.calculatePFDamage(attacker, target);
        const increasedDamage = damage * 2;
        target.stats.hp -= increasedDamage + damage;
        this.battleLogs.push(
          `+ ${attacker.name} attacks ${target.name} for ${damage} damage and ${increasedDamage}. ${target.name} slipped and fell while trying to dodge!`
        );
      },
    };

    const dodgeOption = this.dodge.option;
    if (dodgeOptions[dodgeOption]) {
      await dodgeOptions[dodgeOption]();
      return true;
    }

    return false;
  }

  async handlePreTurnEffects(
    target: ExtendedPlayer,
    type: "debuffs" | "buffs"
  ): Promise<boolean> {
    const statusEffects: {
      [key: string]: { apply: (target: ExtendedPlayer) => boolean };
    } = {
      freeze: {
        apply: (target) => {
          this.battleLogs.push(
            `- ${target.name} is frozen and cannot act this turn.`
          );
          console.log("frozen haha");
          return true; // Turn is skipped
        },
      },
      stun: {
        apply: (target) => {
          this.battleLogs.push(
            `- ${target.name} is stunned and cannot act this turn.`
          );
          return true; // Turn is skipped
        },
      },
      sleep: {
        apply: (target) => {
          this.battleLogs.push(
            `- ${target.name} is asleep and cannot act this turn.`
          );
          return true; // Turn is skipped
        },
      },
      burn: {
        apply: (target) => {
          target.stats.hp -= Math.floor(target.stats.hp * 0.05);
          console.log("beep");
          this.battleLogs.push(
            `- ${target.name} is burning and lost 5% of HP.`
          );
          return false; // Turn is skipped
        },
      },
      taunt: {
        apply: (target: any) => {
          this.taunted = true;
          const targetted = target.statuses.debuffs["taunt"].target;
          this.battleLogs.push(
            `- ${target.name} is taunted and must target the taunter.`
          );
          return false; // Turn is not skipped, but actions are restricted
        },
      },
      // Add other status effects here
    };

    let statuses;
    if (type === "debuffs") {
      statuses = target.statuses.debuffs || {};
    } else if (type === "buffs") {
      statuses = target.statuses.buffs || {};
    }
    if (!statuses || Object.keys(statuses).length === 0) {
      return false; // No status effects to handle
    }
    for (const status of Object.values(statuses) as any) {
      for (const [effect, { apply }] of Object.entries(statusEffects)) {
        console.log("status:", status, "effect:", effect);
        if (status[effect] && apply(target)) {
          return true;
        }
      }
    }

    return false;
  }
  async handleStatusEffects(
    target: any,
    damage: number,
    attacker: any,
    name?: string
  ): Promise<void | boolean> {
    const dodgeEffect = await this.handleDodge(attacker, target);
    console.log("IT CMAE ");
    if (dodgeEffect) {
      await handleTurnEffects(attacker);
      this.dodge = { option: null, id: null };
      return;
    }

    if (target.isNPC === true) {
      return;
    }

    const statusEffectsOnDamage: {
      [key: string]: {
        apply: (target: any) => boolean;
      };
    } = {
      invincible: {
        apply: () => {
          this.battleLogs.push(
            `- ${target.name}'s invincibility nullifies the attack.`
          );
          damage = 0;
          return true;
        },
      },
      reflect: {
        apply: () => {
          const reflectDamage = Math.floor(damage * 0.4);
          this.getCurrentAttacker().stats.hp -= reflectDamage;
          this.battleLogs.push(
            `- ${target.name} reflects ${reflectDamage} damage back to the attacker.`
          );
          return true;
        },
      },
      endure: {
        apply: () => {
          if (target.stats.hp - damage <= 0) {
            target.stats.hp = 1;
            this.battleLogs.push(
              `- ${target.name} endures the hit and stays at 1 HP.`
            );
            return true; // Damage is nullified
          }
          return false; // No effect
        },
      },
      // Add more status effects as needed
    };

    let statuses = target.statuses.buffs || [];
    console.log("statuses:", statuses);

    if (!statuses || statuses.length === 0) {
      await handleTurnEffects(attacker);
      target.stats.hp -= damage;
      console.log("YAS DANGIT");
      this.battleLogs.push(
        `+ ${attacker.name} attacks ${target.name} for ${damage} damage using ${
          name !== undefined ? name : "an attack"
        }`
      );
      return false; // No status effects to handle
    }

    let isTrue = false;
    for (const status of statuses) {
      for (const [effect, { apply }] of Object.entries(statusEffectsOnDamage)) {
        console.log("status:", status, "effect:", effect);
        if (status[effect] && apply(target)) {
          console.log("happu");
          isTrue = true;
        }
      }
    }

    if (isTrue) {
      await handleTurnEffects(attacker);
      return true;
    } else {
      console.log("YAS TRUE");
      target.stats.hp -= damage;
      this.battleLogs.push(
        `+ ${this.currentTurn.name} attacks ${target.name} for ${damage} damage using an attack`
      );
      console.log("attackerAttacking:", attacker);

      await handleTurnEffects(attacker);
      return false;
    }
  }

  getCurrentAttacker() {
    return this.currentTurn;
  }

  getEnemyTarget() {
    const isTargetingPlayer = Math.random() < 0.3;
    const aliveFamiliars = this.familiarInfo.filter(
      (familiar) => familiar.stats.hp > 0
    );
    return isTargetingPlayer || aliveFamiliars.length < 1
      ? this.player
      : aliveFamiliars[Math.floor(Math.random() * aliveFamiliars.length)];
  }

  async calculatePFDamage(attacker: any, target: any) {
    return critOrNot(
      attacker.stats.critRate,
      attacker.stats.critDamage,
      attacker.stats.attack,
      target.stats.defense,
      attacker.stats.attack
    );
  }
  async getDuelActionRow(): Promise<any[]> {
    console.log("duelRowCAction is being called");
    let moveFinder: any;
    let playerAbility: any;
    let hahaThatIsTrue: boolean = false;
    if (this.familiarInfo.includes(this.currentTurn)) {
      moveFinder = this.currentTurn.ability.map((abilityName: string) =>
        getAbilities(abilityName)
      );

      hahaThatIsTrue = true;
    } else if (this.currentTurn.name === this.player.name) {
      playerAbility = classes[this.player.class].abilities;
      moveFinder = playerAbility.map((abilityName: string) =>
        getPlayerMoves(abilityName)
      );
      hahaThatIsTrue = true;
    }
    if (hahaThatIsTrue) {
      try {
        // console.log('moveFinder:', moveFinder)
        this.abilityOptions = moveFinder
          .map((ability: any) => {
            if (
              ability &&
              ability.selection != undefined &&
              !this.cooldowns.some((cooldown) => cooldown.name === ability.name)
            ) {
              return {
                label: ability.name,
                description: ability.description,
                value: `selection-${ability.name}`,
              };
            } else if (
              ability &&
              ability.description &&
              !this.cooldowns.some((cooldown) => cooldown.name === ability.name)
            ) {
              return {
                label: ability.name,
                description: ability.description,
                value: `ability-${ability.name}`,
              };
            }
          })
          .filter(Boolean); // Remove undefined items
        // Sort cooldowns by lowest cooldown first and add cooldowns option

        const cooldownDescriptions =
          this.cooldowns.length > 0
            ? "Click here to see your cooldowns"
            : "There are no cooldowns currently.";
        this.abilityOptions.push({
          label: "Cooldowns",
          description: cooldownDescriptions,
          value: "cooldowns",
        });
        // If there are no abilities available, add a failsafe option);

        if (this.abilityOptions.length === 1) {
          this.abilityOptions.push({
            label: "Cooldown",
            description: "Your abilities are on cooldown",
            value: "cooldown",
          });
        }
        // console.log('abilityOptions:', this.abilityOptions)
      } catch (error) {
        console.log("moveOptionsError:", error);
      }
    }

    for (const enemy of this.allEnemies) {
      if (enemy.name === this.currentTurn.name) {
        this.enemyFirst = true;
        this.abilityOptions = [
          {
            label: "namename",
            description: "whatever",
            value: "uh oh",
          },
        ];
        this.performEnemyTurn();
      }
    }
    this.pickEnemyOptions = this.aliveEnemies.map((enemy, index) => ({
      label: enemy.name,
      description: `Attack ${enemy.name}`,
      value: `enemy_${index}`,
    }));
    let rows: any;
    // Add a fallback option if no valid options exist
    if (this.pickEnemyOptions.length === 0) {
      this.pickEnemyOptions.push({
        label: "No Targets",
        description: "No enemies available to attack.",
        value: "no_target",
      });
    }

    try {
      // Add fallback for abilityOptions
      if (this.abilityOptions.length === 0) {
        this.abilityOptions.push({
          label: "No Abilities",
          description: "No abilities available.",
          value: "no_ability",
        });
      }
      this.selectMenu = new StringSelectMenuBuilder()
        .setCustomId("action_select")
        .setPlaceholder("Select the target")
        .addOptions(this.pickEnemyOptions);
      //   console.log('This.selectEmnu:', this.selectMenu)

      const stringMenu = new StringSelectMenuBuilder()
        .setCustomId("starter")
        .setPlaceholder("Pick Ability!")
        .addOptions(this.abilityOptions);

      const stringMenuRow = new ActionRowBuilder().addComponents(stringMenu);
      // console.log('stringMENUROW:', stringMenuRow)
      const gaeRow = new ActionRowBuilder().addComponents(
        await this.selectMenu
      );

      rows = [buttonRow, stringMenuRow, gaeRow];
    } catch (error) {
      console.log("error:", error);
    }
    return rows;
  }

  async printBattleResult(): Promise<void> {
    let updatedEmbed;
    for (const character of this.aliveEnemies) {
      if (character.stats.hp < 0) {
        this.battleLogs.push(`${character.name} died poggers`);
        character.stats.speed = 0;
        character.atkBar = 0;
        character.stats.hp = 0;
        this.deadEnemies.push(character.name);

        this.aliveEnemies = this.aliveEnemies.filter(
          (enemy) => enemy !== character
        );
        break;
      }
    }

    for (const character of this.aliveTeam) {
      if (character.stats.hp < 0 && !this.deadFam.includes(character.name)) {
        this.battleLogs.push(`${character.name} died lol`);
        character.stats.speed = 0;
        character.atkBar = 0;
        character.stats.hp = 0;
        this.deadFam.push(character.name);
        this.aliveTeam.filter((item) => item !== character);
        console.log("ALIVEFAM:", this.deadFam);
        break;
      }
    }

    if (this.aliveEnemies.length === 0) {
      if (this.getNextWave() === true) {
        const rewards = this.enemyDetails.rewards;
        if (this.player.activeQuests) {
          for (const activeQuestName in this.player.activeQuests) {
            if (this.player.activeQuests.hasOwnProperty(activeQuestName)) {
              const activeQuestDetails = quests[activeQuestName];
              const activeQuestDetails2 =
                this.player.activeQuests[activeQuestName];
              console.log(`stuffHere: ${activeQuestDetails.title}`);
              console.log(`stuffHere: ${activeQuestDetails2.objectives[0]}`);
            }
          }
        }

        this.mobs.forEach((mobName) => {
          for (const questName in this.player.activeQuests) {
            if (this.player.activeQuests.hasOwnProperty(questName)) {
              const objectives = this.player.activeQuests[questName].objectives;

              // Iterate through all objective elements
              for (const objective of objectives) {
                console.log("objectiveNameTargetnotMatch:", objective.target);
                if (objective.target === mobName) {
                  console.log("objectiveNameTarget:", objective.target);
                  // Match found, increment objective.current by 1
                  objective.current = objective.current + 1;
                  console.log("thisisobjective.current:", objective.current);
                }
              }
            }
          }
        });

        try {
          const filter = { _id: this.player._id };
          const playerData2 = await collection.findOne(filter);
          if (playerData2) {
            // Create an object with only the xp property to update
            const updates = {
              $inc: {
                "exp.xp": rewards.experience,
                "balance.coins": rewards.gold,
              },
              $set: { activeQuests: this.player.activeQuests },
            };
            console.log("rewards.xpereince:", rewards.experience);
            // Update the player's document with the xpUpdate object
            await collection.updateOne(filter, updates);

            console.log("Player XP updated:", updates);
          } else {
            console.log("Player not found or updated.");
          }
        } catch (error) {
          console.error("Error updating player XP:", error);
        }
        console.log("thisplayeractiveQuest:", this.player.activeQuests);

        this.battleEmbed.setFields({
          name: "You won the battle against the Monster, you can continue the journey where you left off (I lied you can't)!!",
          value: `Rewards:\n Exp: ${rewards.experience}, Gold: ${rewards.gold}`,
          inline: true,
        });
        this.battleEmbed.setDescription("GGs You've won");
        this.initialMessage.edit({
          embeds: [this.battleEmbed],
          components: [],
        });
        const selectedScenario = scenarios.find((scenario: Scenario) => {
          return scenario.id === this.selectedScenario.id;
        });
        if (selectedScenario) {
          console.log("enemyDetails.FloorNum", this.enemyDetails.floorNum);
          const nextFloor = selectedScenario.floors[this.enemyDetails.floorNum];
          console.log("selectedScenario", selectedScenario);
          console.log("nextFloor:", nextFloor);
          console.log("this.player.id", this.player.id);
          await addFloor(this.player._id, this.selectedScenario.name, {
            floorNumber: nextFloor.floorNumber,
            miniboss: nextFloor.miniboss,
            boss: nextFloor.boss,
            rewarded: false,
            cleared: false,
          });
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));

        updatedEmbed = await this.initialisedEmbed.sendInitialEmbed(
          this.currentTurn,
          this.mobInfo
        );
        this.initialMessage.edit({
          embeds: [updatedEmbed],
          components: await this.getDuelActionRow(),
        });
      }
    } else if (this.player.stats.hp < 0) {
      this.message.channel.send("You lost, skill issue.");
      this.player.stats.speed = 0;
    } else {
      updatedEmbed = await this.initialisedEmbed.sendInitialEmbed(
        this.currentTurn,
        this.mobInfo
      );
      this.initialMessage.edit({
        embeds: [updatedEmbed],
        components: await this.getDuelActionRow(),
      });
    }
  }

  async critOrNotHandler(
    critRate: number,
    critDamage: number,
    attack: number,
    defense: number,
    target: any,
    ability: any,
    name: string
  ) {
    const damage = await critOrNot(
      critRate,
      critDamage,
      attack,
      defense,
      ability
    );

    await this.handleStatusEffects(target, damage, this.currentTurn, name);
  }
  async startBattle(message: any): Promise<void> {
    console.log("startBattle");

    await this.getNextTurn();
    this.initialisedEmbed = new BattleEmbed(this);
    console.log("currentTurn:", this.currentTurn.name);

    this.initialMessage = await this.initialisedEmbed.sendInitialEmbed(
      this.currentTurn,
      this.mobInfo
    );

    this.initialMessage = await (message.channel as TextChannel).send({
      embeds: [this.initialMessage],
      components: await this.getDuelActionRow(),
    });

    if (this.enemyFirst) {
      this.printBattleResult();
      const updatedEmbed = await this.initialisedEmbed.sendInitialEmbed(
        this.currentTurn,
        this.mobInfo
      );
      await this.initialMessage.edit({
        embeds: [updatedEmbed],
        components: await this.getDuelActionRow(),
      });
    }

    const filter = (i: any) =>
      (i.user.id === message.user.id && i.customId.startsWith("action_")) ||
      i.customId === "starter";

    const collector = this.initialMessage.createMessageComponentCollector({
      filter,
      time: 600000,
    });
    collector.on("collect", async (i: any) => {
      try {
        if (!["starter"].includes(i.customId)) {
          await i.deferUpdate(); // Defer for all cases except those that require immediate responses (like modals).
        }

        switch (i.customId) {
          case "action_normal":
            await this.handleActionNormal(i);
            break;

          case "action_select":
            await this.handleActionSelect(i);
            break;

          case "starter":
            await this.handleStarterSelection(i);
            break;

          case "action_dodge":
            await this.handleDodgeAction(i);
            break;

          default:
            console.error(`Unhandled customId: ${i.customId}`);
        }
      } catch (error) {
        console.error("Error handling interaction:", error);
        try {
          await i.followUp({
            content: "An error occurred. Please try again later.",
            ephemeral: true,
          });
        } catch {
          console.error("Failed to send follow-up for the error.");
        }
      }
    });
  }
  async handleStarterSelection(i: any) {
    const selectedClassValue = i.values[0];

    if (selectedClassValue.startsWith("selection-")) {
      try {
        const abilityName = selectedClassValue.replace("selection-", "");
        const ability = abilities[abilityName];

        if (!ability || !ability.selection) {
          console.error("Ability not found or has no selection property");
          return;
        }

        const selectionType = ability.selection;

        if (selectionType.startsWith("modal_")) {
          const requiredCount = parseInt(
            selectionType.replace("modal_", ""),
            10
          );

          if (isNaN(requiredCount)) {
            console.error("Invalid modal format:", selectionType);
            return;
          }

          const teamTargets = this.aliveTeam;
          const enemyTargets = this.aliveEnemies;

          const maxTargets = ability.type.includes("buff")
            ? teamTargets.length
            : enemyTargets.length;
          const actualRequiredCount = Math.min(requiredCount, maxTargets);

          const modal = new ModalBuilder()
            .setCustomId(`modal_${abilityName}`)
            .setTitle(`Select ${actualRequiredCount} Target(s)`);

          const textInput = new TextInputBuilder()
            .setCustomId("target_input")
            .setLabel(`Enter exactly ${actualRequiredCount} target(s)`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder(
              `Enter numbers (e.g., 1,2,3). Max: ${actualRequiredCount}`
            );

          const modalRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);

          modal.addComponents(modalRow);

          // Show the modal to the user
          await i.showModal(modal);

          // Listen for modal submission specific to this ability
          const filter = (modalInteraction: ModalSubmitInteraction) =>
            modalInteraction.customId === `modal_${abilityName}` &&
            modalInteraction.user.id === i.user.id;

          try {
            const modalInteraction = await i.awaitModalSubmit({
              filter,
              time: 60000,
            });

            const input =
              modalInteraction.fields.getTextInputValue("target_input");

            const selectedIndices = input
              .split(",")
              .map((index: any) => parseInt(index.trim(), 10))
              .filter(
                (index: any) =>
                  !isNaN(index) && index >= 1 && index <= maxTargets
              );

            if (selectedIndices.length !== actualRequiredCount) {
              await modalInteraction.reply({
                content: `Invalid input. Please provide exactly ${actualRequiredCount} valid targets.`,
                ephemeral: true,
              });
              return;
            }

            const selectedTargets = ability.type.includes("buff")
              ? selectedIndices.map(
                  (index: number) => this.aliveTeam[index - 1]
                )
              : selectedIndices.map(
                  (index: number) => this.aliveEnemies[index - 1]
                );

            if (selectedTargets.some((target: any) => !target)) {
              await modalInteraction.reply({
                content: `One or more selected targets are invalid. Please try again.`,
                ephemeral: true,
              });
              return;
            }
            await modalInteraction.deferUpdate();
            console.log("selectedTargets", selectedTargets);

            // Execute the ability with the selected targets
            await this.ability.executeAbility(
              this.currentTurn,
              selectedTargets,
              this.aliveEnemies,
              this.aliveTeam,
              abilityName
            );

            await cycleCooldowns(this.cooldowns);
            await this.getNextTurn();

            const updatedEmbed = await this.initialisedEmbed.sendInitialEmbed(
              this.currentTurn,
              this.mobInfo
            );
          } catch (error) {
            console.error("Modal submission timed out or was invalid:", error);
            await i.followUp({
              content: `Time ran out or submission was invalid. Please try again.`,
              ephemeral: true,
            });
          }
        }
      } catch (error) {
        console.error("Error processing selection:", error);
      }
    } else if (selectedClassValue === "cooldowns") {
      await i.deferUpdate();
      console.log("check cooldowns", this.cooldowns);

      // Filter out cooldowns that are zero and await the cooldown promises
      const filteredCooldowns = await Promise.all(
        this.cooldowns.filter(async (cooldown) => (await cooldown.cooldown) > 0)
      );

      // Map the filtered cooldowns to descriptions
      const cooldownDescriptions = await Promise.all(
        filteredCooldowns.map(
          async (cooldown) =>
            `**${cooldown.name}**: ${await cooldown.cooldown} turns left`
        )
      );

      i.followUp({
        content: `**Cooldowns**\n${cooldownDescriptions.join("\n")}`,
        ephemeral: true,
      });
    } else if (selectedClassValue.startsWith("ability-")) {
      await i.deferUpdate();
      if (this.pickedChoice || this.aliveEnemies.length === 1) {
        this.pickedChoice = true;

        if (this.aliveEnemies.length === 1) {
          this.enemyToHit = this.aliveEnemies[0];
        }
        try {
          const abilityName = selectedClassValue.replace("ability-", "");
          const abilityNameCamel = await toCamelCase(abilityName);

          //bye byuee
          this.ability.executeAbility(
            this.currentTurn,
            this.enemyToHit,
            this.aliveEnemies,
            this.aliveTeam,
            abilityName
          );
          await cycleCooldowns(this.cooldowns);
          await this.getNextTurn();
          // await this.performEnemyTurn();

          // this.printBattleResult();
          const updatedEmbed = await this.initialisedEmbed.sendInitialEmbed(
            this.currentTurn,
            this.mobInfo
          );
        } catch (error) {
          console.error("Error on hit:", error);
          (i.channel as TextChannel).send(
            'You perhaps have not selected a class yet. Please select it using "a!classselect", and select race using "a!raceselect".'
          );
        }
      } else if (!selectedClassValue.startsWith("selection-")) {
        console.log("WALLAHIIII");
        i.followUp({
          content: "Please pick an enemy to hit using the Select Menu",
          ephemeral: true,
        });
      }
    }
  }
  async handleActionNormal(i: any) {
    if (this.pickedChoice || this.aliveEnemies.length === 1) {
      this.pickedChoice = true;

      if (this.aliveEnemies.length === 1) {
        this.enemyToHit = this.aliveEnemies[0];
      }

      await this.performTurn();
      await cycleCooldowns(this.cooldowns);
      await this.getNextTurn();
    } else {
      await i.followUp({
        content: "Please pick an enemy to hit using the Select Menu",
        ephemeral: true,
      });
    }
  }
  async handleActionSelect(i: any) {
    const targetIndex = i.values[0];
    const realTarget = targetIndex.replace("enemy_", "");
    this.enemyToHit = this.aliveEnemies[parseInt(realTarget, 10)];
    this.pickedChoice = true;

    await i.followUp({
      content: `Target selected: ${this.enemyToHit.name}`,
      ephemeral: true,
    });
  }

  async handleDodgeAction(i: any) {
    const dodgeOptions = [
      "dodge_and_increase_attack_bar",
      "dodge",
      "reduce_damage",
      "take_hit",
      "take_1.5x_damage",
    ];
    const randomDodge =
      dodgeOptions[Math.floor(Math.random() * dodgeOptions.length)];
    this.dodge.option = randomDodge;

    await this.performTurn();
    await cycleCooldowns(this.cooldowns);
    await this.getNextTurn();

    await i.followUp({
      content: `Dodge result: ${randomDodge}`,
      ephemeral: true,
    });
  }
  parseTargets(input: string): any[] | null {
    const selectedIndices = input
      .split(",")
      .map((index) => parseInt(index.trim(), 10))
      .filter((index) => !isNaN(index));

    const targets = selectedIndices.map(
      (index) =>
        this.aliveTeam[index - 1] || this.aliveEnemies[index - 1] || null
    );

    return targets.includes(null) ? null : targets;
  }
  getNextWave(): Boolean {
    console.log("Next wave happening");
    this.currentWave += 1;
    if (this.currentWave > this.enemyDetails.waves.length) {
      console.log("No more waves available.");
      return true;
    }

    // Get current wave's enemy data
    const waveInfo = this.enemyDetails.waves[this.currentWave - 1].enemies;

    this.mobInfo = this.mobs
      .map((mob, index) => {
        const mobData = this.allEnemiesSource.find(
          (enemy) => enemy.name === mob.name && waveInfo.includes(mob.name)
        );
        if (!mobData) {
          console.log(`No data found for mob: ${mob.name}`);
          return null;
        }

        const elementData = mobData.element.find(
          (el) => el.type === mob.element
        );
        if (!elementData) {
          console.log(
            `No element data found for ${mob.name} with type ${mob.element}`
          );
          return null;
        }
        return {
          name: _.cloneDeep(mobData.name),
          type: _.cloneDeep(mob.element),
          stats: _.cloneDeep(elementData.stats),
          abilities: _.cloneDeep(elementData.abilities),
          attackPattern: _.cloneDeep(elementData.attackPattern),
        };
      })
      .filter((mob) => mob !== null);

    this.characters = this.characters.filter(
      (char) => !this.allEnemies.some((enemy) => enemy.name === char.name) // Remove old enemies
    );
    this.allEnemies = [];
    this.characters.push(...this.mobInfo); // Add new enemies

    this.characters.push(...this.mobInfo);

    // Initialize AI for the new wave
    this.mobAIClass = new MobAI(this, this.mobInfo[0]);

    // Add the new mob info to allEnemies
    this.allEnemies.push(...this.mobInfo);
    this.aliveEnemies = this.allEnemies.flat();

    for (const character of this.allEnemies) {
      try {
        character.maxHp = character.stats.hp;
      } catch (error) {
        console.log("fillBarError:", error);
      }
      character.atkBar = 0;
      character.attackBarEmoji = [];
      character.hpBarEmoji = [];
      character.statuses = {
        buffs: [],
        debuffs: [],
      };
    }
    this.barManager.fillHpBars(this.aliveEnemies);
    console.log("they have bars now");

    // console.log("Wave updated. Current characters:", this.characters);
    return false;
  }

  // Inside the Battle class, but outside startBattle method
}

export default Battle;
