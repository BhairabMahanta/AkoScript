// ui/BattleEmbed.ts
import { EmbedBuilder } from "discord.js";
export const iconMap: Record<string, string> = {
  Fire: "🔥",
  Water: "💧",
  Wind: "🍃",
  Terra: "🌍",
  Light: "☀️",
  Dark: "🌑",
  Ice: "❄️",
  Electric: "⚡",
  Nature: "🌿",
  Métallon: "🔮",
  increase_attack_and_speed: "🗡️💨",
  increase_attack: "🗡️",
  increase_defense: "🛡️",
  increase_speed: "💨",
  decrease_attack: "💔",
  decrease_defense: "🌬️",
  decrease_speed: "🍃",
};
export class BattleEmbed {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

async sendInitialEmbed(
  currentTurn: any,
  enemyInfo: any
): Promise<any | undefined> {
  try {
    const state = this.battle.stateManager.getState();
    const battleLogs = state.battleLogs || [];
    
    const battleEmbed = new EmbedBuilder()
      .setTitle(this.getBattleTitle())
      .setFooter({ text: "Good luck in battle!" })
      .setColor(this.battle.mode === 'pve' ? 0xff9900 :0x0099ff );

    // Handle battle logs
    const managedLogs = this.manageBattleLogs(battleLogs);
    
    if (managedLogs.length > 0) {
      const logsText = managedLogs.join("\n");
      battleEmbed.setDescription(
        `**Battle Logs:**\n\`\`\`diff\n${logsText}\`\`\``
      );
    } else {
      battleEmbed.addFields({
        name: "Battle Logs",
        value: "No battle logs yet.",
        inline: false,
      });
    }

    // ENHANCED: Current turn field with player ownership info
    const currentTurnInfo = this.getCurrentTurnInfo(currentTurn);
    
    battleEmbed.addFields({
      name: "Current Turn",
      value: `\`\`\`${currentTurnInfo}\`\`\``,
      inline: false,
    });

    // Display teams based on mode
    if (this.battle.mode === 'pve') {
        this.addPvEInfo(battleEmbed, enemyInfo, currentTurn);
    } else {
      this.addPvPInfo(battleEmbed, currentTurn);
    }

    return battleEmbed;
  } catch (error) {
    console.error("Error creating battle embed:", error);
    return new EmbedBuilder()
      .setTitle("Battle Error")
      .setDescription("An error occurred while creating the battle display.")
      .setColor(0xff0000);
  }
}
private getCurrentTurnInfo(currentTurn: any): string {
  if (!currentTurn) {
    return "None";
  }
  
  const currentTurnName = currentTurn.name || "Unknown";
  const turnStatus = currentTurn.stats?.hp <= 0 ? " (DEAD)" : "";
  
  // For PvE mode, just show the character name
  if (this.battle.mode === 'pve') {
    return `${currentTurnName}${turnStatus}`;
  }
  
  // For PvP mode, show character name with player ownership
  const ownerInfo = this.determineCharacterOwner(currentTurn);
  const turnIndicator = this.getTurnIndicatorEmoji(currentTurn);
  
  return `${turnIndicator} ${currentTurnName}${ownerInfo}${turnStatus}`;
}

private determineCharacterOwner(character: any): string {
  if (!character) return "";
  
  const player1Id = this.battle.player.id || this.battle.player._id;
  const player2Id = this.battle.player2.id || this.battle.player2._id;
  
  // Check if it's Player 1 themselves
  if (character.id === player1Id || character._id === player1Id) {
    return ` - ${this.battle.player.name}`;
  }
  
  // Check if it's Player 2 themselves
  if (character.id === player2Id || character._id === player2Id) {
    return ` - ${this.battle.player2.name}`;
  }
  
  // Check if it's Player 1's familiar
  const isPlayer1Familiar = this.battle.familiarInfo.some((f: any) => 
    f.serialId === character.serialId && f.name === character.name
  );
  
  if (isPlayer1Familiar) {
    return ` - ${this.battle.player.name}`;
  }
  
  // Check if it's Player 2's familiar
  const isPlayer2Familiar = this.battle.player2FamiliarInfo.some((f: any) => 
    f.serialId === character.serialId && f.name === character.name
  );
  
  if (isPlayer2Familiar) {
    return ` - ${this.battle.player2.name}`;
  }
  
  return " - Unknown Player";
}

private getTurnIndicatorEmoji(character: any): string {
  if (!character) return "❓";
  
  const player1Id = this.battle.player.id || this.battle.player._id;
  const player2Id = this.battle.player2.id || this.battle.player2._id;
  
  // Check if it's Player 1 or their familiar
  if (character.id === player1Id || character._id === player1Id) {
    return "👑"; // Crown for Player 1
  }
  
  if (character.id === player2Id || character._id === player2Id) {
    return "⚔️"; // Sword for Player 2
  }
  
  // Check familiars
  const isPlayer1Familiar = this.battle.familiarInfo.some((f: any) => 
    f.serialId === character.serialId && f.name === character.name
  );
  
  if (isPlayer1Familiar) {
    return "🔮"; // Crystal for Player 1's familiar
  }
  
  const isPlayer2Familiar = this.battle.player2FamiliarInfo.some((f: any) => 
    f.serialId === character.serialId && f.name === character.name
  );
  
  if (isPlayer2Familiar) {
    return "🌟"; // Star for Player 2's familiar
  }
  
  return "❓"; // Question mark for unknown
}


