// Battle.ts
import { BattleConfig } from './types/BattleTypes';
import { BattleStateManager } from './managers/BattleStateManager';
import { StatusEffectManager } from './effects/StatusEffectManager';
import { CombatResolver } from './combat/CombatResolver';
import { TurnManager } from './managers/TurnManager';
import { WaveManager } from './managers/WaveManager';
import { BattleResultManager } from './managers/BattleResultManager';
import { BattleUI } from './ui/BattleUI';
import { BattleEmbed } from './sendEmbed';
import { BattleBarManager } from './fillBar';
import { Ability } from '../../../gamelogic/abilitiesFunction';
import { BossAI } from '../../ai/boss';
import { MobAI } from '../../ai/mob';
import { allEnemies } from '../../../data/monsterInfo/allEnemies';
import { bosses } from '../../../data/monsterInfo/bosses';
import allFamiliars from '../../../../data/information/allfamiliars';
import { TextChannel } from 'discord.js';

export type BattleMode = 'pve' | 'pvp_realtime' | 'pvp_afk';

export class Battle {
  // Core systems
  private stateManager: BattleStateManager;
  private statusEffectManager: StatusEffectManager;
  private combatResolver: CombatResolver;
  private turnManager: TurnManager;
  private waveManager: WaveManager | null;
  private battleResultManager: BattleResultManager;
  private uiManager: BattleUI;

  // Configuration and essential data
  private config: BattleConfig;
  public player: any;
  public player2: any; // Second player for PvP
  public enemyDetails: any;
  public selectedScenario: any;
  public message: any;
  public collection: any;
  public mode: BattleMode; // Battle mode

  // Game entities
  public characters: any[];
  public familiarInfo: any[];
  public player2FamiliarInfo: any[]; // Second player's familiars
  public mobInfo: any[];
  public mobs: any[];
  public allEnemies: any[];
  public boss: any;

  // AI and abilities
  public bossAIClass: BossAI | null;
  public mobAIClass: MobAI | null;
  public ability: Ability;

  // UI components
  public battleEmbed: any;
  public initialMessage: any;
  public initialisedEmbed: any;
  public barManager: BattleBarManager;

  constructor(
    player: any, 
    opponent: any, 
    message: any, 
    scenario: any = null, // Made optional for PvP
    mode: BattleMode = 'pve'
  ) {

    
    this.player = player;
    this.message = message;
    this.mode = mode;
    this.collection = require("../../../../data/mongo/mongo").mongoClient.db("Akaimnky").collection("akaillection");

    // Initialize game entities FIRST
    this.characters = [];
    this.familiarInfo = [];
    this.player2FamiliarInfo = [];
    this.mobInfo = [];
    this.mobs = [];
    this.allEnemies = [];
    this.bossAIClass = null;
    this.mobAIClass = null;

    // Initialize core systems
    this.stateManager = new BattleStateManager({
      aliveTeam: [player],
      currentWave: 0,
    });

    this.statusEffectManager = new StatusEffectManager();
    this.combatResolver = new CombatResolver(this);
    this.turnManager = new TurnManager(this);
    this.battleResultManager = new BattleResultManager(this);
    this.uiManager = new BattleUI(this);

    // Initialize based on mode
    if (mode === 'pve') {

      this.enemyDetails = opponent;
      this.selectedScenario = scenario;
      this.waveManager = new WaveManager(opponent, allEnemies, this);
      this.config = { player, enemy: opponent, message, scenario };
      this.initializePvEMode();
    } else {

      this.player2 = opponent;
      this.selectedScenario = null; // No scenario for PvP
      this.waveManager = null; // No waves for PvP
      this.config = { player, opponent, message, scenario: null, mode };
      this.initializePvPMode();
    }

    // Initialize UI components
    this.barManager = new BattleBarManager();
    this.ability = new Ability(this);
    this.initialisedEmbed = null;
    this.battleEmbed = null;
    this.initialMessage = null;
      if (mode === 'pvp_afk' && this.player2) {
    this.turnManager.initializePvPAI();
  }
    

  }

