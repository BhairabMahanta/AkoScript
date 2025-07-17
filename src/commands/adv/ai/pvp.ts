// ai/pvp.ts
import { calculateDamage } from "../../util/glogic";
import { Ability } from "../../gamelogic/abilitiesFunction";
import classes from "../../../data/classes/allclasses";


interface AIPlayer {
  name: string;
  class: string;
  stats: {
    attack: number;
    defense: number;
    hp: number;
    maxHp: number;
    magic: number;
    speed: number;
  };
  statuses: {
    buffs: any[];
    debuffs: any[];
  };
  id?: string;
  _id?: string;
}

interface AITarget {
  name: string;
  stats: {
    attack: number;
    defense: number;
    hp: number;
    maxHp: number;
  };
  statuses: {
    buffs: any[];
    debuffs: any[];
  };
}

interface AIDecision {
  action: 'basic_attack' | 'ability' | 'dodge';
  target?: AITarget;
  abilityName?: string;
  reasoning?: string;
}

export class PvPAI {
  private battle: any;
  private player: AIPlayer;
  private ability: Ability;
  
  // AI Personality Settings (can be randomized per battle)
  private aiPersonality: {
    aggressiveness: number;      // 0-1, higher = more attacking
    defensiveness: number;       // 0-1, higher = more defensive abilities
    riskTaking: number;          // 0-1, higher = more risky moves
    targetPriority: 'weakest' | 'strongest' | 'random' | 'player_first';
    abilityUsage: number;        // 0-1, higher = more ability usage vs basic attacks
  };

  constructor(battle: any, player: AIPlayer) {
 this.battle = battle;
    
    // Add safety check
    if (!player) {
      throw new Error("[PvPAI] Player is undefined - cannot initialize AI");
    }
    
    if (!player.name) {
      throw new Error("[PvPAI] Player name is undefined - invalid player data");
    }
    this.player = player;
    this.ability = new Ability(battle);
    
    // Randomize AI personality for variety
    this.aiPersonality = this.generateRandomPersonality();
    
    console.log(`[PvPAI] AI initialized for ${player.name} with personality:`, this.aiPersonality);
  }

  private generateRandomPersonality() {
    return {
      aggressiveness: 0.4 + Math.random() * 0.4,      // 0.4-0.8
      defensiveness: 0.2 + Math.random() * 0.4,       // 0.2-0.6
      riskTaking: 0.3 + Math.random() * 0.4,          // 0.3-0.7
      targetPriority: this.getRandomTargetPriority(),
      abilityUsage: 0.3 + Math.random() * 0.5,        // 0.3-0.8
    };
  }

  private getRandomTargetPriority(): 'weakest' | 'strongest' | 'random' | 'player_first' {
    const priorities = ['weakest', 'strongest', 'random', 'player_first'];
    return priorities[Math.floor(Math.random() * priorities.length)] as any;
  }

  async makeDecision(currentTurn: AIPlayer, availableTargets: AITarget[]): Promise<AIDecision> {
    console.log(`[PvPAI] Making decision for ${currentTurn.name}`);
    console.log(`[PvPAI] Available targets: ${availableTargets.map(t => t.name).join(', ')}`);
    
    // Check if AI should use emergency actions first
    const emergencyDecision = this.checkEmergencyActions(currentTurn, availableTargets);
    if (emergencyDecision) {
      return emergencyDecision;
    }

    // Get available abilities
    const availableAbilities = this.getAvailableAbilities(currentTurn);
    
    // Decide on action type based on personality and situation
    const actionType = this.decideActionType(currentTurn, availableTargets, availableAbilities);
    
    // Select target
    const target = this.selectTarget(availableTargets, actionType);
    
    switch (actionType) {
      case 'basic_attack':
        return {
          action: 'basic_attack',
          target,
          reasoning: `Basic attack on ${target.name}`
        };
        
      case 'ability':
        const selectedAbility = this.selectAbility(availableAbilities, currentTurn, target);
        return {
          action: 'ability',
          target,
          abilityName: selectedAbility,
          reasoning: `Using ${selectedAbility} on ${target.name}`
        };
        
      case 'dodge':
        return {
          action: 'dodge',
          reasoning: 'Taking defensive action'
        };
        
      default:
        // Fallback to basic attack
        return {
          action: 'basic_attack',
          target,
          reasoning: 'Fallback basic attack'
        };
    }
  }

