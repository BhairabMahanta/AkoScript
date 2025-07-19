// ui/managers/CharacterIdentifier.ts
export class CharacterIdentifier {
  private battle: any;

  constructor(battle: any) {
    this.battle = battle;
  }

  isPlayer1Character(character: any): boolean {
    if (!character) return false;
    
    const player1Id = this.battle.player.id || this.battle.player._id;
    
    if (character.id === player1Id || character._id === player1Id) {
      return true;
    }
    
    return this.battle.familiarInfo.some((f: any) => 
      f.serialId === character.serialId && f.name === character.name
    );
  }

  isPlayer2Character(character: any): boolean {
    if (!character) return false;
    
    const player2Id = this.battle.player2.id || this.battle.player2._id;
    
    if (character.id === player2Id || character._id === player2Id) {
      return true;
    }
    
    return this.battle.player2FamiliarInfo.some((f: any) => 
      f.serialId === character.serialId && f.name === character.name
    );
  }

  isPlayerCharacter(character: any): boolean {
    return character.name === this.battle.player.name || 
           (this.battle.player2 && character.name === this.battle.player2.name);
  }

  isAICharacterTurn(currentTurn: any): boolean {
    if (!currentTurn) return false;
    
    const player2Id = this.battle.player2.id || this.battle.player2._id;
    
    if (currentTurn.id === player2Id || currentTurn._id === player2Id) {
      return true;
    }
    
    return this.battle.player2FamiliarInfo.some((f: any) => 
      f.serialId === currentTurn.serialId && f.name === currentTurn.name
    );
  }

  getPlayerClass(character: any): string | null {
    if (character.name === this.battle.player.name) {
      return this.battle.player.class;
    } else if (this.battle.player2 && character.name === this.battle.player2.name) {
      return this.battle.player2.class;
    }
    return null;
  }

  getCurrentPlayerIdFromUserId(userId: string): string {
    const state = this.battle.stateManager.getState();
    const currentTurn = state.currentTurn;
    
    if (this.battle.mode === 'pve') {
      return userId;
    }
    
    const player1Id = this.battle.player.id || this.battle.player._id;
    const player2Id = this.battle.player2.id || this.battle.player2._id;
    
    if (this.isPlayer1Character(currentTurn)) {
      return player1Id;
    } else if (this.isPlayer2Character(currentTurn)) {
      return player2Id;
    }
    
    return userId;
  }
}
