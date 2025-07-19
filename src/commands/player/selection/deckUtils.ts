import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ButtonStyle,
} from "discord.js";
import { PlayerModal, DeckItem } from "../../../data/mongo/playerschema";

export interface DeckConfig {
  type: 'battle' | 'dungeon' | 'arena';
  maxSlots: number;
  name: string;
  description: string;
}

export class DeckManager {
  private currentDeck: DeckItem[];
  private config: DeckConfig;
  private userId: string;

  constructor(userId: string, deckType: string = 'battle') {
    this.userId = userId;
    this.config = this.getDeckConfig(deckType);
    this.currentDeck = [];
  }

  private getDeckConfig(deckType: string): DeckConfig {
    switch (deckType.toLowerCase()) {
      case 'dungeon':
      case 'dung':
        return { 
          type: 'dungeon', 
          maxSlots: 6, 
          name: 'Dungeon Deck',
          description: 'Configure your 6-slot dungeon exploration deck with front/back row positioning'
        };
      case 'arena':
      case 'defense':
        return { 
          type: 'arena', 
          maxSlots: 4, 
          name: 'Arena Defense Deck',
          description: 'Configure your 4-slot arena defense deck for PvP battles'
        };
      default:
        return { 
          type: 'battle', 
          maxSlots: 4, 
          name: 'Battle Deck',
          description: 'Configure your main 4-slot battle deck for combat and adventures'
        };
    }
  }

  async loadDeck(): Promise<boolean> {
    try {
      const playerData = await PlayerModal.findById(this.userId);
      if (!playerData) return false;

      switch (this.config.type) {
        case 'dungeon':
          this.currentDeck = playerData.dungeonDeck ? [...playerData.dungeonDeck] : [];
          break;
        case 'arena':
          if (!playerData.arena) {
            await PlayerModal.findByIdAndUpdate(this.userId, {
              $set: { arena: { defenseDeck: [] } }
            });
            this.currentDeck = [];
          } else {
            this.currentDeck = playerData.arena.defenseDeck ? [...playerData.arena.defenseDeck] : [];
          }
          break;
        default:
          this.currentDeck = playerData.deck ? [...playerData.deck] : [];
      }

      this.ensureDeckSize();
      return true;
    } catch (error) {
      console.error('Error loading deck:', error);
      return false;
    }
  }

  private ensureDeckSize(): void {
    while (this.currentDeck.length < this.config.maxSlots) {
      this.currentDeck.push({
        slot: this.currentDeck.length + 1,
        serialId: "empty",
        globalId: "empty",
        name: "empty"
      });
    }
    // Ensure we don't exceed max slots
    if (this.currentDeck.length > this.config.maxSlots) {
      this.currentDeck = this.currentDeck.slice(0, this.config.maxSlots);
    }
  }

  createDeckEmbed(): EmbedBuilder {
    const formattedDescription = this.currentDeck.map((item, index) => {
      const name = item?.name !== "empty" ? `(${item.name})` : "__empty__";
      const serialId = item?.serialId || "e";
      return `**${index + 1}.** ${name} \`${serialId}\``;
    });

    let description: string;
    if (this.config.maxSlots === 6) {
      const topRow = formattedDescription.slice(0, 3).join("  |  ");
      const bottomRow = formattedDescription.slice(3, 6).join("  |  ");
      description = `**Front Row (Higher Damage Taken):**\n${topRow}\n\n**Back Row (Reduced Damage):**\n${bottomRow}`;
    } else {
      const topRow = formattedDescription.slice(0, 2).join("  |  ");
      const bottomRow = formattedDescription.slice(2, 4).join("  |  ");
      description = `**Front Row:**\n${topRow}\n\n**Back Row:**\n${bottomRow}`;
    }

    return new EmbedBuilder()
      .setTitle(`⚔️ ${this.config.name} Configuration`)
      .setDescription(description)
      .setColor(this.config.type === 'battle' ? '#00AE86' : this.config.type === 'dungeon' ? '#8B4513' : '#FF6B35')
      .addFields({
        name: '📋 **Configuration Rules**',
        value: [
          `• **Max Slots:** ${this.config.maxSlots}`,
          `• **Front Row:** Takes more damage but deals more`,
          `• **Back Row:** Takes less damage but deals less`,
          `• **Commands:** 'p' = player, 'e' = empty, or use familiar serial IDs`,
          `• **Duplicates:** Not allowed in the same deck`
        ].join('\n'),
        inline: false
      })
      .setFooter({ text: `${this.config.name} • ${this.config.description}` });
  }

