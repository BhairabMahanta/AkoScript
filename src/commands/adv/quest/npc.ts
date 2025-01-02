import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  AttachmentBuilder,
  Message,
  MessageComponentInteraction,
  TextChannel,
} from "discord.js";
import npcDialogue from "./npcDia.json";
import { Quest } from "./quest";

interface Dialogue {
  id: number;
  text: string;
  answers: Answer[];
  imageUrl?: string;
}

interface Answer {
  id: number;
  text: string;
  outcome: {
    nextQuestionId?: number;
    text?: string;
  };
}

class NPC {
  private player: any;
  private playerId: string;
  private name: string;
  private affection: number;
  private dialogueIndex: number;
  private embed: EmbedBuilder | null;
  private row: any | null;
  private message: Message;
  private collectorMessage: Message | null;
  private collector: any;
  private answerFields: any;
  private selectionMap: Record<string, number>;
  private text: string | null;
  private questName: string | null;
  private quest: Quest | null;
  private answers: Answer[] | null;
  private imageUrl: string | null;
  private yesNoButton: ActionRowBuilder<ButtonBuilder> | null;

  constructor(player: any, name: string, message: any) {
    this.player = player;
    this.playerId = message.user.id;
    this.name = name;
    this.affection = 0;
    this.dialogueIndex = 0;
    this.embed = null;
    this.row = null;
    this.message = message;
    this.collectorMessage = null;
    this.collector = null;
    this.answerFields = null;
    this.selectionMap = {};
    this.text = null;
    this.questName = null;
    this.quest = null;
    this.answers = null;
    this.imageUrl = null;
    this.yesNoButton = null;
  }

  async askQuestion(dialogue: Dialogue) {
    const { text, answers, imageUrl } = dialogue;
    this.text = text;
    this.answers = answers;
    this.imageUrl = imageUrl ? imageUrl : null;

    const answerButtons = answers.map((answer, index) => {
      const label = String.fromCharCode(65 + index); // Convert index to A, B, C, D labels
      const selection = label.toLowerCase();
      this.selectionMap[selection] = answer.outcome.nextQuestionId!;
      return new ButtonBuilder()
        .setStyle(4) // 'Danger' style
        .setCustomId(`answer_${index + 1}`)
        .setLabel(label);
    });

    this.row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...answerButtons
    );

    const answerFields = [
      {
        name: "Choose any of the options below:",
        value: answers
          .map(
            (answer, index) =>
              `${String.fromCharCode(65 + index)}. **${answer.text}**`
          )
          .join("\n"),
        inline: false,
      },
    ];

    await this.editFields();
    this.embed!.setDescription(`### ${text}\n\n`);
    this.embed!.addFields(...answerFields);

    await this.collectorMessage!.edit({
      embeds: [this.embed!],
      components: [this.row],
    });

    this.collectorKa();
  }

  async collectorKa() {
    if (!this.collector) {
      const filter = (i: MessageComponentInteraction) =>
        i.user.id === this.message.author.id;
      this.collector = this.collectorMessage!.createMessageComponentCollector({
        filter,
        idle: 600000,
      });

      this.collector.on(
        "collect",
        async (interaction: MessageComponentInteraction) => {
          await interaction.deferUpdate();
          if (interaction.customId === "start") {
            this.askQuestion(
              npcDialogue.dialogues.find((d: Dialogue) => d.id === 1)!
            );
          } else if (interaction.customId === "cancel") {
            this.collectorMessage!.delete();
          } else if (interaction.customId === "Accept") {
            this.quest!.acceptQuest();
          } else if (interaction.customId === "Decline") {
            this.quest!.declineQuest();
          }

          if (interaction.customId !== "cancel") {
            const selectedAnswerId = parseInt(
              interaction.customId.split("_")[1]
            );
            const selectedAnswer = this.answers!.find(
              (answer) => answer.id === selectedAnswerId
            );

            if (selectedAnswer) {
              const outcome = selectedAnswer.outcome;

              if (outcome.nextQuestionId) {
                const nextQuestion = npcDialogue.dialogues.find(
                  (q: Dialogue) => q.id === outcome.nextQuestionId
                );
                this.askQuestion(nextQuestion!);
              } else if (outcome.text) {
                if (outcome.text.startsWith("quest_")) {
                  this.questName = outcome.text.replace("quest_", "");
                  this.quest = new Quest(this);
                  this.quest.showQuestDetails();
                }
              }
            }
          }
        }
      );
    }
  }

  async editFields() {
    this.embed = new EmbedBuilder()
      .setTitle(`Talking to ${this.name}`)
      .setDescription("Have something like {dialogueindex}")
      .setColor("#0099ff");
  }

  async initiateTalk(): Promise<void> {
    this.embed = new EmbedBuilder()
      .setTitle(`Talking to ${this.name}`)
      .setDescription("Have something like {dialogueindex}")
      .setColor("#0099ff");

    const method = this.methods[this.name];
    if (method) {
      await method();
    } else {
      console.error(`No method found for ${this.name}`);
    }

    this.collectorMessage = await (this.message.channel as TextChannel).send({
      embeds: [this.embed],
      components: [this.row],
    });
    this.collectorKa();
  }

  private methods: Record<string, () => Promise<void>> = {
    npc1: async () => {
      if (this.player.exp.level < 5) {
        if (this.dialogueIndex === 0) {
          this.embed!.setDescription(`## Do You want to talk to ${this.name}?`);
          this.yesNoButton =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setStyle(1)
                .setLabel("Yes")
                .setCustomId("start"),
              new ButtonBuilder()
                .setStyle(1)
                .setLabel("No")
                .setCustomId("cancel")
            );
          this.row = this.yesNoButton;

          this.embed!.addFields({
            name: "makeIndex",
            value: "setDialogues from npcname:",
            inline: false,
          });

          this.dialogueIndex++;
          return this.row;
        }
      }
    },
  };
}

export { NPC };
