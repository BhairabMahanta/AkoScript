import { defenseStates } from "../buttonHandler";

export class DefenseModalHandlers {
  static async handleFastInput(interaction: any): Promise<void> {
    const playerId = interaction.user.id;
    const state = defenseStates.get(playerId);
    
    if (!state?.deckManager) {
      await interaction.reply({
        content: '❌ No active deck configuration found. Please try again.',
        ephemeral: true
      });
      return;
    }
    
    try {
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
    } catch (error) {
      console.error('Error in handleFastInput:', error);
      await interaction.reply({
        content: '❌ Failed to process fast input. Please try again.',
        ephemeral: true
      });
    }
  }

  static async handleSlotInput(interaction: any): Promise<void> {
    const playerId = interaction.user.id;
    const state = defenseStates.get(playerId);
    
    if (!state?.deckManager) {
      await interaction.reply({
        content: '❌ No active deck configuration found. Please try again.',
        ephemeral: true
      });
      return;
    }
    
    try {
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
    } catch (error) {
      console.error('Error in handleSlotInput:', error);
      await interaction.reply({
        content: '❌ Failed to process slot input. Please try again.',
        ephemeral: true
      });
    }
  }
}