  private checkEmergencyActions(currentTurn: AIPlayer, availableTargets: AITarget[]): AIDecision | null {
    const hpPercentage = currentTurn.stats.hp / currentTurn.stats.maxHp;
    
    // If health is critically low, prioritize survival
    if (hpPercentage < 0.2) {
      console.log(`[PvPAI] Emergency: ${currentTurn.name} health critically low`);
      
      // High chance to dodge when low health
      if (Math.random() < 0.6) {
        return {
          action: 'dodge',
          reasoning: 'Emergency dodge due to low health'
        };
      }
      
      // Look for healing abilities
      const healingAbilities = this.getHealingAbilities(currentTurn);
      if (healingAbilities.length > 0) {
        return {
          action: 'ability',
          target: currentTurn as any, // Self-target for healing
          abilityName: healingAbilities[0],
          reasoning: 'Emergency healing'
        };
      }
    }
    
    return null;
  }

  private decideActionType(currentTurn: AIPlayer, availableTargets: AITarget[], availableAbilities: string[]): 'basic_attack' | 'ability' | 'dodge' {
    // Calculate situation factors
    const hpPercentage = currentTurn.stats.hp / currentTurn.stats.maxHp;
    const enemyCount = availableTargets.length;
    const hasUsefulAbilities = availableAbilities.length > 0;
    
    // Base probabilities
    let basicAttackChance = 0.4;
    let abilityChance = hasUsefulAbilities ? 0.4 : 0.0;
    let dodgeChance = 0.2;
    
    // Adjust based on personality
    basicAttackChance += this.aiPersonality.aggressiveness * 0.3;
    abilityChance += this.aiPersonality.abilityUsage * 0.3;
    dodgeChance += this.aiPersonality.defensiveness * 0.2;
    
    // Adjust based on situation
    if (hpPercentage < 0.5) {
      dodgeChance += 0.2;
      basicAttackChance -= 0.1;
    }
    
    if (enemyCount > 2) {
      abilityChance += 0.2; // More likely to use AoE abilities
      basicAttackChance -= 0.1;
    }
    
    // Normalize probabilities
    const total = basicAttackChance + abilityChance + dodgeChance;
    basicAttackChance /= total;
    abilityChance /= total;
    dodgeChance /= total;
    
    // Make decision based on probabilities
    const rand = Math.random();
    
    if (rand < basicAttackChance) {
      return 'basic_attack';
    } else if (rand < basicAttackChance + abilityChance) {
      return 'ability';
    } else {
      return 'dodge';
    }
  }

  private selectTarget(availableTargets: AITarget[], actionType: string): AITarget {
    if (availableTargets.length === 1) {
      return availableTargets[0];
    }
    
    switch (this.aiPersonality.targetPriority) {
      case 'weakest':
        return availableTargets.reduce((weakest, current) => 
          current.stats.hp < weakest.stats.hp ? current : weakest
        );
        
      case 'strongest':
        return availableTargets.reduce((strongest, current) => 
          current.stats.hp > strongest.stats.hp ? current : strongest
        );
        
      case 'player_first':
        // Target main players first, then familiars
        const players = availableTargets.filter(t => !t.name.includes('familiar'));
        if (players.length > 0) {
          return players[Math.floor(Math.random() * players.length)];
        }
        return availableTargets[Math.floor(Math.random() * availableTargets.length)];
        
      case 'random':
      default:
        return availableTargets[Math.floor(Math.random() * availableTargets.length)];
    }
  }

