// ai/pvp.ts - CLEANED VERSION
import { calculateDamage } from "../../util/glogic";
import { Ability } from "../../gamelogic/abilitiesFunction";
import classes from "../../../data/classes/allclasses";
import abilities from "../../../data/abilities";
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
  target?: AITarget | AITarget[];
  abilityName?: string;
  reasoning?: string;
  isMultiTarget?: boolean;
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

  // CLEANED: Removed 6 repetitive logs that spam every AI turn
  private getTargetPools(): { aiTeam: AITarget[], enemies: AITarget[] } {
    const state = this.battle.stateManager.getState();
    
    const currentTurnId = state.currentTurn?._id || state.currentTurn?.id;
    const aiPlayerId = this.player._id || this.player.id;
    
    // REMOVED: These 6 logs that repeat constantly
    // console.log(`[PvPAI] Current turn ID: ${currentTurnId}, AI Player ID: ${aiPlayerId}`);
    // console.log(`[PvPAI] State aliveTeam: ${state.aliveTeam?.map((t: any) => `${t.name}(${t._id})`).join(', ')}`);
    // console.log(`[PvPAI] State aliveEnemies: ${state.aliveEnemies?.map((t: any) => `${t.name}(${t._id})`).join(', ')}`);
    
    const aiInTeam = state.aliveTeam?.some((member: any) => 
      (member._id === currentTurnId) || (member.id === currentTurnId) ||
      (member._id === aiPlayerId) || (member.id === aiPlayerId)
    );
    
    const aiInEnemies = state.aliveEnemies?.some((member: any) => 
      (member._id === currentTurnId) || (member.id === currentTurnId) ||
      (member._id === aiPlayerId) || (member.id === aiPlayerId)
    );
    
    let aiTeam: AITarget[];
    let enemies: AITarget[];
    
    if (aiInTeam) {
      aiTeam = state.aliveTeam || [];
      enemies = state.aliveEnemies || [];
      // REMOVED: console.log(`[PvPAI] AI is in aliveTeam`);
    } else if (aiInEnemies) {
      aiTeam = state.aliveEnemies || [];
      enemies = state.aliveTeam || [];
      // REMOVED: console.log(`[PvPAI] AI is in aliveEnemies`);
    } else {
      aiTeam = state.aliveEnemies || [];
      enemies = state.aliveTeam || [];
      // REMOVED: console.log(`[PvPAI] Fallback: AI assumed to be defending`);
    }
    
    // REMOVED: These 2 logs that repeat constantly
    // console.log(`[PvPAI] AI Team (${aiTeam.length}): ${aiTeam.map((t: any) => t.name).join(', ')}`);
    // console.log(`[PvPAI] Enemies (${enemies.length}): ${enemies.map((t: any) => t.name).join(', ')}`);
    
    return { aiTeam, enemies };
  }

  async makeDecision(currentTurn: ExtendedPlayer, availableTargets: AITarget[]): Promise<AIDecision> {
    const emergencyDecision = this.checkEmergencyActions(currentTurn, availableTargets);
    if (emergencyDecision) {
      return emergencyDecision;
    }

    const availableAbilities = this.getAvailableAbilities(currentTurn);
    const actionType = this.decideActionType(currentTurn, availableTargets, availableAbilities);
    
    switch (actionType) {
      case 'basic_attack':
        const { enemies } = this.getTargetPools();
        const attackTarget = this.selectTarget(enemies.length > 0 ? enemies : availableTargets, 'attack');
        return {
          action: 'basic_attack',
          target: attackTarget,
          reasoning: `Basic attack on ${attackTarget.name}`,
          isMultiTarget: false
        };
        
      case 'ability':
        const selectedAbility = this.selectAbility(availableAbilities, currentTurn, availableTargets);
        
        if (!selectedAbility || selectedAbility === 'basic_attack') {
          const { enemies } = this.getTargetPools();
          const fallbackTarget = this.selectTarget(enemies.length > 0 ? enemies : availableTargets, 'attack');
          return {
            action: 'basic_attack',
            target: fallbackTarget,
            reasoning: `No abilities available, using basic attack on ${fallbackTarget.name}`,
            isMultiTarget: false
          };
        }
        
        const abilityTargets = this.selectAbilityTargets(selectedAbility, currentTurn, availableTargets);
        
        return {
          action: 'ability',
          target: abilityTargets,
          abilityName: selectedAbility,
          reasoning: `Using ${selectedAbility}${Array.isArray(abilityTargets) ? ` on ${abilityTargets.length} targets` : ` on ${(abilityTargets as AITarget).name}`}`,
          isMultiTarget: Array.isArray(abilityTargets)
        };
        
      case 'dodge':
        return {
          action: 'dodge',
          reasoning: 'Taking defensive action',
          isMultiTarget: false
        };
        
      default:
        const { enemies: fallbackEnemies } = this.getTargetPools();
        const fallbackTarget = this.selectTarget(fallbackEnemies.length > 0 ? fallbackEnemies : availableTargets, 'attack');
        return {
          action: 'basic_attack',
          target: fallbackTarget,
          reasoning: 'Fallback basic attack',
          isMultiTarget: false
        };
    }
  }

  private checkEmergencyActions(currentTurn: any, availableTargets: AITarget[]): AIDecision | null {
    const hpPercentage = currentTurn.stats.hp / currentTurn.stats.maxHp;
    
    if (hpPercentage < 0.2) {
      // KEEP: This is important emergency info
      console.log(`[PvPAI] Emergency: ${currentTurn.name} health critically low`);
      
      const availableAbilities = this.getAvailableAbilities(currentTurn);
      const defensiveAbilities = availableAbilities.filter(abilityName => {
        const ability = abilities[abilityName];
        return ability && (
          ability.logicType === 'increase_defense' ||
          ability.name.toLowerCase().includes('defend') ||
          ability.name.toLowerCase().includes('protect') ||
          ability.type.includes('buff')
        );
      });

      if (defensiveAbilities.length > 0 && Math.random() < 0.7) {
        const selectedDefensiveAbility = defensiveAbilities[0];
        const targets = this.selectAbilityTargets(selectedDefensiveAbility, currentTurn, availableTargets);
        
        return {
          action: 'ability',
          target: targets,
          abilityName: selectedDefensiveAbility,
          reasoning: 'Emergency defensive action',
          isMultiTarget: Array.isArray(targets)
        };
      }
      
      if (Math.random() < 0.6) {
        return {
          action: 'dodge',
          reasoning: 'Emergency dodge due to low health',
          isMultiTarget: false
        };
      }
      
      const healingAbilities = this.getHealingAbilities(currentTurn);
      if (healingAbilities.length > 0) {
        const healTargets = this.selectAbilityTargets(healingAbilities[0], currentTurn, availableTargets);
        return {
          action: 'ability',
          target: healTargets,
          abilityName: healingAbilities[0],
          reasoning: 'Emergency healing',
          isMultiTarget: Array.isArray(healTargets)
        };
      }
    }
    
    return null;
  }

  private decideActionType(currentTurn: any, availableTargets: AITarget[], availableAbilities: string[]): 'basic_attack' | 'ability' | 'dodge' {
    const hpPercentage = currentTurn.stats.hp / currentTurn.stats.maxHp;
    const enemyCount = availableTargets.length;
    
    const hasRealAbilities = availableAbilities.length > 0 && 
                             availableAbilities.some(abilityName => abilities[abilityName]);
    
    let basicAttackChance = 0.4;
    let abilityChance = hasRealAbilities ? 0.4 : 0.0;
    let dodgeChance = 0.2;
    
    if (!hasRealAbilities) {
      basicAttackChance += 0.4;
      abilityChance = 0.0;
    }
    
    if (hasRealAbilities) {
      const { aiTeam } = this.getTargetPools();
      const teamNeedsDefense = aiTeam.some((member: any) => {
        const memberHpPercentage = member.stats.hp / member.stats.maxHp;
        return memberHpPercentage < 0.6;
      });

      if (teamNeedsDefense) {
        abilityChance += 0.3;
        basicAttackChance -= 0.2;
      }
    }
    
    basicAttackChance += this.aiPersonality.aggressiveness * 0.3;
    abilityChance += this.aiPersonality.abilityUsage * 0.3;
    dodgeChance += this.aiPersonality.defensiveness * 0.2;
    
    if (hpPercentage < 0.5) {
      dodgeChance += 0.2;
      basicAttackChance -= 0.1;
    }
    
    if (enemyCount > 2 && hasRealAbilities) {
      abilityChance += 0.2;
      basicAttackChance -= 0.1;
    }
    
    basicAttackChance = Math.max(0.1, basicAttackChance);
    abilityChance = Math.max(0.0, abilityChance);
    dodgeChance = Math.max(0.0, dodgeChance);
    
    const total = basicAttackChance + abilityChance + dodgeChance;
    basicAttackChance /= total;
    abilityChance /= total;
    dodgeChance /= total;
    
    const rand = Math.random();
    
    // KEEP: This is useful decision info
    console.log(`[PvPAI] Action chances - Basic: ${(basicAttackChance * 100).toFixed(1)}%, Ability: ${(abilityChance * 100).toFixed(1)}%, Dodge: ${(dodgeChance * 100).toFixed(1)}%`);
    
    if (rand < basicAttackChance) {
      return 'basic_attack';
    } else if (rand < basicAttackChance + abilityChance && hasRealAbilities) {
      return 'ability';
    } else {
      return 'dodge';
    }
  }

  private selectTarget(targetPool: AITarget[], actionType: string): AITarget {
    if (targetPool.length === 1) {
      return targetPool[0];
    }
    
    if (targetPool.length === 0) {
      console.error(`[PvPAI] No targets available for ${actionType}`);
      return { name: 'No Target', stats: { attack: 0, defense: 0, hp: 1, maxHp: 1 }, statuses: { buffs: [], debuffs: [] } };
    }
    
    switch (this.aiPersonality.targetPriority) {
      case 'weakest':
        return targetPool.reduce((weakest, current) => 
          current.stats.hp < weakest.stats.hp ? current : weakest
        );
        
      case 'strongest':
        return targetPool.reduce((strongest, current) => 
          current.stats.hp > strongest.stats.hp ? current : strongest
        );
        
      case 'player_first':
        const players = targetPool.filter(t => !t.name.includes('familiar'));
        if (players.length > 0) {
          return players[Math.floor(Math.random() * players.length)];
        }
        return targetPool[Math.floor(Math.random() * targetPool.length)];
        
      case 'random':
      default:
        return targetPool[Math.floor(Math.random() * targetPool.length)];
    }
  }

  private selectAbilityTargets(abilityName: string, currentTurn: ExtendedPlayer, availableTargets: AITarget[]): AITarget | AITarget[] {
    const ability = abilities[abilityName];
    if (!ability) {
      console.error(`[PvPAI] Ability ${abilityName} not found`);
      const { enemies } = this.getTargetPools();
      return this.selectTarget(enemies.length > 0 ? enemies : availableTargets, 'attack');
    }

    // REMOVED: Repetitive targeting info
    // console.log(`[PvPAI] Selecting targets for ${abilityName} (type: ${ability.type}, logicType: ${ability.logicType})`);

    if (ability.selection && ability.selection.startsWith('modal_')) {
      const requiredCount = parseInt(ability.selection.replace('modal_', ''), 10);
      return this.selectMultipleTargets(ability, requiredCount, currentTurn);
    }

    return this.selectSingleTarget(ability, currentTurn, availableTargets);
  }

  private selectSingleTarget(ability: any, currentTurn: ExtendedPlayer, availableTargets: AITarget[]): AITarget {
    const shouldTargetTeam = this.shouldTargetTeam(ability);
    const { aiTeam, enemies } = this.getTargetPools();
    
    if (shouldTargetTeam) {
      return this.selectTeamTarget(currentTurn);
    } else {
      return this.selectTarget(enemies.length > 0 ? enemies : availableTargets, 'attack');
    }
  }

  private selectMultipleTargets(ability: any, requiredCount: number, currentTurn: ExtendedPlayer): AITarget[] {
    const shouldTargetTeam = this.shouldTargetTeam(ability);
    const { aiTeam, enemies } = this.getTargetPools();
    
    let targetPool: AITarget[] = [];
    
    if (shouldTargetTeam) {
      targetPool = aiTeam;
      // REMOVED: Repetitive targeting logs
      // console.log(`[PvPAI] Targeting AI's team for ${ability.name}, available team: ${targetPool.map(t => t.name).join(', ')}`);
    } else {
      targetPool = enemies;
      // REMOVED: Repetitive targeting logs
      // console.log(`[PvPAI] Targeting enemies for ${ability.name}, available enemies: ${targetPool.map(t => t.name).join(', ')}`);
    }

    if (targetPool.length === 0) {
      console.error(`[PvPAI] No valid targets available for ${ability.name}`);
      return [];
    }

    const actualRequiredCount = Math.min(requiredCount, targetPool.length);
    
    if (shouldTargetTeam && (ability.logicType === 'increase_defense' || ability.name.toLowerCase().includes('defend'))) {
      const sortedTargets = targetPool.sort((a, b) => {
        const aHpPercent = a.stats.hp / a.stats.maxHp;
        const bHpPercent = b.stats.hp / b.stats.maxHp;
        return aHpPercent - bHpPercent;
      });
      
      const selectedTargets = sortedTargets.slice(0, actualRequiredCount);
      // KEEP: This shows AI decision result
      console.log(`[PvPAI] Selected ${selectedTargets.length} AI team targets for defense: ${selectedTargets.map(t => t.name).join(', ')}`);
      return selectedTargets;
    }

    const shuffled = [...targetPool].sort(() => Math.random() - 0.5);
    const selectedTargets = shuffled.slice(0, actualRequiredCount);
    // REMOVED: Repetitive selection log - only keep important defense ones above
    return selectedTargets;
  }

  private shouldTargetTeam(ability: any): boolean {
    const teamTargetingTypes = [
      'buff_self', 'buff', 'buff_many', 'heal', 'heal_many', 'heal_hit',
      'increase_self', 'increase_many', 'heal_buff', 'heal_special_effect',
      'buff_special_effect', 'special_buff'
    ];

    const enemyTargetingTypes = [
      'attack', 'attack_many', 'debuff', 'debuff_many', 'decrease', 'decrease_hit',
      'decrease_many_hit', 'special_hit', 'hit_debuff', 'debuff_hit',
      'special_debuff', 'debuff_special_effect'
    ];

    if (ability.logicType === 'increase_defense') {
      // REMOVED: Repetitive targeting decision log
      // console.log(`[PvPAI] ${ability.name} targets team (increase_defense logicType)`);
      return true;
    }

    if (teamTargetingTypes.some(type => ability.type.includes(type))) {
      // REMOVED: Repetitive targeting decision log
      return true;
    }

    if (enemyTargetingTypes.some(type => ability.type.includes(type))) {
      // REMOVED: Repetitive targeting decision log
      return false;
    }

    if (ability.type.includes('buff') || ability.type.includes('heal') || ability.type.includes('increase')) {
      // REMOVED: Repetitive targeting decision log
      return true;
    }

    // REMOVED: Repetitive targeting decision log
    return false;
  }

  private selectTeamTarget(currentTurn: ExtendedPlayer): AITarget {
    const { aiTeam } = this.getTargetPools();
    
    if (aiTeam.length === 0) {
      return currentTurn as any;
    }

    const sortedByHp = aiTeam.sort((a: any, b: any) => {
      const aHpPercent = a.stats.hp / a.stats.maxHp;
      const bHpPercent = b.stats.hp / b.stats.maxHp;
      return aHpPercent - bHpPercent;
    });

    return sortedByHp[0];
  }

  private getAvailableAbilities(currentTurn: ExtendedPlayer): string[] {
    const state = this.battle.stateManager.getState();
    const characterId = currentTurn._id || currentTurn.id;
    
    try {
      let classAbilities: string[] = [];
      
      if (currentTurn.class && classes[currentTurn.class]) {
        classAbilities = classes[currentTurn.class].abilities || [];
      }
      // REMOVED: Debug log that's not critical
      // console.log("classAbilities", classAbilities);
      
      const availableAbilities = classAbilities.filter((abilityName: any) => {
        if (!abilities[abilityName.toString()]) {
          console.warn(`[PvPAI] Ability ${abilityName} from class ${currentTurn.class} not found in abilities database`);
          return false;
        }
        
        const isOnCooldown = this.battle.stateManager.isAbilityOnCooldown(abilityName, characterId);
        
        if (isOnCooldown) {
          // REMOVED: Repetitive cooldown log
          // console.log(`[PvPAI] ${abilityName} is on cooldown for ${currentTurn.name}`);
          return false;
        }
        
        return true;
      });
      
      // KEEP: This shows available abilities result
      console.log(`[PvPAI] Available abilities for ${currentTurn.name} (${characterId}):`, availableAbilities);
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

  private selectAbility(availableAbilities: string[], currentTurn: ExtendedPlayer, availableTargets: AITarget[]): string | null {
    if (availableAbilities.length === 0) {
      // REMOVED: Repetitive "no abilities" log
      return null;
    }
    
    const validAbilities = availableAbilities.filter(abilityName => {
      const ability = abilities[abilityName];
      if (!ability) {
        console.warn(`[PvPAI] Ability ${abilityName} not found in database`);
        return false;
      }
      return true;
    });
    
    if (validAbilities.length === 0) {
      // REMOVED: Repetitive "no valid abilities" log
      return null;
    }
    
    const { aiTeam } = this.getTargetPools();
    const teamInDanger = aiTeam.some((member: any) => {
      const hpPercentage = member.stats.hp / member.stats.maxHp;
      return hpPercentage < 0.4;
    });

    if (teamInDanger) {
      const defensiveAbilities = validAbilities.filter(abilityName => {
        const ability = abilities[abilityName];
        return ability && (
          ability.logicType === 'increase_defense' ||
          ability.name.toLowerCase().includes('defend') ||
          ability.name.toLowerCase().includes('protect') ||
          ability.type.includes('buff')
        );
      });

      if (defensiveAbilities.length > 0) {
        // KEEP: This shows important AI decision
        console.log(`[PvPAI] AI team in danger, using defensive ability: ${defensiveAbilities[0]}`);
        return defensiveAbilities[0];
      }
    }
    
    const randomIndex = Math.floor(Math.random() * validAbilities.length);
    const selectedAbility = validAbilities[randomIndex];
    // KEEP: This shows AI's ability choice
    console.log(`[PvPAI] Selected ability: ${selectedAbility}`);
    return selectedAbility;
  }

// In your PvPAI.ts - Update the executeDecision method
async executeDecision(decision: AIDecision): Promise<void> {
  console.log(`[PvPAI] Executing decision: ${decision.action} - ${decision.reasoning}`);
  
  const state = this.battle.stateManager.getState();
  const currentPlayerId = this.player.id || this.player._id;
  const currentTurnName = state.currentTurn?.name || 'Unknown';
  
  // AI actions should use - (red) symbol
  const aiSymbol = '-';
  
  switch (decision.action) {
    case 'basic_attack':
      if (decision.target && !Array.isArray(decision.target)) {
        this.battle.stateManager.setPlayerTarget(currentPlayerId, decision.target, false);
        
        this.battle.stateManager.updateState({
          enemyToHit: decision.target,
          pickedChoice: true
        });
        
        await this.battle.turnManager.performPlayerTurn();
      }
      break;
      
    case 'ability':
      if (decision.target && decision.abilityName) {
        if (decision.isMultiTarget && Array.isArray(decision.target)) {
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
          
          const targetNames = decision.target.map(t => t.name).join(', ');
          this.battle.addBattleLog(`${aiSymbol} ${currentTurnName} uses ${decision.abilityName} on ${targetNames}`);
        } else {
          const singleTarget = Array.isArray(decision.target) ? decision.target[0] : decision.target;
          
          this.battle.stateManager.setPlayerTarget(currentPlayerId, singleTarget, false);
          
          this.battle.stateManager.updateState({
            enemyToHit: singleTarget,
            pickedChoice: true
          });

          await this.battle.ability.executeAbility(
            state.currentTurn,
            singleTarget,
            state.aliveEnemies,
            state.aliveTeam,
            decision.abilityName
          );
          
          this.battle.addBattleLog(`${aiSymbol} ${currentTurnName} uses ${decision.abilityName} on ${singleTarget.name}`);
        }
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
       this.battle.addBattleLog(`${aiSymbol} ${currentTurnName} attempts to dodge`);
      await this.battle.turnManager.performPlayerTurn();
     
      break;
  }
}


  getAvailableTargets(): AITarget[] {
    const state = this.battle.stateManager.getState();
    let targets: AITarget[] = [];
    
    if (this.battle.player && 
        this.battle.player.stats && 
        this.battle.player.stats.hp > 0 && 
        this.battle.player.stats.defense !== undefined) {
      targets.push(this.battle.player);
    }
    
    const aliveFamiliars = (this.battle.familiarInfo || []).filter(
      (familiar: any) => familiar && 
                         familiar.stats && 
                         familiar.stats.hp > 0 && 
                         familiar.stats.defense !== undefined &&
                         familiar.name
    );
    
    targets = targets.concat(aliveFamiliars);
    
    const validTargets = targets.filter(target => 
      target && 
      target.name && 
      target.stats && 
      typeof target.stats.defense === 'number' &&
      target.stats.hp > 0
    );
    
    // KEEP: This shows valid targets - useful for debugging target issues
    console.log(`[PvPAI] Available valid targets: ${validTargets.map(t => t.name).join(', ')}`);
    return validTargets;
  }
}