  private getBattleTitle(): string {
    if (this.battle.mode === 'pve') {
           return `Battle VS ${this.battle.enemyDetails.name}`;
    } else {
       return `PvP Battle: ${this.battle.player.name} VS ${this.battle.player2.name}`;
 
     
    }
  }

  private addPvEInfo(battleEmbed: EmbedBuilder, mobInfo: any[], currentTurn: any): void {
    // Existing PvE enemy display logic
    if (this.battle.enemyDetails.type === "boss") {
      this.addBossInfo(battleEmbed);
    } else if (this.battle.enemyDetails.type === "mob") {
      this.addMobInfo(battleEmbed, mobInfo, currentTurn);
    }

    // Player team info
    this.addPlayerTeamInfo(battleEmbed, this.battle.player, this.battle.familiarInfo, currentTurn, "Your Team Info:");
  }

  private addPvPInfo(battleEmbed: EmbedBuilder, currentTurn: any): void {
    // Player 1 team info
    this.addPlayerTeamInfo(
      battleEmbed, 
      this.battle.player, 
      this.battle.familiarInfo, 
      currentTurn, 
      `${this.battle.player.name}'s Team:`
    );

    // Player 2 team info (displayed as "enemies")
    this.addPlayerTeamInfo(
      battleEmbed, 
      this.battle.player2, 
      this.battle.player2FamiliarInfo, 
      currentTurn, 
      `${this.battle.player2.name}'s Team:`
    );
  }

