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

/*
            if (selectedClassValue.startsWith("player_ability_")) {
            try {
              const abilityName = selectedClassValue.replace(
                "player_ability_",
                ""
              );
              const abilityNameCamel = await toCamelCase(abilityName);

              // Check if the abilityName exists as a method in the Ability class
              if (typeof this.ability[abilityNameCamel] === "function") {
                const method = this.ability[abilityNameCamel];

                if (method) {
                  const functionAsString = method.toString();
                  // console.log("functionAsString:", functionAsString);
                  const parameterNames = functionAsString
                    .replace(/[/][/].*$/gm, "") // remove inline comments
                    .replace(/\s+/g, "") // remove white spaces
                    .replace(/[/][*][^/*]*[*][/]/g, "") // remove multiline comments
                    .split("){", 1)[0]
                    .replace(/^[^(]*[(]/, "") // extract the parameters
                    .split(",")
                    .filter(Boolean); // split the parameters into an array

                  console.log(
                    `Method ${abilityNameCamel} has the following parameters: ${parameterNames.join(
                      ", "
                    )}`
                  );
                } else {
                  console.log(`Method ${abilityNameCamel} does not exist.`);
                }
                //bye byuee
                this.ability[abilityNameCamel](
                  this.player,
                  this.enemyToHit,
                  this.aliveEnemies
                );
                await cycleCooldowns(this.cooldowns);
                await this.getNextTurn();
                await this.performEnemyTurn();

                this.printBattleResult();
                const updatedEmbed =
                  await this.initialisedEmbed.sendInitialEmbed(
                    this.currentTurn
                  );
              } else {
                console.log(`Ability ${abilityName} not found.`);
              }
            } catch (error) {
              console.error("Error on hit:", error);
              (message.channel as TextChannel).send(
                'You perhaps have not selected a class yet. Please select it using "a!classselect", and select race using "a!raceselect".'
              );
            }
          } else if (selectedClassValue.startsWith("fam-")) {
            try {
              const abilityName = selectedClassValue.replace("fam-", "");
              console.log("abilityName:a", abilityName);
              const abilityNameCamel = await toCamelCase(abilityName);
              console.log("abilityName:a", abilityNameCamel);
              if (typeof this.ability[abilityNameCamel] === "function") {
                // Execute the ability by calling it using square brackets
                for (const familiar of this.familiarInfo) {
                  if (familiar.name === this.currentTurn.name) {
                    this.ability[abilityNameCamel](familiar, this.enemyToHit);
                    await cycleCooldowns(this.cooldowns);
                    await this.getNextTurn();
                    await this.performEnemyTurn();

                    this.printBattleResult();
                    break;
                  }
                }
              } else {
                console.log(`Ability ${abilityName} not found.`);
              }
            } catch (error) {
              console.log("ErrorFamiliar:", error);
            }
          }
            */

/*  async shieldBash(
    user: ExtendedPlayer,
    target: ExtendedPlayer
  ): Promise<void> {
    const damage = await that2.critOrNotHandler(
      user.stats.critRate,
      user.stats.critDamage,
      user.stats.attack,
      target.stats.defense,
      target,
      150,
      "Shield Bash"
    );

    const debuffDetails: DebuffDetails = {
      name: "Shield Bash",
      debuffType: "decrease_speed",
      unique: true,
      value_amount: { speed: 20 },
      targets: target,
      turnLimit: 2,
      flat: true,
    };

    this.buffDebuffManager.applyDebuff(user, target, debuffDetails);
    await this.buffDebuffLogic.decreaseWhat(target, debuffDetails);

    this.cooldowns.push({
      name: "Shield Bash",
      cooldown: this.cooldownFinder("Shield Bash"),
    });
  }

  async defend(user: ExtendedPlayer): Promise<void> {
    const buffDetails: BuffDetails = {
      name: "Defend",
      buffType: "increase_defense",
      unique: true,
      value_amount: { defense: 110 },
      targets: user,
      turnLimit: 2,
      flat: true,
    };

    this.buffDebuffManager.applyBuff(user, user, buffDetails);
    await this.buffDebuffLogic.increaseWhat(user, buffDetails);

    this.cooldowns.push({
      name: "Defend",
      cooldown: this.cooldownFinder("Defend"),
    });
  }

  async bloodlust(user: ExtendedPlayer, target: ExtendedPlayer): Promise<void> {
    const buffDetails: BuffDetails = {
      name: "Bloodlust",
      buffType: "increase_attack_and_increase_speed",
      unique: true,
      value_amount: { attack: 110, speed: 20 },
      targets: target,
      turnLimit: 1,
      flat: true,
    };

    this.buffDebuffManager.applyBuff(user, target, buffDetails);
    await this.buffDebuffLogic.increaseWhat(user, buffDetails);

    this.cooldowns.push({
      name: "Bloodlust",
      cooldown: this.cooldownFinder("Bloodlust"),
    });
  }
    */