  createComponents(): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
    const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

    if (this.config.maxSlots === 6) {
      // Dungeon deck (6 slots)
      const buttons1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId("deck_slot1").setLabel("1").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_slot2").setLabel("2").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_slot3").setLabel("3").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_save").setLabel("💾 Save").setStyle(ButtonStyle.Success)
        );

      const buttons2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId("deck_slot4").setLabel("4").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_slot5").setLabel("5").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_slot6").setLabel("6").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_reset").setLabel("🔄 Reset").setStyle(ButtonStyle.Danger)
        );

      const buttons3 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId("deck_auto").setLabel("🎲 Auto Fill").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("deck_clear").setLabel("🗑️ Clear All").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_back").setLabel("⬅️ Back to Menu").setStyle(ButtonStyle.Secondary)
        );

      components.push(buttons1, buttons2, buttons3);
    } else {
      // Battle deck and Arena deck (4 slots)
      const buttons1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId("deck_slot1").setLabel("1").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_slot2").setLabel("2").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_save").setLabel("💾 Save Deck").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("deck_reset").setLabel("🔄 Reset").setStyle(ButtonStyle.Danger)
        );

      const buttons2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId("deck_slot3").setLabel("3").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_slot4").setLabel("4").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("deck_auto").setLabel("🎲 Auto Fill").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("deck_back").setLabel("⬅️ Back to Menu").setStyle(ButtonStyle.Secondary)
        );

      components.push(buttons1, buttons2);
    }

    // Quick actions menu - only show copy option for non-battle decks
    const selectOptions = [
      {
        label: "Fast Input",
        description: `Enter ${this.config.maxSlots} values separated by spaces`,
        value: "select_deck_fast",
        emoji: "⚡"
      },
      {
        label: "Auto Select",
        description: "Randomly fill deck with player + available familiars",
        value: "auto_select",
        emoji: "🎲"
      }
    ];

    if (this.config.type !== 'battle') {
      selectOptions.push({
        label: "Copy from Battle Deck",
        description: "Copy configuration from your battle deck",
        value: "copy_battle",
        emoji: "📋"
      });
    }

    const optionSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("deck_fast_select")
          .setPlaceholder("🚀 Quick Actions")
          .addOptions(selectOptions)
      );

    components.push(optionSelectRow);
    return components;
  }

  async handleSlotInput(slotNumber: number, input: string): Promise<{ success: boolean; error?: string; item?: DeckItem }> {
    try {
      const playerData = await PlayerModal.findById(this.userId);
      if (!playerData) {
        return { success: false, error: "Player data not found" };
      }

      const normalizedInput = input.toLowerCase().trim();
      let newItem: DeckItem;

      if (normalizedInput === "e" || normalizedInput === "empty") {
        newItem = {
          slot: slotNumber,
          serialId: "empty",
          globalId: "empty",
          name: "empty"
        };
      } else if (normalizedInput === "p" || normalizedInput === "player") {
        newItem = {
          slot: slotNumber,
          serialId: "player",
          globalId: this.userId,
          name: playerData.name || "Player"
        };
      } else {
        const foundFamiliar = playerData.collectionInv?.find(
          (item: any) => item.serialId === input.trim()
        );

        if (!foundFamiliar) {
          return { success: false, error: `Familiar with serial ID '${input}' not found in your collection` };
        }

        // Check for duplicates in current deck
        const existingFamiliar = this.currentDeck.find(
          (item, index) => index !== (slotNumber - 1) && item?.serialId === foundFamiliar.serialId
        );

        if (existingFamiliar) {
          return { success: false, error: `This familiar is already in slot ${this.currentDeck.indexOf(existingFamiliar) + 1}` };
        }

        // Only use properties that exist in DeckItem interface
        newItem = {
          slot: slotNumber,
          serialId: foundFamiliar.serialId,
          globalId: foundFamiliar.globalId,
          name: foundFamiliar.name
        };
      }

      this.currentDeck[slotNumber - 1] = newItem;
      return { success: true, item: newItem };
    } catch (error) {
      console.error('Error processing slot input:', error);
      return { success: false, error: "An error occurred while processing the input" };
    }
  }

  async handleFastInput(inputs: string[]): Promise<{ success: boolean; error?: string }> {
    if (inputs.length !== this.config.maxSlots) {
      return { success: false, error: `Please provide exactly ${this.config.maxSlots} values separated by spaces` };
    }

    try {
      const playerData = await PlayerModal.findById(this.userId);
      if (!playerData) {
        return { success: false, error: "Player data not found" };
      }

      const newDeck: DeckItem[] = [];
      const usedSerialIds = new Set<string>();

      for (let i = 0; i < this.config.maxSlots; i++) {
        const input = inputs[i].toLowerCase().trim();
        
        if (input === "e" || input === "empty") {
          newDeck.push({
            slot: i + 1,
            serialId: "empty",
            globalId: "empty",
            name: "empty"
          });
        } else if (input === "p" || input === "player") {
          if (usedSerialIds.has("player")) {
            return { success: false, error: "Player can only appear once in the deck" };
          }
          usedSerialIds.add("player");
          
          newDeck.push({
            slot: i + 1,
            serialId: "player",
            globalId: this.userId,
            name: playerData.name || "Player"
          });
        } else {
          const foundFamiliar = playerData.collectionInv?.find(
            (item: any) => item.serialId === input
          );

          if (!foundFamiliar) {
            return { success: false, error: `Familiar with serial ID '${input}' not found` };
          }

          if (usedSerialIds.has(foundFamiliar.serialId)) {
            return { success: false, error: `Familiar '${foundFamiliar.name}' (${input}) is used multiple times` };
          }
          usedSerialIds.add(foundFamiliar.serialId);

          // Only use properties that exist in DeckItem interface
          newDeck.push({
            slot: i + 1,
            serialId: foundFamiliar.serialId,
            globalId: foundFamiliar.globalId,
            name: foundFamiliar.name
          });
        }
      }

      this.currentDeck = newDeck;
      return { success: true };
    } catch (error) {
      console.error('Error processing fast input:', error);
      return { success: false, error: "An error occurred while processing the input" };
    }
  }

  async autoFillDeck(): Promise<boolean> {
    try {
      const playerData = await PlayerModal.findById(this.userId);
      if (!playerData) return false;

      // Clear deck
      this.currentDeck = Array.from({ length: this.config.maxSlots }, (_, i) => ({
        slot: i + 1,
        serialId: "empty",
        globalId: "empty",
        name: "empty"
      }));

      // Add player in first slot
      this.currentDeck[0] = {
        slot: 1,
        serialId: "player",
        globalId: this.userId,
        name: playerData.name || "Player"
      };

      // Add random familiars (avoid duplicates)
      const availableFamiliars = playerData.collectionInv?.filter((f: any) => 
        f.name && f.name !== "empty" && f.serialId
      ) || [];
      
      if (availableFamiliars.length > 0) {
        const shuffled = [...availableFamiliars].sort(() => Math.random() - 0.5);
        const maxFamiliars = Math.min(this.config.maxSlots - 1, shuffled.length);
        
        for (let i = 0; i < maxFamiliars; i++) {
          const familiar = shuffled[i];
          // Only use properties that exist in DeckItem interface
          this.currentDeck[i + 1] = {
            slot: i + 2,
            serialId: familiar.serialId,
            globalId: familiar.globalId,
            name: familiar.name
          };
        }
      }

      return true;
    } catch (error) {
      console.error('Error auto-filling deck:', error);
      return false;
    }
  }

  async copyFromBattleDeck(): Promise<{ success: boolean; error?: string }> {
    if (this.config.type === 'battle') {
      return { success: false, error: "Cannot copy battle deck to itself" };
    }

    try {
      const playerData = await PlayerModal.findById(this.userId);
      if (!playerData || !playerData.deck) {
        return { success: false, error: "No battle deck found to copy from" };
      }

      const sourceDeck = playerData.deck;
      this.currentDeck = Array.from({ length: this.config.maxSlots }, (_, i) => ({
        slot: i + 1,
        serialId: "empty",
        globalId: "empty",
        name: "empty"
      }));

      // Copy from battle deck, adjusting for slot differences
      for (let i = 0; i < Math.min(this.config.maxSlots, sourceDeck.length); i++) {
        if (sourceDeck[i] && sourceDeck[i].name !== "empty") {
          this.currentDeck[i] = {
            slot: i + 1,
            serialId: sourceDeck[i].serialId,
            globalId: sourceDeck[i].globalId,
            name: sourceDeck[i].name
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error copying from battle deck:', error);
      return { success: false, error: "Failed to copy from battle deck" };
    }
  }

  resetDeck(): void {
    this.currentDeck = Array.from({ length: this.config.maxSlots }, (_, i) => ({
      slot: i + 1,
      serialId: "empty",
      globalId: "empty",
      name: "empty"
    }));
  }

  clearDeck(): void {
    this.resetDeck();
  }

async saveDeck(): Promise<boolean> {
  try {
    const updateQuery: any = {};
    
    switch (this.config.type) {
      case 'dungeon':
        updateQuery.dungeonDeck = this.currentDeck;
        break;
      case 'arena':
        updateQuery['arena.defenseDeck'] = this.currentDeck;
        break;
      default:
        updateQuery.deck = this.currentDeck;
        
        // ✅ FIX: Create proper selectedFamiliars structure
        const selectedFamiliarsData = await this.createSelectedFamiliarsData();
        if (selectedFamiliarsData) {
          updateQuery['selectedFamiliars.name'] = selectedFamiliarsData;
        }
        break;
    }

    await PlayerModal.findByIdAndUpdate(this.userId, { $set: updateQuery });
    return true;
  } catch (error) {
    console.error('Error saving deck:', error);
    return false;
  }
}

// ✅ NEW: Helper method to create proper selectedFamiliars structure
private async createSelectedFamiliarsData(): Promise<any[] | null> {
  try {
    const playerData = await PlayerModal.findById(this.userId);
    if (!playerData) return null;

    const selectedFamiliars = this.currentDeck
      .filter(item => item.name !== "empty" && item.serialId !== "player")
      .map(item => {
        // Find the familiar in the collection to get tier info
        const familiarInCollection = playerData.collectionInv?.find(
          (collectionItem: any) => collectionItem.serialId === item.serialId
        );

        return {
          name: item.name,
          serialId: item.serialId,
          tier: familiarInCollection?.stats?.tier || 1, // Default to tier 1 if not found
          // Add other properties your schema might expect
          globalId: item.globalId || familiarInCollection?.globalId
        };
      });

    return selectedFamiliars;
  } catch (error) {
    console.error('Error creating selectedFamiliars data:', error);
    return null;
  }
}


  getDeck(): DeckItem[] {
    return [...this.currentDeck];
  }

  getConfig(): DeckConfig {
    return { ...this.config };
  }
}

// Utility functions for creating modals
export function createSlotModal(slotNumber: number, deckName: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`deck_modal_${slotNumber}`)
    .setTitle(`${deckName} - Configure Slot ${slotNumber}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`deck_input_${slotNumber}`)
          .setLabel("Enter: 'p' (player), 'e' (empty), or familiar serial ID")
          .setPlaceholder("Examples: p, e, 1234, abc123")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50)
      )
    );
}

export function createFastInputModal(deckName: string, maxSlots: number): ModalBuilder {
  return new ModalBuilder()
    .setCustomId("deck_modal_fast_select")
    .setTitle(`${deckName} - Fast Configuration`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("deck_input_fast_select")
          .setLabel(`Enter ${maxSlots} values separated by spaces`)
          .setPlaceholder(`Example: p 1234 5678 e${maxSlots === 6 ? ' e e' : ''}`)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
      )
    );
}
