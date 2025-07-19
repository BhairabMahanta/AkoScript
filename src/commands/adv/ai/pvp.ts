// ai/pvp.ts
import { calculateDamage } from "../../util/glogic";
import { Ability } from "../../gamelogic/abilitiesFunction";
import classes from "../../../data/classes/allclasses";
import { ExtendedPlayer } from "../../gamelogic/buffdebufflogic";

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
  private player: ExtendedPlayer;
  private ability: Ability;
  
  private aiPersonality: {
    aggressiveness: number;
    defensiveness: number;
    riskTaking: number;
    targetPriority: 'weakest' | 'strongest' | 'random' | 'player_first';
    abilityUsage: number;
  };

  constructor(battle: any, player: ExtendedPlayer) {
    this.battle = battle;
    
    if (!player) {
      throw new Error("[PvPAI] Player is undefined - cannot initialize AI");
    }
    
    if (!player.name) {
      throw new Error("[PvPAI] Player name is undefined - invalid player data");
    }
    
    this.player = player;
    this.ability = new Ability(battle);
    
    this.aiPersonality = this.generateRandomPersonality();
    
    console.log(`[PvPAI] AI initialized for ${player.name} with personality:`, this.aiPersonality);
  }

  private generateRandomPersonality() {
    return {
      aggressiveness: 0.4 + Math.random() * 0.4,
      defensiveness: 0.2 + Math.random() * 0.4,
      riskTaking: 0.3 + Math.random() * 0.4,
      targetPriority: this.getRandomTargetPriority(),
      abilityUsage: 0.3 + Math.random() * 0.5,
    };
  }

  private getRandomTargetPriority(): 'weakest' | 'strongest' | 'random' | 'player_first' {
    const priorities = ['weakest', 'strongest', 'random', 'player_first'];
    return priorities[Math.floor(Math.random() * priorities.length)] as any;
  }

  async makeDecision(currentTurn: ExtendedPlayer, availableTargets: AITarget[]): Promise<AIDecision> {
    console.log(`[PvPAI] Making decision for ${currentTurn.name}`);
    console.log(`[PvPAI] Available targets: ${availableTargets.map(t => t.name).join(', ')}`);
    
    const emergencyDecision = this.checkEmergencyActions(currentTurn, availableTargets);
    if (emergencyDecision) {
      return emergencyDecision;
    }

    const availableAbilities = this.getAvailableAbilities(currentTurn);
    const actionType = this.decideActionType(currentTurn, availableTargets, availableAbilities);
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
        return {
          action: 'basic_attack',
          target,
          reasoning: 'Fallback basic attack'
        };
    }
  }

  private checkEmergencyActions(currentTurn: any, availableTargets: AITarget[]): AIDecision | null {
    const hpPercentage = currentTurn.stats.hp / currentTurn.stats.maxHp;
    
    if (hpPercentage < 0.2) {
      console.log(`[PvPAI] Emergency: ${currentTurn.name} health critically low`);
      
      if (Math.random() < 0.6) {
        return {
          action: 'dodge',
          reasoning: 'Emergency dodge due to low health'
        };
      }
      
      const healingAbilities = this.getHealingAbilities(currentTurn);
      if (healingAbilities.length > 0) {
        return {
          action: 'ability',
          target: currentTurn as any,
          abilityName: healingAbilities[0],
          reasoning: 'Emergency healing'
        };
      }
    }
    
    return null;
  }

  private decideActionType(currentTurn: any, availableTargets: AITarget[], availableAbilities: string[]): 'basic_attack' | 'ability' | 'dodge' {
    const hpPercentage = currentTurn.stats.hp / currentTurn.stats.maxHp;
    const enemyCount = availableTargets.length;
    const hasUsefulAbilities = availableAbilities.length > 0;
    
    let basicAttackChance = 0.4;
    let abilityChance = hasUsefulAbilities ? 0.4 : 0.0;
    let dodgeChance = 0.2;
    
    basicAttackChance += this.aiPersonality.aggressiveness * 0.3;
    abilityChance += this.aiPersonality.abilityUsage * 0.3;
    dodgeChance += this.aiPersonality.defensiveness * 0.2;
    
    if (hpPercentage < 0.5) {
      dodgeChance += 0.2;
      basicAttackChance -= 0.1;
    }
    
    if (enemyCount > 2) {
      abilityChance += 0.2;
      basicAttackChance -= 0.1;
    }
    
    const total = basicAttackChance + abilityChance + dodgeChance;
    basicAttackChance /= total;
    abilityChance /= total;
    dodgeChance /= total;
    
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

  private getAvailableAbilities(currentTurn: ExtendedPlayer): string[] {
    const state = this.battle.stateManager.getState();
    const cooldowns = state.cooldowns || [];
    
    try {
      let abilities: string[] = [];
      
      if (currentTurn.class && classes[currentTurn.class]) {
        abilities = classes[currentTurn.class].abilities || [];
      }
      
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

  private getHealingAbilities(currentTurn: ExtendedPlayer): string[] {
    const allAbilities = this.getAvailableAbilities(currentTurn);
    const healingKeywords = ['heal', 'restore', 'recover', 'regenerate', 'mend'];
    
    return allAbilities.filter(ability => 
      healingKeywords.some(keyword => 
        ability.toLowerCase().includes(keyword)
      )
    );
  }

  private selectAbility(availableAbilities: string[], currentTurn: ExtendedPlayer, target: AITarget): string {
    if (availableAbilities.length === 0) {
      return 'basic_attack';
    }
    
    const randomIndex = Math.floor(Math.random() * availableAbilities.length);
    return availableAbilities[randomIndex];
  }

  async executeDecision(decision: AIDecision): Promise<void> {
    console.log(`[PvPAI] Executing decision: ${decision.action} - ${decision.reasoning}`);
    
    const state = this.battle.stateManager.getState();
    const currentPlayerId = this.player.id || this.player._id;
    
    switch (decision.action) {
      case 'basic_attack':
        if (decision.target) {
          this.battle.stateManager.setPlayerTarget(currentPlayerId, decision.target, false);
          
          this.battle.stateManager.updateState({
            enemyToHit: decision.target,
            pickedChoice: true
          });
          
          await this.battle.turnManager.performPlayerTurn();
          this.battle.addBattleLog(`+ ${this.player.name} attacks ${decision.target.name} using basic attack`);
        }
        break;
        
      case 'ability':
        if (decision.target && decision.abilityName) {
          this.battle.stateManager.setPlayerTarget(currentPlayerId, decision.target, false);
          
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

  getAvailableTargets(): AITarget[] {
    const state = this.battle.stateManager.getState();
    let targets: AITarget[] = [];
    
    if (this.battle.player && this.battle.player.stats.hp > 0) {
      targets.push(this.battle.player);
    }
    
    const aliveFamiliars = this.battle.familiarInfo.filter(
      (familiar: any) => familiar.stats.hp > 0
    );
    
    targets = targets.concat(aliveFamiliars);
    
    console.log(`[PvPAI] Available targets: ${targets.map(t => t.name).join(', ')}`);
    return targets;
  }
}
