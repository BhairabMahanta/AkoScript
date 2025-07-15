import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  AttachmentBuilder,
} from "discord.js";
import { mongoClient } from "../../../../data/mongo/mongo";

const db = mongoClient.db("Akaimnky");
const collection: any = db.collection("akaillection");
import firstArea from "../../../data/maps/tutorialmap/mapstart.json";
import sharp from "sharp";
import fs from "fs";
import allFamiliars from "../../../../data/information/allfamiliars";
import path from "path";
import { DeactivatedElement } from "../../../../data/mongo/elementSchema";

import { ExtendedPlayer } from "../../../gamelogic/buffDebuffManager";

interface Element {
  name: string;
  x: number;
  y: number;
  area: string;
  type: string;

  hasAllies: string[]; // e.g., ["none"]
  waves: number; // The number of waves for the enemy
  rewards: {
    experience: number; // experience points reward
    gold: number; // gold reward
    items: Record<string, number>; // reward items with quantity (e.g., { "Gold": 100 })
  };
}

class GameImage {
  private filter: { _id: string };
  private playerData: ExtendedPlayer;
  private message: any; // Type it properly if possible
  private imgH: number;
  private imgW: number;
  private name: string;
  private elements: any[] = [];
  private monsterArray: any[] = [];
  private npcArray: any[] = [];
  private generatedRandomElements: boolean = false;
  private generatedRandomElements2: boolean = false;
  private image: Buffer | null = null;
  private gaeImage: Buffer | null = null;
  private distanceToNpc: number = 0;
  private distanceToMonster: number = 0;
  private whichMon: any = null;
  public playerpos: { x: number; y: number };
  private isTrue: boolean = false;
  public elementArray: any[] = [];

  constructor(
    imgH: number,
    imgW: number,
    player: ExtendedPlayer,
    message: any
  ) {
    this.filter = { _id: player._id };
    this.playerData = player;
    this.message = message;
    this.imgH = imgH;
    this.imgW = imgW;
    this.name = player.name;
    this.playerpos = player.playerpos;
  }

  getRandomBoolean(probability: number): boolean {
    return Math.random() < probability;
  }

  async generateTutorialEntities(): Promise<void> {
    firstArea.entities.Entity.forEach((entity: any) => {
      this.elements.push({
        name: entity.customFields.name,
        x: entity.x,
        y: entity.y,
        area: "tutorial",
        type: entity.customFields.type,
        element: entity.customFields.element, // Ensure element is included
        waves: entity.customFields.waves, // Keep waves properly structured
        hasAllies: entity.customFields.hasAllies, // Include allies list
        rewards: entity.customFields.rewards, // Include rewards (gold, xp, items)
        floorNum: entity.customFields.floorNum, // Assuming floorNum is static, adjust if dynamic
      });
    });

    console.log("Teleports:");
    // Accessing teleport
    // firstArea.entities.Teleport.forEach((teleport: any) => {
    //   console.log(teleport);
    // });

    console.log("NPCs:");
    // Accessing npc
    // firstArea.entities.Npc.forEach((npc: any) => {
    //   console.log(npc);
    // });
  }

  async generateUpdatedImage(
    areaImage: any,
    playerpos: { x: number; y: number }
  ): Promise<AttachmentBuilder | void> {
    let name: string;
    let inputImagePath: string;

    try {
      this.generatedRandomElements2 = false;

      if (!this.generatedRandomElements2) {
        this.generatedRandomElements2 = true;

        for (const element of this.elements) {
          const elementName = element.name;
          name = `src/commands/data/npcimg/${elementName}.png`;

          if (fs.existsSync(name)) {
            inputImagePath = name;
          } else {
            inputImagePath = element.name.startsWith("monster")
              ? "src/commands/data/npcimg/monster.png"
              : "src/commands/data/npcimg/npc.png";
          }

          if (element === this.elements[0]) {
            this.image = await sharp(areaImage)
              .composite([
                { input: inputImagePath, left: element.x, top: element.y },
              ])
              .png()
              .toBuffer();
          } else {
            this.image = await sharp(this.image ? this.image : "null")
              .composite([
                { input: inputImagePath, left: element.x, top: element.y },
              ])
              .png()
              .toBuffer();
          }
        }
      }

      this.gaeImage = await sharp(this.image ? this.image : "null")
        .composite([
          {
            input: "src/commands/data/npcimg/Old_man.png",
            left: playerpos.x,
            top: playerpos.y,
          },
        ])
        .png()
        .toBuffer();

      console.log("doneupdatedMAP");

      return new AttachmentBuilder(this.gaeImage, { name: "updatedMap.png" });
    } catch (error) {
      console.error("An error occurred:", error);
      this.message.channel.send(
        "An error occurred while generating the updated map."
      );
    }
  }
  async movePlayer(player: ExtendedPlayer): Promise<AttachmentBuilder> {
    // Load the base image

    // Other properties of the player...
    console.log("this.playerpos:", this.playerpos);
    const updatedImageBuffer = await sharp(this.image ? this.image : "null")
      .composite([
        {
          input: "src/commands/adv/npcimg/Old_man.png",
          left: this.playerpos.x,
          top: this.playerpos.y,
        },
      ])
      .png()
      .toBuffer();

    // Update the player position
    player.playerpos = { x: this.playerpos.x, y: this.playerpos.y };

    // Update database with the new position
    await collection.updateOne(this.filter, {
      $set: { playerpos: player.playerpos },
    });

    // Return the updated map as an attachment
    return new AttachmentBuilder(updatedImageBuffer, {
      name: "updatedMap.png",
    });
  }

