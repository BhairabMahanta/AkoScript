async function fillAtkBars(charactersWith100AtkBar) {
  this.characters.sort((a, b) => b.stats.speed - a.stats.speed);
  // Check if any character already has atkBar >= 100
  for (const character of this.characters) {
    if (character.atkBar >= 100) {
      charactersWith100AtkBar.push(character);
      return charactersWith100AtkBar; // Exit early if any character has atkBar >= 100
    }
  }
  // Calculate the smallestFactor for all characters
  let smallestFactor = Infinity;
  for (const character of this.characters) {
    const speedMultiplier = character.speedBuff ? 1.3 : 1;
    const toMinus = character.atkBar;
    const factor =
      (100 - toMinus) / (character.stats.speed * 0.05 * speedMultiplier);
    console.log("factor:", factor);
    if (factor < smallestFactor) {
      smallestFactor = factor;
    }
  }
  // Update atkBar for all characters using smallestFactor
  for (const character of this.characters) {
    const speedMultiplier = character.speedBuff ? 1.3 : 1;
    character.atkBar +=
      smallestFactor * (character.stats.speed * 0.05 * speedMultiplier);

    if (character.atkBar >= 100) {
      charactersWith100AtkBar.push(character);
    }
  }
  // Generate attack bar emoji for each character
  for (const character of this.characters) {
    character.attackBarEmoji = await generateAttackBarEmoji(character.atkBar);
  }
  return charactersWith100AtkBar;
}
