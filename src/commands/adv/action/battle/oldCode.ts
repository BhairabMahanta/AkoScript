/*async sendInitialEmbed(): Promise<EmbedBuilder | undefined> {
  try {
    // things this.player, this.enemyDetails, this.battleEmbed, this.battleLogs
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

*/

// battle result print

/*
  async printBattleResult(): Promise<void> {
    let updatedEmbed;
    for (const character of this.allEnemies) {
      if (
        character.stats.hp < 0 &&
        !this.deadEnemies.includes(character.name)
      ) {
        this.battleLogs.push(`${character.name} died poggers`);
        character.stats.speed = 0;
        character.atkBar = 0;
        character.stats.hp = 0;
        this.deadEnemies.push(character.name);
        console.log("adeadenem:", this.deadEnemies);
        console.log("ALIVEFAM:", this.aliveEnemies);
        this.aliveEnemies = this.aliveEnemies.filter(
          (enemy) => enemy !== character
        );
        console.log("ALIVEFAM:", this.aliveEnemies);
        break;
      }
    }

    for (const character of this.familiarInfo) {
      if (character.stats.hp < 0 && !this.aliveFam.includes(character.name)) {
        this.battleLogs.push(`${character.name} died lol`);
        character.stats.speed = 0;
        character.atkBar = 0;
        character.stats.hp = 0;
        this.aliveFam.push(character.name);
        console.log("ALIVEFAM:", this.aliveFam);
        break;
      }
    }

    if (this.aliveEnemies.length === 0) {
      const rewards = this.enemyDetails.rewards;
      if (this.player.activeQuests) {
        for (const activeQuestName in this.player.activeQuests) {
          if (this.player.activeQuests.hasOwnProperty(activeQuestName)) {
            const activeQuestDetails = quests[activeQuestName];
            const activeQuestDetails2 =
              this.player.activeQuests[activeQuestName];
            console.log(`stuffHere: ${activeQuestDetails.title}`);
            console.log(`stuffHere: ${activeQuestDetails2.objectives[0]}`);
          }
        }
      }

      this.mobs.forEach((mobName) => {
        for (const questName in this.player.activeQuests) {
          if (this.player.activeQuests.hasOwnProperty(questName)) {
            const objectives = this.player.activeQuests[questName].objectives;

            // Iterate through all objective elements
            for (const objective of objectives) {
              console.log("objectiveNameTargetnotMatch:", objective.target);
              if (objective.target === mobName) {
                console.log("objectiveNameTarget:", objective.target);
                // Match found, increment objective.current by 1
                objective.current = objective.current + 1;
                console.log("thisisobjective.current:", objective.current);
              }
            }
          }
        }
      });

      try {
        const filter = { _id: this.player._id };
        const playerData2 = await collection.findOne(filter);
        if (playerData2) {
          // Create an object with only the xp property to update
          const updates = {
            $inc: {
              "exp.xp": rewards.experience,
              "balance.coins": rewards.gold,
            },
            $set: { activeQuests: this.player.activeQuests },
          };
          console.log("rewards.xpereince:", rewards.experience);
          // Update the player's document with the xpUpdate object
          await collection.updateOne(filter, updates);

          console.log("Player XP updated:", updates);
        } else {
          console.log("Player not found or updated.");
        }
      } catch (error) {
        console.error("Error updating player XP:", error);
      }
      console.log("thisplayeractiveQuest:", this.player.activeQuests);

      this.battleEmbed.setFields({
        name: "You won the battle against the Monster, you can continue the journey where you left off (I lied you can't)!!",
        value: `Rewards:\n Exp: ${rewards.experience}, Gold: ${rewards.gold}`,
        inline: true,
      });
      this.battleEmbed.setDescription("GGs You've won");
      this.initialMessage.edit({
        embeds: [this.battleEmbed],
        components: [],
      });
    } else if (this.player.stats.hp < 0) {
      this.message.channel.send("You lost, skill issue.");
      this.player.stats.speed = 0;
    } else {
      updatedEmbed = await this.initialisedEmbed.sendInitialEmbed();
      this.initialMessage.edit({
        embeds: [updatedEmbed],
        components: await this.getDuelActionRow(),
      });
    }
  }
 */
