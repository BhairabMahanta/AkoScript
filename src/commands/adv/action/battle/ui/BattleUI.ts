// ui/BattleUI.ts
import { DiscordInteractionManager } from "./interactions/DiscordInteractionManager";
import { UIActionRowBuilder as BattleActionRowBuilder } from "./components/ActionRowBuilder";

export class BattleUI {
  private battle: any;
  private interactionManager: DiscordInteractionManager;
  private actionRowBuilder: BattleActionRowBuilder;

  constructor(battle: any) {
    this.battle = battle;
    this.interactionManager = new DiscordInteractionManager(battle);
    this.actionRowBuilder = new BattleActionRowBuilder(battle);
  }

  async createActionRows(): Promise<any[]> {  // Changed return type
    const rows = await this.actionRowBuilder.buildActionRows();
    // Convert ActionRowBuilder objects to JSON format
    return rows.map(row => row.toJSON ? row.toJSON() : row);
  }

  async handleInteraction(interaction: any): Promise<void> {
    await this.interactionManager.handleInteraction(interaction);
  }
}
