import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { PlayerModal } from "../../../data/mongo/playerschema";
import classesData from "../../../data/classes/allclasses";
import racesData from "../../../data/races/races";
import abilitiesData from "../../../data/abilities";

export interface SelectionState {
  userId: string;
  selectedRace?: string;
  selectedClass?: string;
}

export class SelectionManager {
  private state: SelectionState;

  constructor(userId: string) {
    this.state = {
      userId
    };
    console.log('🔧 SelectionManager created for user:', userId);
  }

  // Race Selection - Separated embed creation
  createRaceComponents(): {
    embed: EmbedBuilder;
    components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[];
  } {
    console.log('🔧 Creating race components, selected race:', this.state.selectedRace);
    
    const raceOptions = Object.keys(racesData).map((raceName) => ({
      label: raceName,
      value: `race-${raceName}`,
      description: racesData[raceName].description?.substring(0, 50) + "..." || `The ${raceName} race`
    }));

    const raceSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("race_select")
      .setPlaceholder("Select your character's race")
      .addOptions(raceOptions);

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirm_race")
      .setLabel("✅ Confirm Race")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!this.state.selectedRace);

    const backButton = new ButtonBuilder()
      .setCustomId("back_to_main")
      .setLabel("⬅️ Back to Menu")
      .setStyle(ButtonStyle.Secondary);

    // Create appropriate embed based on selection state
    let embed: EmbedBuilder;
    
    if (this.state.selectedRace) {
      console.log('🎯 Creating detailed race embed');
      embed = this.createRaceDetailEmbed();
    } else {
      console.log('📋 Creating race list embed');
      embed = this.createRaceListEmbed();
    }

