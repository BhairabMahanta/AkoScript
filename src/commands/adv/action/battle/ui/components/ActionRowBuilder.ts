// ui/components/UIActionRowBuilder.ts (renamed from ActionRowBuilder.ts)
import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } from "discord.js";
import { AbilityManager } from "../managers/AbilityManager";
import { TargetManager } from "../managers/TargetManager";

export class UIActionRowBuilder {  // Renamed to avoid conflict
  private battle: any;
  private abilityManager: AbilityManager;
  private targetManager: TargetManager;

  constructor(battle: any) {
    this.battle = battle;
    this.abilityManager = new AbilityManager(battle);
    this.targetManager = new TargetManager(battle);
  }

  async buildActionRows(): Promise<ActionRowBuilder[]> {
    const buttonRow = this.createButtonRow();
    const abilityRow = await this.createAbilityRow();
    const targetRow = this.createTargetRow();

    return [buttonRow, abilityRow, targetRow];
  }

  private createButtonRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("action_normal")
        .setLabel("Basic Attack")
        .setStyle(3),
      new ButtonBuilder()
        .setCustomId("action_dodge")
        .setLabel("Dodge")
        .setStyle(3)
    );
  }

  private async createAbilityRow(): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    const abilityOptions = await this.abilityManager.getAbilityOptions();
    
    const stringMenu = new StringSelectMenuBuilder()
      .setCustomId("starter")
      .setPlaceholder("Pick Ability!")
      .addOptions(abilityOptions);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(stringMenu);
  }

  private createTargetRow(): ActionRowBuilder<StringSelectMenuBuilder> {
    const targetOptions = this.targetManager.createTargetOptions();
    const placeholder = this.targetManager.getTargetMenuPlaceholder();
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("action_select")
      .setPlaceholder(placeholder)
      .addOptions(targetOptions);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  }
}