/*

 // async getDuelActionRow(): Promise<any[]> {
  //   if (this.playerFamiliar.includes(this.currentTurn)) {
  //     let familiarArray: string[] = [];
  //     familiarArray.push(this.currentTurn.name);
  //     const moveFinder = familiarArray.map((cardName) =>
  //       getAbilities(cardName)
  //     );
  //     console.log("wellNOTHERE");
  //     try {
  //       this.abilityOptions = moveFinder[0]
  //         .map((ability: any) => {
  //           if (
  //             ability &&
  //             ability.selection != undefined &&
  //             !this.cooldowns.some((cooldown) => cooldown.name === ability.name)
  //           ) {
  //             return {
  //               label: ability.name,
  //               description: ability.description,
  //               value: `selection-${ability.name}`,
  //             };
  //           } else if (
  //             ability &&
  //             ability.description &&
  //             !this.cooldowns.some((cooldown) => cooldown.name === ability.name)
  //           ) {
  //             return {
  //               label: ability.name,
  //               description: ability.description,
  //               value: `ability-${ability.name}`,
  //             };
  //           }
  //         })
  //         .filter(Boolean); // Remove undefined items
  //       const cooldownDescriptions =
  //         this.cooldowns.length > 0
  //           ? "Click here to see your cooldowns"
  //           : "There are no cooldowns currently.";
  //       this.abilityOptions.push({
  //         label: "Cooldowns",
  //         description: cooldownDescriptions,
  //         value: "cooldowns",
  //       });
  //       // If there are no abilities available, add a failsafe option

  //       if (this.abilityOptions.length === 1) {
  //         this.abilityOptions.push({
  //           label: "Cooldown",
  //           description: "Your abilities are on cooldown",
  //           value: "cooldown",
  //         });
  //       }
  //       familiarArray = [];
  //       // console.log('abilityOptions:', this.abilityOptions)
  //     } catch (error) {
  //       console.log("moveOptionsError:", error);
  //     }
  //   } else if (this.currentTurn.name === this.player.name) {
  //     const playerAbility = classes[this.player.class].abilities;

  //     try {
  //       const moveFinder = playerAbility.map((cardName) =>
  //         getPlayerMoves(cardName)
  //       );
  //       // console.log('moveFinder:', moveFinder)
  //       this.abilityOptions = moveFinder
  //         .map((ability) => {
  //           if (
  //             ability &&
  //             ability.selection != undefined &&
  //             !this.cooldowns.some((cooldown) => cooldown.name === ability.name)
  //           ) {
  //             return {
  //               label: ability.name,
  //               description: ability.description,
  //               value: `selection-${ability.name}`,
  //             };
  //           } else if (
  //             ability &&
  //             ability.description &&
  //             !this.cooldowns.some((cooldown) => cooldown.name === ability.name)
  //           ) {
  //             return {
  //               label: ability.name,
  //               description: ability.description,
  //               value: `ability-${ability.name}`,
  //             };
  //           }
  //         })
  //         .filter(Boolean); // Remove undefined items
  //       // Sort cooldowns by lowest cooldown first and add cooldowns option

  //       const cooldownDescriptions =
  //         this.cooldowns.length > 0
  //           ? "Click here to see your cooldowns"
  //           : "There are no cooldowns currently.";
  //       this.abilityOptions.push({
  //         label: "Cooldowns",
  //         description: cooldownDescriptions,
  //         value: "cooldowns",
  //       });
  //       // If there are no abilities available, add a failsafe option);

  //       if (this.abilityOptions.length === 1) {
  //         this.abilityOptions.push({
  //           label: "Cooldown",
  //           description: "Your abilities are on cooldown",
  //           value: "cooldown",
  //         });
  //       }
  //       // console.log('abilityOptions:', this.abilityOptions)
  //     } catch (error) {
  //       console.log("moveOptionsError:", error);
  //     }
  //   }
  //   for (const enemy of this.allEnemies) {
  //     if (enemy.name === this.currentTurn.name) {
  //       this.enemyFirst = true;
  //       this.abilityOptions = [
  //         {
  //           label: "namename",
  //           description: "whatever",
  //           value: "uh oh",
  //         },
  //       ];
  //       this.performEnemyTurn();
  //     }
  //   }
  //   this.pickEnemyOptions = this.aliveEnemies.map((enemy, index) => ({
  //     label: enemy.name,
  //     description: `Attack ${enemy.name}`,
  //     value: `enemy_${index}`,
  //   }));
  //   let rows: any;
  //   try {
  //     this.selectMenu = new StringSelectMenuBuilder()
  //       .setCustomId("action_select")
  //       .setPlaceholder("Select the target")
  //       .addOptions(this.pickEnemyOptions);
  //     //   console.log('This.selectEmnu:', this.selectMenu)

  //     const stringMenu = new StringSelectMenuBuilder()
  //       .setCustomId("starter")
  //       .setPlaceholder("Pick Ability!")
  //       .addOptions(this.abilityOptions);

  //     const stringMenuRow = new ActionRowBuilder().addComponents(stringMenu);
  //     // console.log('stringMENUROW:', stringMenuRow)
  //     const gaeRow = new ActionRowBuilder().addComponents(
  //       await this.selectMenu
  //     );

  //     rows = [buttonRow, stringMenuRow, gaeRow];
  //   } catch (error) {
  //     console.log("error:", error);
  //   }
  //   return rows;
  // }
  */

