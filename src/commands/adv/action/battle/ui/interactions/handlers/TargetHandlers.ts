// ui/interactions/handlers/TargetHandlers.ts
import { TargetManager } from "../../managers/TargetManager";
import { CharacterIdentifier } from "../../managers/CharacterIdentifier";

export class TargetHandlers {
  private battle: any;
  private targetManager: TargetManager;
  private characterIdentifier: CharacterIdentifier;

  constructor(battle: any) {
    this.battle = battle;
    this.targetManager = new TargetManager(battle);
    this.characterIdentifier = new CharacterIdentifier(battle);
  }

  async handleTargetSelection(i: any): Promise<void> {
    const targetIndex = i.values[0];
    const currentPlayerId = this.characterIdentifier.getCurrentPlayerIdFromUserId(i.user.id);
    
    if (targetIndex === "no_target") {
      await i.followUp({
        content: "No valid targets available!",
        ephemeral: true,
      });
      return;
    }
    
    const selectedTarget = this.parseTargetSelection(targetIndex);
    if (!selectedTarget) {
      await i.followUp({
        content: "Invalid target selected!",
        ephemeral: true,
      });
      return;
    }
    
    this.battle.stateManager.setPlayerTarget(currentPlayerId, selectedTarget, false);
    
    console.log(`[TargetHandlers] Target selected: ${selectedTarget.name} for player ${currentPlayerId}`);
    
    await i.followUp({
      content: `Target locked: ${selectedTarget.name}. You will attack this target until you change it or it dies.`,
      ephemeral: true,
    });
  }

  private parseTargetSelection(targetIndex: string): any {
    const realTarget = targetIndex.replace("enemy_", "");
    const targetIndexNumber = parseInt(realTarget, 10);
    
    const availableTargets = this.targetManager.getCurrentTargetList();
    
    if (targetIndexNumber < 0 || targetIndexNumber >= availableTargets.length) {
      return null;
    }
    
    return availableTargets[targetIndexNumber];
  }
}