  private initializePvEMode(): void {

    
    // Initialize player deck
    if (this.player.deck) {
      this.familiarInfo = this.player.deck
        .filter((familiar: any) => familiar.name && familiar.name !== "empty" && familiar.name !== null)
        .map((familiar: any) => this.player.collectionInv.find((item: any) => item.serialId === familiar.serialId))
        .filter(Boolean);
    }

    // Initialize mobs
    this.mobs.push({
      name: this.enemyDetails.name,
      element: this.enemyDetails.element,
    });

    if (this.enemyDetails.type === "mob" && !this.enemyDetails.hasAllies.includes({ name: "none", element: "none" })) {
      this.enemyDetails.hasAllies.forEach((ally: any) => {
        this.mobs.push({
          name: ally.name,
          element: ally.element || "Unknown",
        });
      });
    }

    // Initialize boss
    if (this.enemyDetails.type === "boss") {
      this.boss = bosses[this.enemyDetails.name];
      this.bossAIClass = new BossAI(this, this.enemyDetails);
      this.allEnemies.push(this.boss);
    } else {
      this.boss = bosses["Dragon Lord"];
    }

    // Update state
    this.stateManager.updateState({
      aliveTeam: [this.player, ...this.familiarInfo],
    });
    
    }

  private initializePvPMode(): void {
 
      // Mark player2 as AI if in AFK mode
  if (this.mode === 'pvp_afk') {
    this.player2.isAI = true;
  
  }
    // Initialize player 1 deck
    if (this.player.deck) {
      this.familiarInfo = this.player.deck
        .filter((familiar: any) => familiar.name && familiar.name !== "empty" && familiar.name !== null)
        .map((familiar: any) => this.player.collectionInv.find((item: any) => item.serialId === familiar.serialId))
        .filter(Boolean);
    }

    // Initialize player 2 deck (same structure as player 1)
    if (this.player2.deck) {
      this.player2FamiliarInfo = this.player2.deck
        .filter((familiar: any) => familiar.name && familiar.name !== "empty" && familiar.name !== null)
        .map((familiar: any) => this.player2.collectionInv.find((item: any) => item.serialId === familiar.serialId))
        .filter(Boolean);
    }

    // For PvP, player2 and their familiars are the "enemies"
    this.allEnemies = [this.player2, ...this.player2FamiliarInfo];

    // Update state
    this.stateManager.updateState({
      aliveTeam: [this.player, ...this.familiarInfo],
      aliveEnemies: this.allEnemies,
    });
    
    console.log(`[Battle] PvP mode initialized - P1 Familiars: ${this.familiarInfo.length}, P2 Familiars: ${this.player2FamiliarInfo.length}`);
    this.debugPvPState();
  }

  async initialiseStuff(): Promise<void> {
  
    
    try {
      if (this.mode === 'pve') {
        await this.initializePvEStuff();
      } else {
        await this.initializePvPStuff();
      }

    } catch (error) {
      console.error("[Battle] Initialization error:", error);
      this.stateManager.updateState({ continue: false });
    }
  }

