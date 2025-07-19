// ui/interactions/handlers/CooldownHandlers.ts
export class CooldownHandlers {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

  async handleCooldownsDisplay(i: any): Promise<void> {
    await i.deferUpdate();
    const state = this.battle.stateManager.getState();
    
    const filteredCooldowns = state.cooldowns ? state.cooldowns.filter(
      (cooldown: any) => cooldown.cooldown > 0
    ) : [];
    
    if (filteredCooldowns.length === 0) {
      await i.followUp({
        content: "**Cooldowns**\nNo active cooldowns.",
        ephemeral: true,
      });
      return;
    }
    
    const cooldownDescriptions = filteredCooldowns.map(
      (cooldown: any) => `**${cooldown.name}**: ${cooldown.cooldown} turns left`
    );

    await i.followUp({
      content: `**Cooldowns**\n${cooldownDescriptions.join("\n")}`,
      ephemeral: true,
    });
  }
}
