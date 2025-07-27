import { ExtendedClient } from "../../../..";

export async function handleRewardClaim(interaction: any, client: ExtendedClient): Promise<void> {
  await interaction.followUp({
    content: '🎁 Reward claiming system coming soon!',
    ephemeral: true
  });
}

export async function handleOtherFeatures(interaction: any, client: ExtendedClient): Promise<void> {
  await interaction.followUp({
    content: '🔧 This feature is under development!',
    ephemeral: true
  });
}