    return {
      embed,
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(raceSelectMenu),
        new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, backButton)
      ]
    };
  }

  // Separate function for race list view
  private createRaceListEmbed(): EmbedBuilder {
    const raceFields = Object.keys(racesData).slice(0, 8).map((raceName) => ({
      name: `🏰 **${raceName}**`,
      value: racesData[raceName].description || `The ${raceName} race`,
      inline: false
    }));

    return new EmbedBuilder()
      .setTitle("🏰 Race Selection")
      .setDescription("Choose your race to determine your base stats, abilities, and racial bonuses.\n**Select a race from the dropdown below to see detailed information.**")
      .setColor('#FF6B35')
      .addFields(raceFields)
      .setFooter({ 
        text: "Select a race from the dropdown to see detailed information" 
      });
  }

  // Separate function for race detail view
  private createRaceDetailEmbed(): EmbedBuilder {
    if (!this.state.selectedRace) {
      return this.createRaceListEmbed();
    }

    const raceName = this.state.selectedRace.replace('race-', '');
    const raceData = racesData[raceName];
    
    console.log('🎯 Race data found:', raceData);
    
    if (!raceData) {
      return this.createRaceListEmbed();
    }

    const statsText = [
      `**HP:** ${raceData.stats.hp}`,
      `**Attack:** ${raceData.stats.attack}`,
      `**Defense:** ${raceData.stats.defense}`,
      `**Magic:** ${raceData.stats.magic}`,
      `**Magic Defense:** ${raceData.stats.magicDefense}`,
      `**Speed:** ${raceData.stats.speed}`,
      `**Divine Power:** ${raceData.stats.divinePower}`
    ].join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`Pick ${raceName} Race?`)
      .setDescription(`**${raceName}**\n${raceData.description || 'Versatile and adaptable, this race possesses a balanced set of abilities.'}`)
      .setColor('#FF6B35')
      .addFields([
        {
          name: '📊 **Base Stats**',
          value: statsText,
          inline: true
        }
      ])
      .setFooter({ 
        text: "Selecting a race will replace your current stats with the race's stats." 
      });

    // Add abilities if they exist
    if (raceData.abilities && raceData.abilities.length > 0) {
      raceData.abilities.forEach((abilityName: string) => {
        const abilityInfo = abilitiesData[abilityName];
        embed.addFields([{
          name: `✨ **${abilityName}**`,
          value: abilityInfo?.description || 'Powerful racial ability',
          inline: false
        }]);
      });
    }

    console.log('✅ Created detailed race embed for:', raceName);
    return embed;
  }

  // Class Selection - Separated embed creation
  createClassComponents(): {
    embed: EmbedBuilder;
    components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[];
  } {
    console.log('🔧 Creating class components, selected class:', this.state.selectedClass);
    
    const classOptions = Object.keys(classesData)
      .filter((className) => classesData[className].state !== "locked")
      .map((className) => ({
        label: className,
        value: `class-${className}`,
        description: classesData[className].description?.substring(0, 50) + "..." || `The ${className} class`
      }));

    const classSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("class_select")
      .setPlaceholder("Select your character's class")
      .addOptions(classOptions);

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirm_class")
      .setLabel("✅ Confirm Class")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!this.state.selectedClass);

    const backButton = new ButtonBuilder()
      .setCustomId("back_to_main")
      .setLabel("⬅️ Back to Menu")
      .setStyle(ButtonStyle.Secondary);

    // Create appropriate embed based on selection state
    let embed: EmbedBuilder;
    
    if (this.state.selectedClass) {
      console.log('🎯 Creating detailed class embed');
      embed = this.createClassDetailEmbed();
    } else {
      console.log('📋 Creating class list embed');
      embed = this.createClassListEmbed();
    }

    return {
      embed,
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(classSelectMenu),
        new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, backButton)
      ]
    };
  }

  // Separate function for class list view
  private createClassListEmbed(): EmbedBuilder {
    const availableClasses = Object.keys(classesData)
      .filter((className) => classesData[className].state !== "locked");
    
    const classFields = availableClasses.slice(0, 8).map((className) => ({
      name: `⚔️ **${className}**`,
      value: classesData[className].description || `The ${className} class`,
      inline: false
    }));

    return new EmbedBuilder()
      .setTitle("⚔️ Class Selection")
      .setDescription("Choose your class to define your combat role, abilities, and playstyle.\n**Select a class from the dropdown below to see detailed information.**")
      .setColor('#4ECDC4')
      .addFields(classFields)
      .setFooter({ 
        text: "Select a class from the dropdown to see detailed information" 
      });
  }

  // Separate function for class detail view
  private createClassDetailEmbed(): EmbedBuilder {
    if (!this.state.selectedClass) {
      return this.createClassListEmbed();
    }

    const className = this.state.selectedClass.replace('class-', '');
    const classData = classesData[className];
    
    console.log('🎯 Class data found:', classData);
    
    if (!classData) {
      return this.createClassListEmbed();
    }

    const embed = new EmbedBuilder()
      .setTitle(`Pick ${className} Class?`)
      .setDescription(`**${className}**\n${classData.description || `The ${className} class offers unique combat abilities and playstyle.`}`)
      .setColor('#4ECDC4')
      .setFooter({ 
        text: "Use the buttons to navigate through the options." 
      });

    // Add abilities if they exist
    if (classData.abilities && classData.abilities.length > 0) {
      const abilityText = classData.abilities.map((ability: string) => {
        const abilityInfo = abilitiesData[ability];
        return `**${ability}:** ${abilityInfo?.description || 'Powerful class ability'}`;
      }).join('\n\n');

      embed.addFields([
        {
          name: '⚡ **Class Abilities**',
          value: abilityText,
          inline: false
        }
      ]);
    }

    console.log('✅ Created detailed class embed for:', className);
    return embed;
  }

  // State management methods - Enhanced with debug logging
  setSelectedRace(raceValue: string): void {
    console.log('🔄 Setting selected race from:', this.state.selectedRace, 'to:', raceValue);
    this.state.selectedRace = raceValue;
    console.log('✅ Selected race set to:', this.state.selectedRace);
  }

  setSelectedClass(classValue: string): void {
    console.log('🔄 Setting selected class from:', this.state.selectedClass, 'to:', classValue);
    this.state.selectedClass = classValue;
    console.log('✅ Selected class set to:', this.state.selectedClass);
  }

  getState(): SelectionState {
    console.log('📋 Current state:', this.state);
    return { ...this.state };
  }

  // Save methods (unchanged)
  async saveRace(): Promise<{ success: boolean; error?: string }> {
    if (!this.state.selectedRace) {
      return { success: false, error: "No race selected" };
    }

    try {
      const raceName = this.state.selectedRace.replace('race-', '');
      const raceData = racesData[raceName];

      if (!raceData || !raceData.stats) {
        return { success: false, error: "Invalid race data" };
      }

      const playerData = await PlayerModal.findById(this.state.userId);
      if (!playerData) {
        return { success: false, error: "Player not found" };
      }

      const updatedStats = {
        hp: raceData.stats.hp,
        attack: raceData.stats.attack,
        defense: raceData.stats.defense,
        magic: raceData.stats.magic,
        magicDefense: raceData.stats.magicDefense,
        speed: raceData.stats.speed,
        divinePower: raceData.stats.divinePower,
        critRate: playerData.stats?.critRate || 0,
        critDamage: playerData.stats?.critDamage || 0,
        luck: playerData.stats?.luck || 0,
        potential: playerData.stats?.potential || 0,
      };

      await PlayerModal.findByIdAndUpdate(this.state.userId, {
        $set: {
          race: raceName,
          raceStatus: "race-updated",
          stats: updatedStats,
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving race:', error);
      return { success: false, error: "Failed to save race selection" };
    }
  }

  async saveClass(): Promise<{ success: boolean; error?: string }> {
    if (!this.state.selectedClass) {
      return { success: false, error: "No class selected" };
    }

    try {
      const className = this.state.selectedClass.replace('class-', '');
      const classData = classesData[className];

      if (!classData) {
        return { success: false, error: "Invalid class data" };
      }
      
      await PlayerModal.findByIdAndUpdate(this.state.userId, {
        $set: {
          class: className,
          classStatus: "class-updated"
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving class:', error);
      return { success: false, error: "Failed to save class selection" };
    }
  }
}