  private getAvailableAbilities(currentTurn: AIPlayer): string[] {
    const state = this.battle.stateManager.getState();
    const cooldowns = state.cooldowns || [];
    
    try {
      // Get abilities based on character type
      let abilities: string[] = [];
      
      if (currentTurn.class && classes[currentTurn.class]) {
        abilities = classes[currentTurn.class].abilities || [];
      }
      
      // Filter out abilities on cooldown
      const availableAbilities = abilities.filter(abilityName => 
        !cooldowns.some((cooldown: any) => cooldown.name === abilityName)
      );
      
      console.log(`[PvPAI] Available abilities for ${currentTurn.name}:`, availableAbilities);
      return availableAbilities;
    } catch (error) {
      console.error(`[PvPAI] Error getting abilities:`, error);
      return [];
    }
  }

  private getHealingAbilities(currentTurn: AIPlayer): string[] {
    const allAbilities = this.getAvailableAbilities(currentTurn);
    
    // Filter for abilities that might be healing (this is a simple heuristic)
    const healingKeywords = ['heal', 'restore', 'recover', 'regenerate', 'mend'];
    
    return allAbilities.filter(ability => 
      healingKeywords.some(keyword => 
        ability.toLowerCase().includes(keyword)
      )
    );
  }

  private selectAbility(availableAbilities: string[], currentTurn: AIPlayer, target: AITarget): string {
    if (availableAbilities.length === 0) {
      return 'basic_attack'; // Fallback
    }
    
    // Simple selection - can be made more sophisticated
    const randomIndex = Math.floor(Math.random() * availableAbilities.length);
    return availableAbilities[randomIndex];
  }

  async executeDecision(decision: AIDecision): Promise<void> {
    console.log(`[PvPAI] Executing decision: ${decision.action} - ${decision.reasoning}`);
    
    const state = this.battle.stateManager.getState();
    
    switch (decision.action) {
      case 'basic_attack':
        if (decision.target) {
          this.battle.stateManager.updateState({
            enemyToHit: decision.target,
            pickedChoice: true
          });
          
          await this.battle.turnManager.performPlayerTurn();
            }
        break;
        
      case 'ability':
        if (decision.target && decision.abilityName) {
          this.battle.stateManager.updateState({
            enemyToHit: decision.target,
            pickedChoice: true
          });
          
          await this.battle.ability.executeAbility(
            state.currentTurn,
            decision.target,
            state.aliveEnemies,
            state.aliveTeam,
            decision.abilityName
          );
          
          this.battle.addBattleLog(`+ ${this.player.name} uses ${decision.abilityName} on ${decision.target.name}`);
        }
        break;
        
      case 'dodge':
        const dodgeOptions = [
          "dodge_and_increase_attack_bar",
          "dodge",
          "reduce_damage",
          "take_hit",
          "take_1.5x_damage",
        ];
        
        const randomDodge = dodgeOptions[Math.floor(Math.random() * dodgeOptions.length)];
        
        this.battle.stateManager.updateState({
          dodge: { option: randomDodge, id: state.currentTurn?._id },
          pickedChoice: true
        });
        
        await this.battle.turnManager.performPlayerTurn();
        this.battle.addBattleLog(`+ ${this.player.name} attempts to dodge`);
        break;
    }
  }

  // Method to get available targets for AI
  getAvailableTargets(): AITarget[] {
    const state = this.battle.stateManager.getState();
    
    // For AI player, targets are the human player and their familiars
    let targets: AITarget[] = [];
    
    // Add human player
    if (this.battle.player && this.battle.player.stats.hp > 0) {
      targets.push(this.battle.player);
    }
    
    // Add human player's familiars
    const aliveFamiliars = this.battle.familiarInfo.filter(
      (familiar: any) => familiar.stats.hp > 0
    );
    
    targets = targets.concat(aliveFamiliars);
    
    console.log(`[PvPAI] Available targets: ${targets.map(t => t.name).join(', ')}`);
    return targets;
  }
}
