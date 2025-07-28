// ui/interactions/DiscordInteractionManager.ts
import { CharacterIdentifier } from "../managers/CharacterIdentifier";
import { ActionHandlers } from "./handlers/ActionHandlers";
import { TargetHandlers } from "./handlers/TargetHandlers";
import { AbilityHandlers } from "./handlers/AbilityHandlers";
import { CooldownHandlers } from "./handlers/CooldownHandlers";

export class DiscordInteractionManager {
  private battle: any;
  private characterIdentifier: CharacterIdentifier;
  private actionHandlers: ActionHandlers;
  private targetHandlers: TargetHandlers;
  private abilityHandlers: AbilityHandlers;
  private cooldownHandlers: CooldownHandlers;

  constructor(battle: any) {
    this.battle = battle;
    this.characterIdentifier = new CharacterIdentifier(battle);
    this.actionHandlers = new ActionHandlers(battle);
    this.targetHandlers = new TargetHandlers(battle);
    this.abilityHandlers = new AbilityHandlers(battle);
    this.cooldownHandlers = new CooldownHandlers(battle);
  }

  async handleInteraction(i: any): Promise<void> {
    console.log(`[DiscordInteractionManager] Handling interaction: ${i.customId} from ${i.user.username}`);
    
    // Validate turn permissions
    if (!this.isValidInteraction(i)) {
      return;
    }

    // Check if character is alive
    if (!this.isCharacterAlive(i)) {
      return;
    }

    try {
      if (!["starter"].includes(i.customId)) {
        await i.deferUpdate();
      }

      await this.routeInteraction(i);
    } catch (error) {
      console.error("[DiscordInteractionManager] Error handling interaction:", error);
      await i.followUp({
        content: "An error occurred. Please try again later.",
        ephemeral: true,
      });
    }
  }

private async isValidInteraction(i: any): Promise<boolean> {
  // ✅ Block ALL interactions during AI processing
  if (this.battle.mode === 'pvp_afk') {
    const state = this.battle.stateManager.getState();
    const currentTurn = state.currentTurn;
    
    // Check if current turn belongs to AI
    if (this.characterIdentifier.isAICharacterTurn(currentTurn)) {
      await i.reply({ 
        content: "AI is processing its turn. Please wait...", 
        ephemeral: true 
      });
      return false;
    }
    
    // ✅ Additional protection: Check if AI is mid-execution
    if (this.battle.turnManager.isAIExecuting || this.battle.turnManager.embedUpdateInProgress) {
      await i.reply({ 
        content: "AI turn is still being processed. Please wait...", 
        ephemeral: true 
      });
      return false;
    }
  }
  
  // Rest of validation...
  if (this.battle.mode !== 'pve') {
    const isCurrentPlayersTurn = this.isCurrentPlayersTurn(i.user.id);
    
    if (!isCurrentPlayersTurn) {
      await i.reply({ 
        content: "It's not your turn! Wait for your opponent to finish their turn.", 
        ephemeral: true 
      });
      return false;
    }
  }
  return true;
}


  private async isCharacterAlive(i: any): Promise<boolean> {
    const state = this.battle.stateManager.getState();
    if (state.currentTurn?.stats.hp <= 0) {
      await i.reply({
        content: `${state.currentTurn.name} is dead and cannot take actions!`,
        ephemeral: true,
      });
      return false;
    }
    return true;
  }

  private async routeInteraction(i: any): Promise<void> {
    switch (i.customId) {
      case "action_normal":
        await this.actionHandlers.handleBasicAttack(i);
        break;
      case "action_dodge":
        await this.actionHandlers.handleDodge(i);
        break;
      case "action_select":
        await this.targetHandlers.handleTargetSelection(i);
        break;
      case "starter":
        await this.routeStarterSelection(i);
        break;
      default:
        console.error(`[DiscordInteractionManager] Unhandled customId: ${i.customId}`);
    }
  }

  private async routeStarterSelection(i: any): Promise<void> {
    const selectedValue = i.values[0];

    if (selectedValue === "no_ability") {
      await this.abilityHandlers.handleNoAbility(i);
    } else if (selectedValue.startsWith("selection-")) {
      await this.abilityHandlers.handleModalSelection(i, selectedValue);
    } else if (selectedValue === "cooldowns") {
      await this.cooldownHandlers.handleCooldownsDisplay(i);
    } else if (selectedValue.startsWith("ability-")) {
      await this.abilityHandlers.handleAbilitySelection(i, selectedValue);
    }
  }

  private isCurrentPlayersTurn(userId: string): boolean {
    const state = this.battle.stateManager.getState();
    const currentTurn = state.currentTurn;
    
    if (!currentTurn) return false;
    
    if (this.battle.mode === 'pvp_afk' && this.characterIdentifier.isAICharacterTurn(currentTurn)) {
      return false;
    }
    
    return this.battle.isCurrentPlayersCharacter(currentTurn, userId);
  }
}