  private async initializePvEStuff(): Promise<void> {
  
    
    // Check if waveManager exists before calling getNextWave
    if (!this.waveManager) {
      console.error("[Battle] WaveManager is not initialized for PvE mode");
      this.stateManager.updateState({ continue: false });
      return;
    }

    // Get initial wave
    const waveResult = this.waveManager.getNextWave();
    this.mobInfo = waveResult.enemies;

    // Set up characters
    if (this.enemyDetails.type === "boss") {
      this.characters = [this.player, ...this.familiarInfo, this.boss];
    } else {
      this.characters = [this.player, ...this.familiarInfo, ...this.mobInfo];
    }

    // Validate player class and race
    if (!this.player.class) {
      (this.message.channel as TextChannel).send("You have to select a class first, use a!selectclass");
      this.stateManager.updateState({ continue: false });
      return;
    }

    if (!this.player.race) {
      (this.message.channel as TextChannel).send("You have to select a race first, use a!selectrace");
    }

    // Initialize character properties
    for (const character of this.characters) {
      character.maxHp = character.stats.hp;
      character.atkBar = 0;
      character.attackBarEmoji = [];
      character.hpBarEmoji = [];
      character.statuses = { buffs: [], debuffs: [] };
    }

    this.stateManager.updateState({
      aliveEnemies: this.allEnemies.flat(),
      continue: true,
    });

  }
public isPlayer2AI(): boolean {
  return this.mode === 'pvp_afk';
}
  private async initializePvPStuff(): Promise<void> {

    
    // Set up characters for PvP
    this.characters = [
      this.player, 
      ...this.familiarInfo, 
      this.player2, 
      ...this.player2FamiliarInfo
    ];

    // Validate both players have classes
    if (!this.player.class) {
      (this.message.channel as TextChannel).send("Player 1 needs to select a class first, use a!selectclass");
      this.stateManager.updateState({ continue: false });
      return;
    }

    if (!this.player2.class) {
      (this.message.channel as TextChannel).send("Player 2 needs to select a class first, use a!selectclass");
      this.stateManager.updateState({ continue: false });
      return;
    }

    // Initialize character properties for both teams
    for (const character of this.characters) {
      character.maxHp = character.stats.hp;
      character.atkBar = 0;
      character.attackBarEmoji = [];
      character.hpBarEmoji = [];
      character.statuses = { buffs: [], debuffs: [] };
    }

    this.stateManager.updateState({
      aliveEnemies: this.allEnemies,
      continue: true,
    });
    
  }

  // NEW: Direct PvP battle start method
  async startPvPBattleDirectly(): Promise<void> {
    
    try {
      await this.initialiseStuff();
      
      const state = this.stateManager.getState();
      if (!state.continue) {
        console.log("[Battle] PvP initialization failed, cannot continue");
        return;
      }


      await this.startBattle(this.message);
      
    } catch (error) {
      console.error("[Battle] Error in startPvPBattleDirectly:", error);
      (this.message.channel as TextChannel).send({
        content: "⚠️ Failed to start PvP battle. Please try again."
      });
    }
  }

  async startEmbed(): Promise<void> {

    
    try {
      // For PvP modes, skip the initial embed and go directly to battle
      if (this.mode === 'pvp_realtime' || this.mode === 'pvp_afk') {
        await this.startPvPBattleDirectly();
        return;
      }

      // Existing PvE logic remains the same
      await this.initialiseStuff();
      
      const state = this.stateManager.getState();
      if (!state.continue) return;

      // Create and send initial embed with battle selection
      const { embed, components } = await this.createInitialEmbed();
      
      if (!embed || !components) {
        throw new Error("Failed to create initial embed");
      }

      const message = await (this.message.channel as TextChannel).send({
        embeds: [embed],
        components: components,
      });

      // Handle initial selection
      const collector = message.createMessageComponentCollector({
        filter: (i: any) => i.customId === "option_krlo",
        time: 300000,
      });

      collector.on("collect", async (i: any) => {
        if (i.values[0] === "klik_fight") {
          await message.delete();
          await this.startBattle(this.message);
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          message.edit({
            content: "Battle selection timed out. Please try again.",
            embeds: [],
            components: []
          }).catch(console.error);
        }
      });

    } catch (error) {
      console.error("[Battle] Error in startEmbed:", error);
      (this.message.channel as TextChannel).send({
        content: "⚠️ Failed to create battle selection. Please try again."
      });
    }
  }

private async createInitialEmbed(): Promise<{ embed: any; components: any[] }> {
    const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
    
    // Validate all values before using them
    const playerName = this.player?.name || "Unknown Player";
    const playerLevel = this.player?.exp?.level || 1;
    
    let title: string;
    let description: string;
    
    const enemyName = this.enemyDetails?.name || "Unknown Enemy";
    title = `⚔️ Battle Arena: ${enemyName}`;
    
    // Handle empty familiarInfo array safely
    let familiarNames = "❌ None selected";
    if (this.familiarInfo && this.familiarInfo.length > 0) {
        const validFamiliars = this.familiarInfo
            .filter((familiar: any) => familiar && familiar.name)
            .map((familiar: any) => `🐾 ${familiar.name}`);
        
        if (validFamiliars.length > 0) {
            familiarNames = validFamiliars.join(", ");
        }
    }
    
    description = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
                    **🎮 BATTLE PREPARATION**                    
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

👤 **Fighter:** \`${playerName}\` 
⭐ **Level:** \`${playerLevel}\`
🔮 **Companions:** ${familiarNames}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Enemy Information:**
📊 **Level:** \`🔧 Coming Soon...\`
💡 *Use the dropdown menu to scout enemy details!*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 **Auto-Battle Mode**
⚠️ *Automation reduces battle efficiency!*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ **Power Analysis:** \`🔧 In Development\`
🎲 **Difficulty Rating:** \`🔧 Calculating...\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 **Ready to Begin?**
Select **"Fight"** from the dropdown to enter combat!`;

    const battleEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0xFF6B35) // Orange-red for battle theme
        .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png') // Add a battle icon if you have one
        .setFooter({ 
            text: '⚔️ Choose your actions wisely in battle!', 
            iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png' 
        })
        .setTimestamp();