/*  collector.on("collect", async (i: any) => {
      console.log("customid:", i.customId);
      if (i.customId === "action_normal") {
        await i.deferUpdate();
        try {
          if (this.pickedChoice || this.aliveEnemies.length === 1) {
            this.pickedChoice = true; // MongoDB can be used to allow toggling this
            if (this.aliveEnemies.length === 1) {
              console.log("aliveEnemies:", this.aliveEnemies);
              this.enemyToHit = this.aliveEnemies[0];
            }
            this.performTurn();
            await cycleCooldowns(this.cooldowns);
            await this.getNextTurn();
            // await this.performEnemyTurn();
            console.log("currentTurn:", this.currentTurn.name);
            // this.printBattleResult();
          } else {
            i.followUp({
              content: "Please pick an enemy to hit using the Select Menu",
              ephemeral: true,
            });
          }
        } catch (error) {
          console.error("Error on hit:", error);
        }
      } else if (i.customId === "action_select") {
        await i.deferUpdate();
        const targetIndex = i.values[0];
        const realTarget = targetIndex.replace("enemy_", "");
        this.enemyToHit = this.aliveEnemies[parseInt(realTarget, 10)];
        this.pickedChoice = true;
        // Continue with your code logic after selecting an enemy
      } 
        else if (i.customId === "starter") {
        const selectedClassValue = i.values[0];
        console.log(" selectedClassValue:", selectedClassValue);
        let maxTargets: any;
        let actualRequiredCount: number;
        if (selectedClassValue.startsWith("selection-")) {
          try {
            const abilityName = selectedClassValue.replace("selection-", "");
            const ability = abilities[abilityName];

            if (!ability || !ability.selection) {
              console.error("Ability not found or has no selection property");
              return;
            }

            const selectionType = ability.selection;

            if (selectionType.startsWith("modal_")) {
              // Extract the number from `modal_x`
              const requiredCount = parseInt(
                selectionType.replace("modal_", ""),
                10
              );

              if (isNaN(requiredCount)) {
                console.error("Invalid modal format:", selectionType);
                return;
              }

              const teamTargets = this.aliveTeam;
              const enemyTargets = this.aliveEnemies;

              // Determine the allowed range
              maxTargets = ability.type.includes("buff")
                ? teamTargets.length
                : enemyTargets.length;
              actualRequiredCount = Math.min(requiredCount, maxTargets);

              // Create a modal for selecting targets
              const modal = new ModalBuilder()
                .setCustomId(`modal_${abilityName}`)
                .setTitle(`Select ${actualRequiredCount} Target(s)`);

              const textInput = new TextInputBuilder()
                .setCustomId("target_input")
                .setLabel(`Enter exactly ${actualRequiredCount} target(s)`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder(
                  `Enter numbers (e.g., 1,2,3). Max: ${actualRequiredCount}`
                );

              const modalRow =
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  textInput
                );

              modal.addComponents(modalRow);

              // Show the modal to the user
              await i.showModal(modal);
            }
            i.client.on(
              "interactionCreate",
              async (modalInteraction: ModalSubmitInteraction) => {
                await modalInteraction.deferUpdate();
                if (!modalInteraction.isModalSubmit()) return;
                if (modalInteraction.customId !== `modal_${abilityName}`)
                  return;

                const input =
                  modalInteraction.fields.getTextInputValue("target_input");

                // Parse input into numbers and validate
                const selectedIndices = input
                  .split(",")
                  .map((index) => parseInt(index.trim(), 10))
                  .filter(
                    (index) =>
                      !isNaN(index) && index >= 1 && index <= maxTargets
                  );

                if (selectedIndices.length !== actualRequiredCount) {
                  await modalInteraction.reply({
                    content: `Invalid input. Please provide exactly ${actualRequiredCount} valid targets.`,
                    ephemeral: true,
                  });
                  return;
                }

                const selectedTargets = ability.type.includes("buff")
                  ? selectedIndices.map(
                      (index: number) => this.aliveTeam[index - 1]
                    )
                  : selectedIndices.map(
                      (index: number) => this.aliveEnemies[index - 1]
                    );

                if (selectedTargets.some((target: any) => !target)) {
                  await modalInteraction.reply({
                    content: `One or more selected targets are invalid. Please try again.`,
                    ephemeral: true,
                  });
                  return;
                }
                console.log("selectedTargets", selectedTargets);

                // Execute the ability with the selected targets
                await this.ability.executeAbility(
                  this.currentTurn,
                  selectedTargets,
                  this.aliveEnemies,
                  this.aliveTeam,
                  abilityName
                );

                await cycleCooldowns(this.cooldowns);
                await this.getNextTurn();

                const updatedEmbed =
                  await this.initialisedEmbed.sendInitialEmbed(
                    this.currentTurn
                  );
              }
            );
          } catch (error) {
            console.error("Error processing selection:", error);
          }
        }
        await i.deferUpdate();
        if (selectedClassValue === "cooldowns") {
          console.log("check cooldowns", this.cooldowns);

          // Filter out cooldowns that are zero and await the cooldown promises
          const filteredCooldowns = await Promise.all(
            this.cooldowns.filter(
              async (cooldown) => (await cooldown.cooldown) > 0
            )
          );

          // Map the filtered cooldowns to descriptions
          const cooldownDescriptions = await Promise.all(
            filteredCooldowns.map(
              async (cooldown) =>
                `**${cooldown.name}**: ${await cooldown.cooldown} turns left`
            )
          );

          i.followUp({
            content: `**Cooldowns**\n${cooldownDescriptions.join("\n")}`,
            ephemeral: true,
          });
        } else if (selectedClassValue.startsWith("ability-")) {
          if (this.pickedChoice || this.aliveEnemies.length === 1) {
            console.log("THIS CANNOT BE TRUE");
            this.pickedChoice = true;

            if (this.aliveEnemies.length === 1) {
              this.enemyToHit = this.aliveEnemies[0];
            }
            try {
              const abilityName = selectedClassValue.replace("ability-", "");
              const abilityNameCamel = await toCamelCase(abilityName);

              //bye byuee
              this.ability.executeAbility(
                this.currentTurn,
                this.enemyToHit,
                this.aliveEnemies,
                this.aliveTeam,
                abilityName
              );
              await cycleCooldowns(this.cooldowns);
              await this.getNextTurn();
              // await this.performEnemyTurn();

              // this.printBattleResult();
              const updatedEmbed = await this.initialisedEmbed.sendInitialEmbed(
                this.currentTurn
              );
            } catch (error) {
              console.error("Error on hit:", error);
              (message.channel as TextChannel).send(
                'You perhaps have not selected a class yet. Please select it using "a!classselect", and select race using "a!raceselect".'
              );
            }
          } else if (!selectedClassValue.startsWith("selection-")) {
            console.log("WALLAHIIII");
            i.followUp({
              content: "Please pick an enemy to hit using the Select Menu",
              ephemeral: true,
            });
          }
        }
      } else if (i.customId === "action_dodge") {
        await i.deferUpdate();
        //it needs to have like 4 possibilities where 1 is the lower probability i.e dodge and increase player's attack bar by 20, 2nd is just dodge, 3rd is not being able to dodge entirely but reduce the damage by 50% and 4th is just take the hit and 5th is take 1.5x damage
        const dodgeOptions = [
          "dodge_and_increase_attack_bar",
          "dodge",
          "reduce_damage",
          "take_hit",
          "take_1.5x_damage",
        ];
        const randomDodge =
          dodgeOptions[Math.floor(Math.random() * dodgeOptions.length)];
        this.dodge.option = randomDodge;

        this.performTurn();
        await cycleCooldowns(this.cooldowns);
        await this.getNextTurn();
        // await this.performEnemyTurn();

        // this.printBattleResult();
      }
    });
    */

