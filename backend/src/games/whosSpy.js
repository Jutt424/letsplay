import { getRandomWordPair } from '../data/wordPairs.js';

// roomId => gameState
const gameStates = new Map();

export const startGame = (roomId, players) => {
  if (players.length < 2) {
    return { error: 'At least 2 players required' };
  }

  const wordPair = getRandomWordPair();
  const spyIndex = Math.floor(Math.random() * players.length);

  const roles = players.map((player, i) => ({
    userId: player.userId,
    username: player.username,
    role: i === spyIndex ? 'spy' : 'civilian',
    word: i === spyIndex ? wordPair.spy : wordPair.civilian,
    description: null,
    vote: null,
    isEliminated: false,
  }));

  const gameState = {
    roomId,
    phase: 'describing', // describing | voting | result
    roles,
    wordPair,
    currentTurnIndex: 0,
    votes: {},
    result: null,
    startedAt: new Date().toISOString(),
  };

  gameStates.set(roomId, gameState);
  return { gameState };
};

export const submitDescription = (roomId, userId, description) => {
  const state = gameStates.get(roomId);
  if (!state || state.phase !== 'describing') return { error: 'Not in describing phase' };

  const player = state.roles.find(p => p.userId === userId);
  if (!player) return { error: 'Player not found' };

  const currentPlayer = state.roles[state.currentTurnIndex];
  if (currentPlayer.userId !== userId) return { error: 'Not your turn' };

  player.description = description;

  // Move to next turn
  state.currentTurnIndex++;

  // Skip eliminated players
  while (
    state.currentTurnIndex < state.roles.length &&
    state.roles[state.currentTurnIndex].isEliminated
  ) {
    state.currentTurnIndex++;
  }

  // All described → move to voting
  const allDescribed = state.roles.every(p => p.isEliminated || p.description !== null);
  if (allDescribed) {
    state.phase = 'voting';
    state.currentTurnIndex = 0;
  }

  return { gameState: state };
};

export const submitVote = (roomId, voterId, targetId) => {
  const state = gameStates.get(roomId);
  if (!state || state.phase !== 'voting') return { error: 'Not in voting phase' };

  const voter = state.roles.find(p => p.userId === voterId);
  if (!voter || voter.isEliminated) return { error: 'Cannot vote' };
  if (voter.vote !== null) return { error: 'Already voted' };
  if (voterId === targetId) return { error: 'Cannot vote for yourself' };

  const target = state.roles.find(p => p.userId === targetId);
  if (!target || target.isEliminated) return { error: 'Invalid vote target' };

  voter.vote = targetId;

  // Check if all active players voted
  const activePlayers = state.roles.filter(p => !p.isEliminated);
  const allVoted = activePlayers.every(p => p.vote !== null);

  if (!allVoted) return { gameState: state };

  // Count votes
  const voteCounts = {};
  activePlayers.forEach(p => {
    voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
  });

  // Find most voted — detect ties
  const maxVotes = Math.max(...Object.values(voteCounts));
  const topVoted = Object.entries(voteCounts).filter(([, count]) => count === maxVotes);

  const resetForNextRound = () => {
    state.phase = 'describing';
    state.currentTurnIndex = 0;
    // Skip any eliminated player at the start
    while (
      state.currentTurnIndex < state.roles.length &&
      state.roles[state.currentTurnIndex].isEliminated
    ) {
      state.currentTurnIndex++;
    }
    state.roles.forEach(p => {
      if (!p.isEliminated) {
        p.description = null;
        p.vote = null;
      }
    });
  };

  // Tie vote — no elimination, restart round
  if (topVoted.length > 1) {
    resetForNextRound();
    return { gameState: state, tie: true, voteCounts };
  }

  const eliminatedId = topVoted[0][0];
  const eliminated = state.roles.find(p => p.userId === eliminatedId);
  if (eliminated) eliminated.isEliminated = true;

  const spy = state.roles.find(p => p.role === 'spy');
  const spyEliminated = spy?.isEliminated;

  if (spyEliminated) {
    state.phase = 'result';
    state.result = 'civilians_win';
  } else {
    const activeCivilians = state.roles.filter(p => p.role === 'civilian' && !p.isEliminated);
    if (activeCivilians.length <= 1) {
      state.phase = 'result';
      state.result = 'spy_wins';
    } else {
      resetForNextRound();
    }
  }

  return { gameState: state, eliminated, voteCounts };
};

export const getGameState = (roomId) => gameStates.get(roomId);

export const endGame = (roomId) => {
  gameStates.delete(roomId);
};
