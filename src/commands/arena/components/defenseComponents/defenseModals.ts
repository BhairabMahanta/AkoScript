import { DefenseMenuState } from "./defenseTypes";

export class DefenseModalHandlers {
  static async handleFastInput(
    interaction: any,
    state: DefenseMenuState
  ): Promise<void> {
    if (!state.deckManager) return;
    
    const inputValues = interaction.fields.getTextInputValue("deck_input_fast_select");
    const inputs = inputValues.trim().split(/\s+/);
    
    const result = await state.deckManager.handleFastInput(inputs);
    
    if (result.success) {
      const embed = state.deckManager.createDeckEmbed();
      const components = state.deckManager.createComponents();
      
      await interaction.update({
        embeds: [embed],
        components
      });
    } else {
      await interaction.reply({
        content: `❌ ${result.error}`,
        ephemeral: true
      });
    }
  }

  static async handleSlotInput(
    interaction: any,
    state: DefenseMenuState
  ): Promise<void> {
    if (!state.deckManager) return;
    
    const slotNumber = parseInt(interaction.customId.replace('deck_modal_', ''), 10);
    const input = interaction.fields.getTextInputValue(`deck_input_${slotNumber}`);
    
    const result = await state.deckManager.handleSlotInput(slotNumber, input);
    
    if (result.success) {
      const embed = state.deckManager.createDeckEmbed();
      const components = state.deckManager.createComponents();
      
      await interaction.update({
        embeds: [embed],
        components
      });
    } else {
      await interaction.reply({
        content: `❌ ${result.error}`,
        ephemeral: true
      });
    }
  }
}
