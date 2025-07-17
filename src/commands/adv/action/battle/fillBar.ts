// ui/BattleBarManager.ts
import { ExtendedPlayer } from "../../../gamelogic/buffdebufflogic";
import {
  generateAttackBarEmoji,
  generateHPBarEmoji,
} from "../../../util/glogic";

interface BattlePlayer extends ExtendedPlayer {
  speedBuff?: boolean; // ✅ Fixed: Changed from number to boolean | undefined
  maxHp: number;
  atkBar: number;
  attackBarEmoji?: string;
  hpBarEmoji?: string;
}

export class BattleBarManager {
  constructor() {}

  async fillAtkBars(characters: BattlePlayer[]): Promise<BattlePlayer[]> {
    const charactersWith100AtkBar: BattlePlayer[] = [];
    
    try {
      console.log("Starting fillAtkBars...");

      // Filter out characters with no stats
      const validCharacters = characters.filter(char => char && char.stats);
      
      if (validCharacters.length === 0) {
        console.log("No valid characters for attack bar filling");
        return [];
      }

      // Sort characters by speed in descending order
      validCharacters.sort(
        (a: BattlePlayer, b: BattlePlayer) => (b.stats?.speed || 0) - (a.stats?.speed || 0)
      );

      // Check if any character already has atkBar >= 100
      for (const character of validCharacters) {
        if ((character.atkBar || 0) >= 100) {
          console.log("found atkBar >= 100 for:", character.name);
          charactersWith100AtkBar.push(character);
          return charactersWith100AtkBar;
        }
      }

      // Calculate the smallestFactor for all characters
      const smallestFactor = validCharacters.reduce((minFactor, character) => {
        const speedMultiplier = character.speedBuff ? 1.3 : 1; // ✅ Now correctly uses boolean
        const currentAtkBar = character.atkBar || 0;
        const speed = character.stats?.speed || 1;

        const factor = (100 - currentAtkBar) / (speed * 0.05 * speedMultiplier);
        return Math.min(minFactor, factor);
      }, Infinity);

      // Update atkBar for all characters using smallestFactor
      for (const character of validCharacters) {
        const speedMultiplier = character.speedBuff ? 1.3 : 1; // ✅ Now correctly uses boolean
        const speed = character.stats?.speed || 1;
        const currentAtkBar = character.atkBar || 0;
        
        character.atkBar = currentAtkBar + (smallestFactor * (speed * 0.05 * speedMultiplier));

        if (character.atkBar >= 100) {
          charactersWith100AtkBar.push(character);
        }
      }

      // Generate attack bar emoji for each character
      for (const character of validCharacters) {
        try {
          character.attackBarEmoji = await generateAttackBarEmoji(character.atkBar || 0);
        } catch (error) {
          console.log("Error generating attack bar emoji:", error);
          character.attackBarEmoji = "░░░░░░░░░░"; // Fallback
        }
      }

      if (charactersWith100AtkBar.length > 0) {
        console.log("Processing characters with 100 atkBar:", charactersWith100AtkBar[0].name);
      }
    } catch (error) {
      console.log("fillAtkBars error:", error);
    }
    
    return charactersWith100AtkBar;
  }

  async fillHpBars(characters: BattlePlayer[]): Promise<void> {
    try {
      console.log("Starting fillHpBars...");
      
      for (const character of characters) {
        if (!character || !character.stats) continue;
        
        try {
          character.hpBarEmoji = await generateHPBarEmoji(
            character.stats.hp || 0,
            character.maxHp || character.stats.hp || 1
          );
        } catch (error) {
          console.log("Error generating HP bar emoji:", error);
          character.hpBarEmoji = "▓▓▓▓▓▓▓▓▓▓"; // Fallback
        }
      }
    } catch (error) {
      console.log("fillHpBars error:", error);
    }
  }

  async calculateOverallHp(character: BattlePlayer): Promise<number | undefined> {
    try {
      return character.stats?.hp || 0;
    } catch (error) {
      console.log("calculateOverallHp error:", error);
      return 0;
    }
  }
}