  private addPlayerTeamInfo(
    battleEmbed: EmbedBuilder, 
    player: any, 
    familiars: any[], 
    currentTurn: any, 
    title: string
  ): void {
    let teamInfo = "";
    
    // Add familiar info
    for (const familiar of familiars) {
      if (!familiar) continue;
      
      const buffIcons = this.getStatusIcons(familiar.statuses?.buffs || []);
      const debuffIcons = this.getStatusIcons(familiar.statuses?.debuffs || []);
      
      const stats = familiar.stats || {};
      const hpBarEmoji = familiar.hpBarEmoji || "▓▓▓▓▓▓▓▓▓▓";
      const attackBarEmoji = familiar.attackBarEmoji || "░░░░░░░░░░";
      
      const turnIndicator = currentTurn?.name === familiar.name ? "☝️" : 
                           (stats.hp <= 0 ? "💀" : "🙋");
      
      teamInfo += `[2;37m ${familiar.name}: ⚔️${stats.attack || 0} 🛡️${stats.defense || 0} 🚀${stats.speed || 0}\n[2;32m ${hpBarEmoji} ${stats.hp || 0} ♥️ \n[2;36m [2;34m${attackBarEmoji} ${Math.floor(familiar.atkBar || 0)} [2;34m [${buffIcons}${debuffIcons}] ${turnIndicator}\n\n`;
    }

    // Add player info
    const playerBuffIcons = this.getStatusIcons(player.statuses?.buffs || []);
    const playerDebuffIcons = this.getStatusIcons(player.statuses?.debuffs || []);
    
    const playerStats = player.stats || {};
    const playerHpBarEmoji = player.hpBarEmoji || "▓▓▓▓▓▓▓▓▓▓";
    const playerAttackBarEmoji = player.attackBarEmoji || "░░░░░░░░░░";
    
    const playerTurnIndicator = currentTurn?.name === player.name ? "☝️" : 
                               (playerStats.hp <= 0 ? "💀" : "🙋");
    
    teamInfo += `[2;37m ${player.name}: ⚔️${playerStats.attack || 0} 🛡️${playerStats.defense || 0} 🚀${playerStats.speed || 0} 🔮${playerStats.magic || 0}\n[2;32m ${playerHpBarEmoji} ${playerStats.hp || 0} ♥️ \n[2;36m [2;34m${playerAttackBarEmoji} ${Math.floor(player.atkBar || 0)} [2;34m [${playerBuffIcons}${playerDebuffIcons}] ${playerTurnIndicator}`;

    if (teamInfo) {
      battleEmbed.addFields({
        name: title,
        value: `\`\`\`ansi\n${teamInfo}\`\`\``,
        inline: true,
      });
    }
  }

  // Keep existing helper methods...
  private manageBattleLogs(battleLogs: string[]): string[] {
    const logs = [...battleLogs];
    
    if (logs.length > 8) {
      logs.splice(0, logs.length - 8);
    } else if (logs.length > 7) {
      logs.shift();
    } else if (logs.length > 6) {
      logs.shift();
    }
    
    return logs;
  }

  private addBossInfo(battleEmbed: EmbedBuilder): void {
    const boss = this.battle.boss;
    if (!boss) return;

    const hpBarEmoji = boss.hpBarEmoji || "▓▓▓▓▓▓▓▓▓▓";
    const attackBarEmoji = boss.attackBarEmoji || "░░░░░░░░░░";
    const hp = boss.stats?.hp || 0;
    const atkBar = boss.atkBar || 0;

    battleEmbed.addFields({
      name: "Enemies Info:",
      value: `\`\`\`ansi\n[2;31m> ${boss.name}\n[2;32m ${hpBarEmoji} ${hp} HP\n[2;36m [2;34m${attackBarEmoji} ${Math.floor(atkBar)} AB\`\`\``,
      inline: false,
    });
  }

  private addMobInfo(battleEmbed: EmbedBuilder, mobInfo2: any[], currentTurn: any): void {
    if (!mobInfo2 || mobInfo2.length === 0) return;

    let mobInfo = "";
    let enemyEmojis = "";
    
    for (const mob of mobInfo2) {
      if (!mob) continue;
      
      enemyEmojis += iconMap[mob.type] || "⚔️";
      
      const buffIcons = this.getStatusIcons(mob.statuses?.buffs || []);
      const debuffIcons = this.getStatusIcons(mob.statuses?.debuffs || []);
      
      const stats = mob.stats || {};
      const hpBarEmoji = mob.hpBarEmoji || "▓▓▓▓▓▓▓▓▓▓";
      const attackBarEmoji = mob.attackBarEmoji || "░░░░░░░░░░";
      
      const turnIndicator = currentTurn?.name === mob.name ? "☝️" : 
                           (stats.hp <= 0 ? "💀" : "🙋");
      
      mobInfo += `[2;37m ${mob.name}: ⚔️ ${stats.attack || 0} 🛡️ ${stats.defense || 0} 🚀 ${stats.speed || 0} 🔮 ${stats.magic || 0}\n[2;32m ${hpBarEmoji} ${stats.hp || 0} ♥️ \n[2;36m [2;34m${attackBarEmoji} ${Math.floor(mob.atkBar || 0)} [2;34m [${buffIcons}${debuffIcons}] ${turnIndicator}\n\n`;
    }

    if (mobInfo) {
      battleEmbed.addFields({
        name: `Enemies Info: ${enemyEmojis}`,
        value: `\`\`\`ansi\n${mobInfo}\`\`\``,
        inline: true,
      });
    }
  }

