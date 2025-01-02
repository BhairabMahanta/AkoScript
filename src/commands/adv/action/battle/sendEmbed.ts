import { EmbedBuilder } from "discord.js";
import { quests } from "../../quest/quests";
import { mongoClient } from "../../../../data/mongo/mongo";
const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");
export class BattleEmbed {
  private player: any;
  private enemyDetails: any;
  private battleEmbed: any;
  private battleLogs: any;
  private currentTurn: any;
  private boss: any;
  private mobInfo: any;
  private familiarInfo: any;
  private playerName: string;

  constructor(that: any) {
    this.player = that.player;
    this.enemyDetails = that.enemyDetails;
    this.battleEmbed = that.battleEmbed;
    this.battleLogs = that.battleLogs;
    this.currentTurn = that.currentTurn;
    this.boss = that.boss;
    this.mobInfo = that.mobInfo;
    this.familiarInfo = that.familiarInfo;
    this.playerName = that.playerName;
  }

  async sendInitialEmbed(): Promise<any | undefined> {
    try {
      const iconMap: Record<string, string> = {
        increase_attack_and_speed: "🗡️💨",
        increase_attack: "🗡️",
        increase_defense: "🛡️",
        increase_speed: "💨",
        decrease_attack: "💔",
        decrease_defense: "🌬️",
        decrease_speed: "🍃",
      };

      console.log(this.player.name, "-inside", this.player.attackBarEmoji);

      this.battleEmbed = new EmbedBuilder()
        .setTitle(`Battle VS ${this.enemyDetails.name}`)
        .setFooter({ text: "You can run if you want lol no issues" })
        .setColor(0x0099ff);

      if (this.battleLogs.length > 6 && this.battleLogs.length <= 7) {
        this.battleLogs.shift();
      } else if (this.battleLogs.length > 7 && this.battleLogs.length <= 8) {
        this.battleLogs.shift();
        this.battleLogs.shift();
      } else if (this.battleLogs.length > 8) {
        this.battleLogs.shift();
        this.battleLogs.shift();
        this.battleLogs.shift();
      }

      console.log("battleLogsLengthAfter:", this.battleLogs.length);

      if (this.battleLogs.length > 0) {
        this.battleEmbed.setDescription(
          `**Battle Logs:**\n\`\`\`diff\n+ ${this.battleLogs.join("\n")}\`\`\``
        );
      } else {
        this.battleEmbed.addFields({
          name: "Battle Logs",
          value: "No battle logs yet.",
          inline: false,
        });
      }

      this.battleEmbed.addFields({
        name: "Current Turn",
        value: `\`\`\`${this.currentTurn.name}\`\`\``,
        inline: false,
      });

      if (this.enemyDetails.type === "boss") {
        this.battleEmbed.addFields({
          name: "Enemies Info:",
          value: `\`\`\`ansi\n[2;31m> ${this.boss.name}\n[2;32m ${this.boss.hpBarEmoji} ${
            this.boss.stats.hp
          } HP\n[2;36m [2;34m${this.boss.attackBarEmoji} ${Math.floor(
            this.boss.atkBar
          )} AB\`\`\``,
          inline: false,
        });
      } else if (this.enemyDetails.type === "mob") {
        let mobInfo = ""; // Initialize an empty string to store the info
        for (const mob of this.mobInfo) {
          let buffIcons = "";
          let debuffIcons = "";
          for (const buff of mob.statuses.buffs) {
            if (iconMap[buff.type]) {
              buffIcons += iconMap[buff.type];
            }
          }
          for (const buff of mob.statuses.debuffs) {
            if (iconMap[buff.type]) {
              debuffIcons += iconMap[buff.type];
            }
          }
          mobInfo += `[2;37m ${mob.name}: ⚔️ ${mob.stats.attack} 🛡️ ${
            mob.stats.defense
          } 💨 ${mob.stats.speed} 🔮 ${mob.stats.magic}\n[2;32m ${mob.hpBarEmoji} ${
            mob.stats.hp
          } ♥️ \n[2;36m [2;34m${mob.attackBarEmoji} ${Math.floor(
            mob.atkBar
          )} [2;34mstts [${buffIcons}${debuffIcons}]\n\n`;
        }

        this.battleEmbed.addFields({
          name: "Enemies Info:",
          value: `\`\`\`ansi\n${mobInfo}\`\`\``,
          inline: true,
        });
      }

      if (this.player) {
        let playerAndFamiliarsInfo = ""; // Initialize an empty string to store the info

        for (const familiar of this.familiarInfo) {
          let buffIcons = "";
          let debuffIcons = "";
          for (const buff of familiar.statuses.buffs) {
            if (iconMap[buff.type]) {
              buffIcons += iconMap[buff.type];
            }
          }
          for (const buff of familiar.statuses.debuffs) {
            if (iconMap[buff.type]) {
              debuffIcons += iconMap[buff.type];
            }
          }
          playerAndFamiliarsInfo += `[2;37m ${familiar.name}: ⚔️${
            familiar.stats.attack
          } 🛡️${familiar.stats.defense} 💨${familiar.stats.speed}\n[2;32m ${
            familiar.hpBarEmoji
          } ${familiar.stats.hp} ♥️ \n[2;36m [2;34m${familiar.attackBarEmoji} ${Math.floor(
            familiar.atkBar
          )} [2;34mb&d [${buffIcons}${debuffIcons}]\n\n`;
        }

        let buffIcons = "";
        let debuffIcons = "";
        for (const buff of this.player.statuses.buffs) {
          if (iconMap[buff.type]) {
            buffIcons += iconMap[buff.type];
          }
        }
        for (const buff of this.player.statuses.debuffs) {
          if (iconMap[buff.type]) {
            debuffIcons += iconMap[buff.type];
          }
        }
        playerAndFamiliarsInfo += `[2;37m ${this.playerName}: ⚔️${
          this.player.stats.attack
        } 🛡️${this.player.stats.defense} 💨${this.player.stats.speed} 🔮${
          this.player.stats.magic
        }\n[2;32m ${this.player.hpBarEmoji} ${this.player.stats.hp} ♥️ \n[2;36m [2;34m${
          this.player.attackBarEmoji
        } ${Math.floor(this.player.atkBar)} [2;34mb&d [${buffIcons}${debuffIcons}]`;

        this.battleEmbed.addFields({
          name: "Your Team Info:",
          value: `\`\`\`ansi\n${playerAndFamiliarsInfo}\`\`\``,
          inline: true,
        });
      }

      return this.battleEmbed;
    } catch (error) {
      console.error("Error on hit:", error);
    }
  }
}