  async nearElement(
    hasAttackButton: boolean,
    message: any,
    initialMessage: any,
    navigationRow: any,
    attackRow: any,
    talkRow: any,
    bothButton: any,
    hasTalkButton: boolean,
    nowBattling: any,
    interactRow: any,
    updatedImageBuffer?: Buffer
  ): Promise<boolean> {
    let hahaTrueOrFalse = false;
    const attackRadius = 40; // Adjust the radius as needed
    console.log("NearElement");

    let isMobNearby = false;
    let isNpcNearby = false;
    let nearbyElements: Element[] = [];

    // Check distance to all elements
    for (const element of this.elements) {
      this.distanceToMonster = Math.sqrt(
        Math.pow(this.playerpos.x - element.x, 2) +
          Math.pow(this.playerpos.y - element.y, 2)
      );

      console.log("elementname:", element.name);

      if (this.distanceToMonster <= attackRadius) {
        nearbyElements.push(element);
        this.whichMon = element.name;

        // Add to element array if not already included
        if (!this.elementArray.includes(element)) {
          this.elementArray.push(element);
        }

        // Check the type of element (mob or npc)
        if (element.type === "mob") {
          isMobNearby = true;
          console.log("isMobNearby:", isMobNearby);
        } else if (element.type === "npc") {
          isNpcNearby = true;
        }
      }

      // Sort elementArray by distance to player
      if (this.elementArray.length > 1) {
        this.elementArray.sort((a, b) => {
          const distA = Math.sqrt(
            Math.pow(this.playerpos.x - a.x, 2) +
              Math.pow(this.playerpos.y - a.y, 2)
          );
          const distB = Math.sqrt(
            Math.pow(this.playerpos.x - b.x, 2) +
              Math.pow(this.playerpos.y - b.y, 2)
          );
          return distA - distB;
        });
      }

      // Determine which row to display based on nearby elements
      if (nearbyElements.length > 0) {
        if (isMobNearby && isNpcNearby) {
          nowBattling.setFooter({
            text: "You are near both a monster and an NPC. Choose an action.",
          });

          updatedImageBuffer
            ? initialMessage.edit({
                embeds: [nowBattling],
                components: [...bothButton],
                files: [updatedImageBuffer],
              })
            : initialMessage.edit({
                embeds: [nowBattling],
                components: [...bothButton],
              });
          hahaTrueOrFalse = true;
        } else if (isMobNearby) {
          nowBattling.setFooter({
            text: "You are in the monster field radius, click the attack button to attack.",
          });
          updatedImageBuffer
            ? initialMessage.edit({
                embeds: [nowBattling],
                components: [...attackRow],
                files: [updatedImageBuffer],
              })
            : initialMessage.edit({
                embeds: [nowBattling],
                components: [...attackRow],
              });
          hahaTrueOrFalse = true;
          console.log("editing attackRow");
        } else if (isNpcNearby) {
          nowBattling.setFooter({
            text: "You are near an NPC, click the talk button to interact.",
          });
          updatedImageBuffer
            ? initialMessage.edit({
                embeds: [nowBattling],
                components: [...talkRow],
                files: [updatedImageBuffer],
              })
            : initialMessage.edit({
                embeds: [nowBattling],
                components: [...talkRow],
              });
          hahaTrueOrFalse = true;
        }
      }

      // If player moves out of range of an element
      for (const element of this.elementArray) {
        const distanceToElement = Math.sqrt(
          Math.pow(this.playerpos.x - element.x, 2) +
            Math.pow(this.playerpos.y - element.y, 2)
        );

        if (distanceToElement > attackRadius) {
          if (element.type === "mob" && hasAttackButton) {
            nowBattling.setFooter({
              text: "You moved out of attack range.",
            });
            initialMessage.edit({
              embeds: [nowBattling],
              components: [...navigationRow],
            });
            hasAttackButton = false;
          } else if (element.type === "npc" && hasAttackButton) {
            nowBattling.setFooter({
              text: "You moved out of interaction range with the NPC.",
            });
            initialMessage.edit({
              embeds: [nowBattling],
              components: [...navigationRow],
            });
            hasAttackButton = false;
          }
        }
      }
    }

    return hahaTrueOrFalse;
  }


}
export { GameImage };
