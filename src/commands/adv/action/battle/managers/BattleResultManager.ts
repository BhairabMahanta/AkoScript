// managers/BattleResultManager.ts - COMPLETE VERSION (NO DIRECT EMBED UPDATES)
import { quests } from "../../../quest/quests";
import { addFloor } from "../../../../player/scenarioUpdate/scenarioFunctions";
import { scenarios } from "../../../../../data/information/scenarios";
import { EmbedBuilder } from "discord.js";

export class BattleResultManager {
  private battle: any;
  private battleEnded: boolean = false; // ADD THIS

  constructor(battle: any) {
    this.battle = battle;
  }

  async handleVictory(): Promise<void> {
    if (this.battleEnded) return; // Prevent duplicate handling
    this.battleEnded = true;
    
    console.log(`\x1b[32m[BattleResultManager]\x1b[0m Handling victory (${this.battle.mode})`);
    
    if (this.battle.mode === 'pve') {
      await this.handlePvEVictory();
    } else {
      await this.handlePvPVictory();
    }
  }

  async handleDefeat(): Promise<void> {
    if (this.battleEnded) return; // Prevent duplicate handling
    this.battleEnded = true;
    
    console.log(`\x1b[31m[BattleResultManager]\x1b[0m Handling defeat (${this.battle.mode})`);
    
    if (this.battle.mode === 'pve') {
      await this.handlePvEDefeat();
    } else {
      await this.handlePvPDefeat();
    }
  }

  async printBattleResult(): Promise<void> {
    const state = this.battle.stateManager.getState();
    
    this.processDeadEnemies();
    this.processDeadAllies();

    if (state.aliveEnemies.length === 0) {
      if (this.battle.mode === 'pve') {
        await this.handlePvEVictory();
      } else {
        await this.handlePvPVictory();
      }
    } else if (this.battle.player.stats.hp <= 0 && this.battle.familiarInfo.every((f:any) => f.stats.hp <= 0)) {
      if (this.battle.mode === 'pve') {
        await this.handlePvEDefeat();
      } else {
        await this.handlePvPDefeat();
      }
    }
    // REMOVED: updateBattleDisplay() - no more direct embed updates
  }

  private async handlePvEVictory(): Promise<void> {
    const waveManager = this.battle.getWaveManager();
    if (!waveManager) {
      await this.handleFinalPvEVictory();
      return;
    }
    
    const waveResult = waveManager.getNextWave();
    
    if (!waveResult.hasNextWave) {
      await this.handleFinalPvEVictory();
    } else {
      await this.continueToNextWave();
    }
  }

  private async handlePvPVictory(): Promise<void> {
    const winner = this.battle.player;
    const loser = this.battle.player2;
    
    console.log(`\x1b[32m[BattleResultManager]\x1b[0m PvP Victory: ${winner.name} defeats ${loser.name}`);
    
    // Create victory embed (but don't send it - let TurnManager handle final update)
    this.battle.battleEmbed = new EmbedBuilder()
      .setTitle(`PvP Victory!`)
      .setColor(0x00ff00)
      .setFields({
        name: `${winner.name} Wins!`,
        value: `${winner.name} has defeated ${loser.name} in PvP combat!`,
        inline: true,
      })
      .setDescription("🎉 Victory achieved in PvP battle!");
    
    // Set battle as ended - TurnManager will handle final embed update
    this.battle.stateManager.updateState({ continue: false });
  }

  private async handlePvEDefeat(): Promise<void> {
    console.log(`\x1b[31m[BattleResultManager]\x1b[0m PvE Defeat`);
    this.battle.message.channel.send("You lost, skill issue.");
    this.battle.player.stats.speed = 0;
    
    // Set battle as ended
    this.battle.stateManager.updateState({ continue: false });
  }

  private async handlePvPDefeat(): Promise<void> {
    const winner = this.battle.player2;
    const loser = this.battle.player;
    
    console.log(`\x1b[31m[BattleResultManager]\x1b[0m PvP Defeat: ${winner.name} defeats ${loser.name}`);
    
    // Create defeat embed (but don't send it - let TurnManager handle final update)
    this.battle.battleEmbed = new EmbedBuilder()
      .setTitle(`PvP Defeat`)
      .setColor(0xff0000)
      .setFields({
        name: `${winner.name} Wins!`,
        value: `${loser.name} has been defeated by ${winner.name} in PvP combat!`,
        inline: true,
      })
      .setDescription("💀 Defeat in PvP battle!");
    
    // Set battle as ended
    this.battle.stateManager.updateState({ continue: false });
  }

