// ui/components/MenuBuilder.ts
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

export class MenuBuilder {
  static createAbilityMenu(options: any[], placeholder: string = "Pick Ability!"): StringSelectMenuBuilder {
    return new StringSelectMenuBuilder()
      .setCustomId("starter")
      .setPlaceholder(placeholder)
      .addOptions(options);
  }

  static createTargetMenu(options: any[], placeholder: string = "Select target"): StringSelectMenuBuilder {
    return new StringSelectMenuBuilder()
      .setCustomId("action_select")
      .setPlaceholder(placeholder)
      .addOptions(options);
  }

  static createGenericMenu(customId: string, placeholder: string, options: any[]): StringSelectMenuBuilder {
    return new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(options);
  }

  static createMenuOption(label: string, value: string, description?: string, emoji?: string): StringSelectMenuOptionBuilder {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(value);

    if (description) {
      option.setDescription(description);
    }

    if (emoji) {
      option.setEmoji(emoji);
    }

    return option;
  }

  static createDefaultNoOption(label: string = "No Options", value: string = "no_option"): any {
    return {
      label,
      description: "No options available.",
      value,
    };
  }
}
