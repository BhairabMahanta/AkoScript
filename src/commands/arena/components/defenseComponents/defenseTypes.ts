import { DeckManager } from '../../../player/selection/deckUtils';

export interface DefenseMenuState {
  currentView: 'main' | 'configure';
  deckManager?: DeckManager;
}

export interface DefenseStats {
  wins: number;
  losses: number;
  winRate: number;
  total: number;
}

export interface DefenseTeamData {
  defenseDeck: any[];
  hasDefenseSet: boolean;
  defenseStats: DefenseStats;
}