  private async handleFinalPvEVictory(): Promise<void> {
    const rewards = this.battle.enemyDetails.rewards;
    
    await this.updatePlayerQuests();
    await this.updatePlayerRewards(rewards);
    
    if (this.battle.selectedScenario) {
      await this.updatePlayerProgress();
    }
    
    console.log(`\x1b[32m[BattleResultManager]\x1b[0m Final PvE Victory against ${this.battle.enemyDetails.name}`);
    
    // Create victory embed (but don't send it - let TurnManager handle final update)
    this.battle.battleEmbed = new EmbedBuilder()
      .setTitle(`Victory against ${this.battle.enemyDetails.name}`)
      .setColor(0x00ff00)
      .setFields({
        name: "You won the battle!",
        value: `Rewards:\nExp: ${rewards.experience || 0}\nGold: ${rewards.gold || 0}`,
        inline: true,
      })
      .setDescription("GGs You've won");
    
    // Set battle as ended
    this.battle.stateManager.updateState({ continue: false });
  }

  private async updatePlayerQuests(): Promise<void> {
    if (this.battle.mode !== 'pve') return;
    
    if (!this.battle.player.activeQuests) return;

    this.battle.mobs.forEach((mobName:any) => {
      for (const questName in this.battle.player.activeQuests) {
        const objectives = this.battle.player.activeQuests[questName].objectives;
        
        for (const objective of objectives) {
          if (objective.target === mobName) {
            objective.current = objective.current + 1;
          }
        }
      }
    });
  }

  private async updatePlayerRewards(rewards: any): Promise<void> {
    if (this.battle.mode !== 'pve') return;
    
    try {
      const filter = { _id: this.battle.player._id };
      const experience = typeof rewards.experience === 'number' ? rewards.experience : 0;
      const gold = typeof rewards.gold === 'number' ? rewards.gold : 0;
      
      const updates: any = {
        $set: { activeQuests: this.battle.player.activeQuests },
      };
      
      if (experience > 0 || gold > 0) {
        updates.$inc = {};
        if (experience > 0) {
          updates.$inc["exp.xp"] = experience;
        }
        if (gold > 0) {
          updates.$inc["balance.coins"] = gold;
        }
      }
      
      await this.battle.collection.updateOne(filter, updates);
    } catch (error) {
      console.error("Error updating player rewards:", error);
      this.battle.addBattleLog("Warning: Failed to update player rewards, but battle completed successfully.");
    }
  }

  private async updatePlayerProgress(): Promise<void> {
    const selectedScenario = scenarios.find(
      (scenario) => scenario.id === this.battle.selectedScenario.id
    );
    
    if (selectedScenario) {
      const nextFloor = selectedScenario.floors[this.battle.enemyDetails.floorNum];
      await addFloor(this.battle.player._id, this.battle.selectedScenario.name, {
        floorNumber: nextFloor.floorNumber,
        miniboss: nextFloor.miniboss,
        boss: nextFloor.boss,
        rewarded: false,
        cleared: false,
      });
    }
  }

  private processDeadEnemies(): void {
    const state = this.battle.stateManager.getState();
    
    for (const enemy of state.aliveEnemies) {
      if (enemy.stats.hp < 0) {
        this.battle.stateManager.addBattleLog(`${enemy.name} died poggers`);
        enemy.stats.speed = 0;
        enemy.atkBar = 0;
        enemy.stats.hp = 0;
        
        const updatedDeadEnemies = [...state.deadEnemies, enemy.name];
        const updatedAliveEnemies = state.aliveEnemies.filter((e:any) => e !== enemy);
        
        this.battle.stateManager.updateState({
          deadEnemies: updatedDeadEnemies,
          aliveEnemies: updatedAliveEnemies
        });
        break;
      }
    }
  }

  private processDeadAllies(): void {
    const state = this.battle.stateManager.getState();
    
    for (const ally of state.aliveTeam) {
      if (ally.stats.hp < 0 && !state.deadFam.includes(ally.name)) {
        this.battle.stateManager.addBattleLog(`${ally.name} died lol`);
        ally.stats.speed = 0;
        ally.atkBar = 0;
        ally.stats.hp = 0;
        
        const updatedDeadFam = [...state.deadFam, ally.name];
        const updatedAliveTeam = state.aliveTeam.filter((member:any) => member !== ally);
        
        this.battle.stateManager.updateState({
          deadFam: updatedDeadFam,
          aliveTeam: updatedAliveTeam
        });
        break;
      }
    }
  }

  private async continueToNextWave(): Promise<void> {
    console.log(`\x1b[36m[BattleResultManager]\x1b[0m Continuing to next wave`);
    
    // REMOVED: Direct embed update - let TurnManager handle it
    // Just wait and let normal turn flow continue
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  // REMOVED: updateBattleDisplay() - no more direct embed updates
}
