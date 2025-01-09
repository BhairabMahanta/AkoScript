import { ExtendedPlayer } from "../../../gamelogic/buffDebuffManager";
import {
  generateAttackBarEmoji,
  generateHPBarEmoji,
} from "../../../util/glogic";
interface battlePlayer extends ExtendedPlayer {
  speedBuff: number;
  maxHp: number;
}
export class BattleBarManager {
  constructor() {}

  async fillAtkBars(characters: battlePlayer[]): Promise<battlePlayer[]> {
    const charactersWith100AtkBar: battlePlayer[] = [];
    try {
      console.log("Starting fillAtkBars...");

      // Sort characters by speed in descending order
      characters.sort(
        (a: battlePlayer, b: battlePlayer) => b.stats.speed - a.stats.speed
      );

      // Check if any character already has atkBar >= 100
      for (const character of characters) {
        if (character.atkBar >= 100) {
          console.log("found atkBar >= 100 for:", character.name);
          charactersWith100AtkBar.push(character);
          return charactersWith100AtkBar; // Exit early if any character has atkBar >= 100
        }
      }

      // Calculate the smallestFactor for all characters
      const smallestFactor = characters.reduce((minFactor, character) => {
        const speedMultiplier = character.speedBuff ? 1.3 : 1;
        const toMinus = character.atkBar;

        const factor =
          (100 - toMinus) / (character.stats.speed * 0.05 * speedMultiplier);

        return Math.min(minFactor, factor);
      }, Infinity);

      // Update atkBar for all characters using smallestFactor
      for (const character of characters) {
        const speedMultiplier = character.speedBuff ? 1.3 : 1;
        character.atkBar +=
          smallestFactor * (character.stats.speed * 0.05 * speedMultiplier);

        if (character.atkBar >= 100) {
          charactersWith100AtkBar.push(character);
        }
      }

      // Generate attack bar emoji for each character
      for (const character of characters) {
        character.attackBarEmoji = await generateAttackBarEmoji(
          character.atkBar
        );
      }

      if (charactersWith100AtkBar.length > 0) {
        console.log(
          "Processing characters with 100 atkBar:",
          charactersWith100AtkBar[0].name
        );
      }
    } catch (error) {
      console.log("fillBarError:", error);
    }
    return charactersWith100AtkBar;
  }

  async fillHpBars(characters: battlePlayer[]): Promise<void> {
    try {
      console.log("Starting fillHpBars...");
      for (const character of characters) {
        const hp = await this.calculateOverallHp(character);
        character.hpBarEmoji = await generateHPBarEmoji(
          character.stats.hp,
          character.maxHp
        );
      }
    } catch (error) {
      console.log("fillBarError:", error);
    }
  }

  async calculateOverallHp(
    character: battlePlayer
  ): Promise<number | undefined> {
    try {
      return character.stats.hp;
    } catch (error) {
      console.log("speedcalculator:", error);
    }
  }
}
