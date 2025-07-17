// managers/WaveManager.ts
import _ from 'lodash';
import { MobAI } from '../../../ai/mob';

export class WaveManager {
  private currentWave: number = 0;
  private enemyDetails: any;
  private allEnemiesSource: any;
  private battle: any;

  constructor(enemyDetails: any, allEnemiesSource: any, battle: any) {
    this.enemyDetails = enemyDetails;
    this.allEnemiesSource = allEnemiesSource;
    this.battle = battle;
  }
  getNextWave(): { hasNextWave: boolean; enemies: any[] } {
    this.currentWave += 1;
    
    if (this.currentWave > this.enemyDetails.waves.length) {
      return { hasNextWave: false, enemies: [] };
    }

    const waveInfo = this.enemyDetails.waves[this.currentWave - 1].enemies;
    const enemies = this.processWaveEnemies(waveInfo);
    
    // Clean up old enemies from battle
    this.battle.characters = this.battle.characters.filter(
      (char:any) => !this.battle.allEnemies.some((enemy:any) => enemy.name === char.name)
    );

    this.battle.allEnemies = [];
    this.battle.characters.push(...enemies);
    this.battle.allEnemies.push(...enemies);

    // Initialize AI for new wave
    this.battle.mobAIClass = new MobAI(this.battle, enemies[0]);

    // Initialize enemy properties
    this.initializeEnemyProperties(enemies);

    // ✅ NEW: Update mobInfo reference for UI
    this.battle.mobInfo = enemies;

    this.battle.stateManager.updateState({
      aliveEnemies: this.battle.allEnemies.flat(),
      currentWave: this.currentWave,
      // ✅ NEW: Reset UI state for new wave
      pickedChoice: false,
      enemyToHit: null,
    });

    // ✅ NEW: Force UI refresh after wave transition
    this.refreshBattleUI();

    return { hasNextWave: true, enemies };
  }

  // ✅ NEW: Method to refresh UI after wave changes
  private async refreshBattleUI(): Promise<void> {
    if (!this.battle.initialMessage) return;

    try {
      const state = this.battle.stateManager.getState();
      const updatedEmbed = await this.battle.initialisedEmbed.sendInitialEmbed(
        state.currentTurn,
        this.battle.mobInfo // Use updated mobInfo
      );

      await this.battle.initialMessage.edit({
        embeds: [updatedEmbed],
        components: await this.battle.uiManager.createActionRows(),
      });
    } catch (error) {
      console.error("Error refreshing battle UI:", error);
    }
  }

  private processWaveEnemies(waveInfo: any[]): any[] {
    return this.battle.mobs
      .map((mob:any) => {
        const mobData = this.allEnemiesSource.find(
          (enemy:any) => enemy.name === mob.name && waveInfo.includes(mob.name)
        );
        
        if (!mobData) {
          console.log(`No data found for mob: ${mob.name}`);
          return null;
        }

        const elementData = mobData.element.find(
          (el:any) => el.type === mob.element
        );
        
        if (!elementData) {
          console.log(`No element data found for ${mob.name} with type ${mob.element}`);
          return null;
        }

        return {
          name: _.cloneDeep(mobData.name),
          type: _.cloneDeep(mob.element),
          stats: _.cloneDeep(elementData.stats),
          abilities: _.cloneDeep(elementData.abilities),
          attackPattern: _.cloneDeep(elementData.attackPattern),
        };
      })
      .filter((mob:any) => mob !== null);
  }

  private initializeEnemyProperties(enemies: any[]): void {
    for (const enemy of enemies) {
      enemy.maxHp = enemy.stats.hp;
      enemy.atkBar = 0;
      enemy.attackBarEmoji = [];
      enemy.hpBarEmoji = [];
      enemy.statuses = {
        buffs: [],
        debuffs: [],
      };
    }
    
    this.battle.barManager.fillHpBars(enemies);
  }
}