  private addPlayerInfo(battleEmbed: EmbedBuilder, currentTurn: any): void {
    if (!this.battle.player) return;

    let playerAndFamiliarsInfo = "";
    
    // Add familiar info
    const familiarInfo = this.battle.familiarInfo || [];
    for (const familiar of familiarInfo) {
      if (!familiar) continue;
      
      const buffIcons = this.getStatusIcons(familiar.statuses?.buffs || []);
      const debuffIcons = this.getStatusIcons(familiar.statuses?.debuffs || []);
      
      const stats = familiar.stats || {};
      const hpBarEmoji = familiar.hpBarEmoji || "▓▓▓▓▓▓▓▓▓▓";
      const attackBarEmoji = familiar.attackBarEmoji || "░░░░░░░░░░";
      
      const turnIndicator = currentTurn?.name === familiar.name ? "☝️" : 
                           (stats.hp <= 0 ? "💀" : "🙋");
      
      playerAndFamiliarsInfo += `[2;37m ${familiar.name}: ⚔️${stats.attack || 0} 🛡️${stats.defense || 0} 🚀${stats.speed || 0}\n[2;32m ${hpBarEmoji} ${stats.hp || 0} ♥️ \n[2;36m [2;34m${attackBarEmoji} ${Math.floor(familiar.atkBar || 0)} [2;34m [${buffIcons}${debuffIcons}] ${turnIndicator}\n\n`;
    }

    // Add player info
    const player = this.battle.player;
    const playerBuffIcons = this.getStatusIcons(player.statuses?.buffs || []);
    const playerDebuffIcons = this.getStatusIcons(player.statuses?.debuffs || []);
    
    const playerStats = player.stats || {};
    const playerHpBarEmoji = player.hpBarEmoji || "▓▓▓▓▓▓▓▓▓▓";
    const playerAttackBarEmoji = player.attackBarEmoji || "░░░░░░░░░░";
    
    const playerTurnIndicator = currentTurn?.name === player.name ? "☝️" : 
                               (playerStats.hp <= 0 ? "💀" : "🙋");
    
    playerAndFamiliarsInfo += `[2;37m ${this.battle.playerName || player.name}: ⚔️${playerStats.attack || 0} 🛡️${playerStats.defense || 0} 🚀${playerStats.speed || 0} 🔮${playerStats.magic || 0}\n[2;32m ${playerHpBarEmoji} ${playerStats.hp || 0} ♥️ \n[2;36m [2;34m${playerAttackBarEmoji} ${Math.floor(player.atkBar || 0)} [2;34m [${playerBuffIcons}${playerDebuffIcons}] ${playerTurnIndicator}`;

    if (playerAndFamiliarsInfo) {
      battleEmbed.addFields({
        name: "Your Team Info:",
        value: `\`\`\`ansi\n${playerAndFamiliarsInfo}\`\`\``,
        inline: true,
      });
    }
  }
 private getStatusIcons(statuses: any[]): string {
    let icons = "";
    for (const status of statuses) {
      if (status && status.type && iconMap[status.type]) {
        icons += iconMap[status.type];
      }
    }
    return icons;
  }
}
