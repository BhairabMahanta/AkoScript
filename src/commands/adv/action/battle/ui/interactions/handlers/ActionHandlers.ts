// ui/interactions/handlers/ActionHandlers.ts - COMPLETE VERSION
import { cycleCooldowns } from '../../../../../../util/glogic';
import { CharacterIdentifier } from "../../managers/CharacterIdentifier";
import { TargetManager } from '../../managers/TargetManager';

export class ActionHandlers {
  private battle: any;
  private targetManager: TargetManager;
  private characterIdentifier: CharacterIdentifier;

  constructor(battle: any) {
    this.battle = battle;
    this.targetManager = new TargetManager(battle);
    this.characterIdentifier = new CharacterIdentifier(battle);
  }

  async handleBasicAttack(i: any): Promise<void> {
    console.log(`\x1b[36m[ActionHandlers]\x1b[0m handleBasicAttack called by ${i.user.username}`);
    
    const state = this.battle.stateManager.getState();
    const currentPlayerId = this.characterIdentifier.getCurrentPlayerIdFromUserId(i.user.id);
    
    if (state.currentTurn?.stats.hp <= 0) {
      await i.followUp({
        content: `${state.currentTurn.name} is dead and cannot attack!`,
        ephemeral: true,
      });
      return;
    }
    
    const target = await this.getOrSetTarget(i, currentPlayerId);
    if (!target) return;
    
    if (!await this.validateTarget(i, target, currentPlayerId)) return;

    console.log(`\x1b[33m[ActionHandlers]\x1b[0m Executing basic attack: ${state.currentTurn.name} → ${target.name}`);
    await this.executeBasicAttack(target);
    
    // ADD DELAY BEFORE COMPLETING TURN IN PvE
    if (this.battle.mode === 'pve') {
      console.log(`\x1b[35m[ActionHandlers]\x1b[0m Adding 750ms delay for PvE turn processing...`);

    }
    
    await this.completeTurn(state.currentTurn.name);
  }

  async handleDodge(i: any): Promise<void> {
    console.log(`\x1b[36m[ActionHandlers]\x1b[0m handleDodge called by ${i.user.username}`);
    
    const dodgeOptions = [
      "dodge_and_increase_attack_bar",
      "dodge",
      "reduce_damage",
      "take_hit",
      "take_1.5x_damage",
    ];
    
    const randomDodge = dodgeOptions[Math.floor(Math.random() * dodgeOptions.length)];
    
    this.battle.stateManager.updateState({
      dodge: { option: randomDodge, id: this.battle.stateManager.getState().currentTurn?._id }
    });

    console.log(`\x1b[33m[ActionHandlers]\x1b[0m Executing dodge: ${randomDodge}`);
    await this.battle.turnManager.performPlayerTurn();
    await cycleCooldowns(this.battle.stateManager.getState().cooldowns, this.battle.stateManager.getState().currentTurn?.name);
    
    // ADD DELAY BEFORE COMPLETING TURN IN PvE
    if (this.battle.mode === 'pve') {
      console.log(`\x1b[35m[ActionHandlers]\x1b[0m Adding 750ms delay for PvE dodge processing...`);
      await new Promise(resolve => setTimeout(resolve, 750));
    }
    
    await this.battle.turnManager.completeTurnAndContinue();

    await i.followUp({
      content: `Dodge result: ${randomDodge}`,
      ephemeral: true,
    });
  }

  private async getOrSetTarget(i: any, currentPlayerId: string): Promise<any> {
    let target = this.battle.stateManager.getPlayerTarget(currentPlayerId);
    
    if (!target) {
      const availableTargets = this.targetManager.getCurrentTargetList();
      
      if (availableTargets.length === 0) {
        await i.followUp({
          content: "No valid targets available!",
          ephemeral: true,
        });
        return null;
      }
      
      if (availableTargets.length === 1) {
        target = availableTargets[0];
        this.battle.stateManager.setPlayerTarget(currentPlayerId, target, true);
        await i.followUp({
          content: `Auto-selected target: ${target.name}`,
          ephemeral: true,
        });
      } else {
        await i.followUp({
          content: "Please select a target first using the dropdown menu.",
          ephemeral: true,
        });
        return null;
      }
    }
    
    return target;
  }

  private async validateTarget(i: any, target: any, currentPlayerId: string): Promise<boolean> {
    const availableTargets = this.targetManager.getCurrentTargetList();
    const isTargetValid = availableTargets.some(t => 
      t.id === target.id || t._id === target._id || t.serialId === target.serialId
    );
    
    if (!isTargetValid) {
      this.battle.stateManager.clearPlayerTarget(currentPlayerId);
      await i.followUp({
        content: "Your target is no longer available. Please select a new target.",
        ephemeral: true,
      });
      return false;
    }
    
    return true;
  }

  private async executeBasicAttack(target: any): Promise<void> {
    this.battle.stateManager.updateState({
      enemyToHit: target,
      pickedChoice: true
    });
    
    await this.battle.turnManager.performPlayerTurn();
  }

  private async completeTurn(currentPlayerId: any): Promise<void> {
    console.log(`\x1b[34m[ActionHandlers]\x1b[0m Completing turn for: ${currentPlayerId}`);
    const state = this.battle.stateManager.getState();
    // await cycleCooldowns(state.cooldowns, currentPlayerId);
    await this.battle.turnManager.completeTurnAndContinue();
  }
}