    // Enhanced menu options with emojis
    const options = [
        { 
            label: "⚔️ Fight", 
            value: "klik_fight", 
            description: "🔥 Begin the epic battle!",
            emoji: "⚔️"
        },
    ];

    if (this.mode === 'pve') {
        options.unshift(
            { 
                label: "👑 Bosses", 
                value: "klik_bosses", 
                description: "📋 Scout powerful boss enemies",
                emoji: "👑"
            },
            { 
                label: "🐺 Mobs", 
                value: "klik_mobs", 
                description: "📋 View regular enemy information",
                emoji: "🐺"
            }
        );
    }

    const optionSelectMenu = new StringSelectMenuBuilder()
        .setCustomId("option_krlo")
        .setPlaceholder("🎯 Choose your battle action...")
        .addOptions(options);

    const stringMenuRow = new ActionRowBuilder().addComponents(optionSelectMenu);

    return { 
        embed: battleEmbed, 
        components: [stringMenuRow] 
    };
}


  async startBattle(message: any): Promise<void> {

    
    try {
      await this.turnManager.getNextTurn();
      this.initialisedEmbed = new BattleEmbed(this);

      const state = this.stateManager.getState();
      
      if (!state.currentTurn) {
        console.warn("[Battle] No current turn found, using fallback");
      }



      const initialEmbed = await this.initialisedEmbed.sendInitialEmbed(
        state.currentTurn,
        this.mode === 'pve' ? this.mobInfo : this.player2FamiliarInfo
      );

      if (!initialEmbed || !initialEmbed.data) {
        throw new Error("Invalid embed created");
      }

      this.initialMessage = await (message.channel as TextChannel).send({
        embeds: [initialEmbed],
        components: await this.uiManager.createActionRows(),
      });



      // Enhanced interaction collector with better PvP filtering and logging
      const filter = (i: any) => {
        
        let isValidUser = false;
        
        if (this.mode === 'pve') {
          isValidUser = i.user.id === message.user.id;
          console.log(`[Battle] PvE filter - Message user: ${message.user.id}, Interaction user: ${i.user.id}, Valid: ${isValidUser}`);
        } else {
          // For PvP, check both possible ID formats
          const player1Id = this.player.id || this.player._id;
          const player2Id = this.player2.id || this.player2._id;
          
          isValidUser = i.user.id === player1Id || i.user.id === player2Id;
          
              }
        
        const isValidCustomId = i.customId.startsWith("action_") || i.customId === "starter";
        
        const result = isValidUser && isValidCustomId;
        
        return result;
      };

      const collector = this.initialMessage.createMessageComponentCollector({
        filter,
        time: 600000,
      });

      collector.on("collect", async (i: any) => {

        
        try {
          await this.uiManager.handleInteraction(i);
        } catch (error) {
          console.error("[Battle] Error handling interaction:", error);
          await i.reply({
            content: "❌ An error occurred while processing your action.",
            ephemeral: true
          }).catch(console.error);
        }
      });

      collector.on("end", (collected:any, reason:any) => {
        console.log(`[Battle] Interaction collector ended - Collected: ${collected.size}, Reason: ${reason}`);
      });

    } catch (error) {
      console.error("[Battle] Error starting battle:", error);
      await (message.channel as TextChannel).send({
        content: "⚠️ Battle system encountered an error. Please try again.",
      });
    }
  }

  // Helper method to check if character belongs to current player