//
/* DAWG
    import { Command } from "../../../../@types/command";
import { Adventure } from "./advClass";
import { ExtendedClient } from "../../../..";
import { mongoClient } from "../../../../data/mongo/mongo";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  TextChannel,
} from "discord.js";
import { allFloors } from "../../../data/information/loc";
import {
  Floor,
  interfaceScenario,
} from "../../../../data/mongo/scenarioInterface";
const adventureCommand: Command = {
  name: "adventure",
  description: "Start an adventure!",
  aliases: ["a", "adv"],
  async execute(client: ExtendedClient, message, args): Promise<void> {
    const adventure = new Adventure(client);
    const db = mongoClient.db("Akaimnky");
    const playerCollection: any = db.collection("akaillection");
    const scenarioCollection: any = db.collection("scenarioData");
    const dbFilter = { _id: message.author.id };
    const player = await playerCollection.findOne(dbFilter);

    if (!player) {
      (message.channel as TextChannel).send("You have to register first!");
      return;
    }

    const playerScenario = await scenarioCollection.findOne(dbFilter);
    console.log("playerScenario:", playerScenario);
    const selectedLocation = playerScenario.scenarios.find(
      (scenario: interfaceScenario) => scenario.selected === true
    );
    const isBossFloor = selectedLocation.floors.find(
      (floor: Floor) => floor.boss === true
    );

    if (!isBossFloor) {
      (message.channel as TextChannel).send(
        "You have not reached any boss floor and do not have saved data!"
      );
      return;
    }

    const adventureConfirmEmbed = new EmbedBuilder()
      .setTitle(selectedLocation.name)
      .setDescription("Know what this journey of yours has to offer!")
      .addFields(
        {
          name: "**Quests**",
          value:
            selectedLocation.quests.length > 0
              ? selectedLocation.quests
                  .map((quest: any) => `'${quest}'`)
                  .join(", ")
              : "There are no quests.",
          inline: false,
        },
        {
          name: "**Bosses**",
          value:
            selectedLocation.bosses.length > 0
              ? selectedLocation.bosses
                  .map((boss: any) => `\`${boss}\``)
                  .join(", ")
              : "There are no bosses.",
          inline: false,
        },
        {
          name: "**Mobs**",
          value: `${selectedLocation.mobs.join("\n")}`,
          inline: false,
        },
        {
          name: "**Adventure**",
          value: "Go on the Adventure Lad!",
          inline: false,
        },
        {
          name: "**Difficulty**",
          value: `${selectedLocation.difficulty[0]}`,
          inline: false,
        }
      );
    const optionSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("option_select")
      .setPlaceholder("Select an option")
      .addOptions([
        { label: "Quests", value: "klik_quests" },
        { label: "Bosses", value: "klik_bosses" },
        { label: "Mobs", value: "klik_mobs" },
      ]);
    const stringMenuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        optionSelectMenu
      );
    const confirmationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("start_adventure")
        .setLabel("Start")
        .setStyle(3),
      new ButtonBuilder()
        .setCustomId("cancel_adventure")
        .setLabel("Go Back")
        .setStyle(4)
    );

    const initialMessage = await (message.channel as TextChannel).send({
      embeds: [adventureConfirmEmbed],
      components: [stringMenuRow, confirmationRow],
    });

    adventure.setupCollector(
      message,
      initialMessage,
      player,
      selectedLocation,
      stringMenuRow
    );
  },
};

export default adventureCommand;

  name: string;
  description: string;
  quests: string[];
  bosses: string[];
  mobs: string[];
  difficulty: string;
  layout: Layout;
  requiredLevel: number;
  */
