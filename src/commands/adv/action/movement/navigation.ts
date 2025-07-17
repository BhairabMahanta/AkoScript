import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Message,
  Interaction,
  MessageComponentInteraction,
  AttachmentBuilder,
} from "discord.js";
import { GameImage } from "./gameImage";
import Battle from "../battle/battle";
import { mongoClient } from "../../../../data/mongo/mongo";
import { NPC } from "../../quest/npc";
import { ExtendedPlayer } from "../../../gamelogic/buffdebufflogic";
import { interfaceScenario } from "../../../../data/mongo/scenarioInterface";

let updatedImageBuffer: any;
let hasAttackButton = false;
let hasTalkButton = false;
let dontGoThrough = false;

// Create a button-based navigation interface
const navigationRowUp = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("Empty")
    .setLabel("☠️ ded")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true),
  new ButtonBuilder()
    .setCustomId("north")
    .setLabel("↑ North")
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId("Empty2")
    .setLabel("☠️ ded")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true)
);
const navigationRowMid = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("west")
    .setLabel("←←West")
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId("south")
    .setLabel("↓ South")
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId("east")
    .setLabel("→→East")
    .setStyle(ButtonStyle.Success)
);
const navigationRowTalk = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("talk_npc")
    .setLabel("💬 Talk")
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId("north")
    .setLabel("↑ North")
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId("Empty2")
    .setLabel("☠️ ded")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true)
);
const navigationRowAttack = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("Empty")
    .setLabel("☠️ ded")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true),
  new ButtonBuilder()
    .setCustomId("north")
    .setLabel("↑ North")
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId("attack_monster")
    .setLabel("⚔️ Attack")
    .setStyle(ButtonStyle.Primary)
);
const navigationRowInteract =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("Empty")
      .setLabel("☠️ ded")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("north")
      .setLabel("↑ North")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("interact_collect")
      .setLabel("Grab!")
      .setStyle(ButtonStyle.Primary)
  );
const interactRow = [navigationRowInteract, navigationRowMid];
export const navigationRow = [navigationRowUp, navigationRowMid];
const talktRow = [navigationRowTalk, navigationRowMid];
const attackRow = [navigationRowAttack, navigationRowMid];
const bothButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId("talk_npc")
    .setLabel(" 🗣️ Talk")
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId("attack_monster")
    .setLabel("⚔️ Attack")
    .setStyle(ButtonStyle.Primary)
);
const nowBattling = new EmbedBuilder()
  .setTitle("Adventuring")
  .setImage("attachment://area2.png")
  .setDescription("Use the navigation buttons to move around the area!");

async function handleNavigation(
  allFloors: any[],
  message: any,
  adventureEmbed: EmbedBuilder,
  initialMessage: Message<boolean>,
  areaImage: any,
  player: ExtendedPlayer,
  selectedLocation: interfaceScenario
): Promise<void> {
  const db = mongoClient.db("Akaimnky");
  const collection: any = db.collection("akaillection");
  const dbFilter = { _id: message.user.id };
  const playerData2 = await collection.findOne(dbFilter);

  const gameImage = new GameImage(600, 600, player, message);
  const newNpc = new NPC(playerData2, "npc1", message);
  const playerpos = gameImage.playerpos;

  await gameImage.generateTutorialEntities();

  updatedImageBuffer = await gameImage.generateUpdatedImage(
    areaImage,
    playerpos
  );
  nowBattling.setImage(`attachment://updatedMap.png`);

  const filter = (i: any) =>
    i.user.id === message.user.id &&
    (["attack_monster", "cancel_adventure"].includes(i.customId) ||
      i.customId.startsWith("action_") ||
      i.customId === "option_select" ||
      i.customId === "go_in" ||
      i.customId === "talk_npc" ||
      i.customId.match(/^(north|south|west|east)$/i));

  const collector = initialMessage.createMessageComponentCollector({
    filter,
    time: 600000,
  });

  console.log("click1test1 :", playerpos);

  const hahaTrueOrFalse = await gameImage.nearElement(
    hasAttackButton,
    message,
    initialMessage,
    navigationRow,
    attackRow,
    talktRow,
    bothButton,
    hasTalkButton,
    nowBattling,
    interactRow,
    updatedImageBuffer
  );
  if (!hahaTrueOrFalse) {
    try {
      console.log("haha");
      initialMessage.edit({
        embeds: [nowBattling],
        components: [...navigationRow],
        files: [updatedImageBuffer],
      });
    } catch (error) {
      console.error("error hoogaya:", error);
    }
  }

  console.log("click1test2 :", playerpos);

  collector.on("collect", async (i: any) => {
    await i.deferUpdate();

    const hasAttackButton = initialMessage.components.some((component) =>
      component.components.some(
        (subComponent) => subComponent.customId === "attack_monster"
      )
    );
    const hasTalkButton = initialMessage.components.some((component) =>
      component.components.some(
        (subComponent) => subComponent.customId === "talk_npc"
      )
    );

    if (i.customId === "north" && i.user.id === message.user.id) {
      playerpos.y -= 50;
      console.log("Updated position:", playerpos);
      updatedImageBuffer = await gameImage.movePlayer(player);
      await initialMessage.edit({ files: [updatedImageBuffer] });
    } else if (i.customId === "east" && i.user.id === message.user.id) {
      playerpos.x += 50;
      console.log("Updated position:", playerpos);
      updatedImageBuffer = await gameImage.movePlayer(player);
      await initialMessage.edit({ files: [updatedImageBuffer] });
    } else if (i.customId === "west" && i.user.id === message.user.id) {
      playerpos.x -= 50;
      console.log("Updated position:", playerpos);
      updatedImageBuffer = await gameImage.movePlayer(player);
      await initialMessage.edit({ files: [updatedImageBuffer] });
    } else if (i.customId === "south" && i.user.id === message.user.id) {
      playerpos.y += 50;
      console.log("Updated position:", playerpos);
      updatedImageBuffer = await gameImage.movePlayer(player);
      await initialMessage.edit({ files: [updatedImageBuffer] });
    } else if (
      i.customId === "attack_monster" &&
      i.user.id === message.user.id
    ) {
      dontGoThrough = true;
      await initialMessage.edit({ components: [] });
      const thatArray = gameImage.elementArray[0];
      console.log("thatArray:", thatArray);

      console.log("existScenario:", selectedLocation);
      setTimeout(async () => {
        const battle = new Battle(
          playerData2,
          thatArray,
          message,
          selectedLocation
        );
        console.log("Starting battle...");
        await battle.startEmbed();
      }, 1000);
      setTimeout(async () => {
        await initialMessage.delete();
      }, 1000);
    } else if (i.customId === "talk_npc" && i.user.id === message.user.id) {
      newNpc.initiateTalk();
      await initialMessage.edit({ components: [] });
    }
    console.log("Current position:", playerpos);
    if (!dontGoThrough) {
      gameImage.nearElement(
        hasAttackButton,
        message,
        initialMessage,
        navigationRow,
        attackRow,
        talktRow,
        bothButton,
        hasTalkButton,
        nowBattling,
        interactRow
      );
    }
  });

  // collector.on("end", async () => {
  //   if (!dontGoThrough) {
  //     await initialMessage.edit({
  //       content: "Button interaction ended.",
  //       components: [],
  //     });
  //   }
  // });
}

export { handleNavigation };