public isCurrentPlayersCharacter(character: any, currentPlayerId: string): boolean {
  console.log(`[Battle] Checking character ownership - Character: ${character.name || 'Unknown'}, Current Player: ${currentPlayerId}`);
  
  if (this.mode === 'pve') {
    console.log("[Battle] PvE mode - allowing all characters");
    return true;
  }
  
  // Get player IDs
  const player1Id = this.player.id || this.player._id;
  const player2Id = this.player2.id || this.player2._id;
  
  // Check if current player is Player 1
  if (currentPlayerId === player1Id) {
    // Player 1 can control themselves
    if (character.id === player1Id || character._id === player1Id) {
      console.log("[PvP] Player 1 controlling themselves");
      return true;
    }
    
    // Player 1 can control their familiars
    const isPlayer1Familiar = this.familiarInfo.some((f: any) => 
      f.serialId === character.serialId || f.name === character.name
    );
    
    if (isPlayer1Familiar) {
      console.log("[PvP] Player 1 controlling their familiar");
      return true;
    }
  }
  
  // Check if current player is Player 2
  if (currentPlayerId === player2Id) {
    // Player 2 can control themselves
    if (character.id === player2Id || character._id === player2Id) {
      console.log("[PvP] Player 2 controlling themselves");
      return true;
    }
    
    // Player 2 can control their familiars
    const isPlayer2Familiar = this.player2FamiliarInfo.some((f: any) => 
      f.serialId === character.serialId || f.name === character.name
    );
    
    if (isPlayer2Familiar) {
      console.log("[PvP] Player 2 controlling their familiar");
      return true;
    }
  }
  
  console.log("[PvP] Character ownership validation failed");
  return false;
}


  // Helper methods for safe wave manager access
  public getWaveManager(): WaveManager | null {
    if (this.mode === 'pve') {
      return this.waveManager;
    }
    console.warn("WaveManager is not available in PvP mode");
    return null;
  }

  public supportsWaves(): boolean {
    return this.mode === 'pve' && this.waveManager !== null;
  }

  // Debug helper for PvP
  public debugPvPState(): void {
    console.log("=== PvP Debug State ===");
    console.log(`Mode: ${this.mode}`);
    console.log(`Player 1: ${this.player.name} (${this.player.id || this.player._id})`);
    console.log(`Player 2: ${this.player2?.name} (${this.player2?.id || this.player2?._id})`);
    console.log(`Player 1 Familiars: ${this.familiarInfo.length}`);
    console.log(`Player 2 Familiars: ${this.player2FamiliarInfo.length}`);
    console.log(`All Characters: ${this.characters.length}`);
    console.log(`All Enemies: ${this.allEnemies.length}`);
    
    // Log character details
    this.characters.forEach((char, index) => {
      console.log(`  Character ${index}: ${char.name} (${char.id || char._id})`);
    });
    
    console.log("======================");
  }

  // Getter methods for accessing state (used by other systems)
  getState() {
    return this.stateManager.getState();
  }

  updateState(updates: any) {
    this.stateManager.updateState(updates);
  }

  addBattleLog(message: string) {
    this.stateManager.addBattleLog(message);
  }

  // Expose managers for cross-system communication
  get statusManager() {
    return this.statusEffectManager;
  }

  get combat() {
    return this.combatResolver;
  }

  get turns() {
    return this.turnManager;
  }

  get waves(): WaveManager | null {
    return this.waveManager;
  }

  get results() {
    return this.battleResultManager;
  }

  get ui() {
    return this.uiManager;
  }
}

export default Battle;
