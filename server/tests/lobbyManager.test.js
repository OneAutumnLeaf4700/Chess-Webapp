// Mock mongoose so lobbyManager's isDbConnected() returns false and the
// in-memory fallback paths are exercised. Also mock the Mongoose Game model
// since dbschema.js imports mongoose at load time.
jest.mock('mongoose', () => ({
  connection: { readyState: 0, on: jest.fn() },
  Types: {
    ObjectId: jest.fn(function () {
      const id = `mock-oid-${Math.random().toString(36).slice(2)}`;
      this.toString = () => id;
    }),
  },
  Schema: jest.fn(function () { return { pre: jest.fn() }; }),
  model: jest.fn(() => function MockGame() {}),
  set: jest.fn(),
}));

jest.mock('../database/dbschema.js', () => ({
  findOne: jest.fn(),
  deleteOne: jest.fn(),
}));

let lobbyManager;

beforeEach(() => {
  jest.resetModules();
  lobbyManager = require('../lobbyManager');
});

describe('createMultiplayerGame', () => {
  test('returns a non-empty game id', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('assigns the creator a color (white or black)', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    const team = await lobbyManager.getPlayerTeam('user-A', id);
    expect(['white', 'black']).toContain(team);
  });

  test('two creates produce two distinct game ids', async () => {
    const id1 = await lobbyManager.createMultiplayerGame('user-A');
    const id2 = await lobbyManager.createMultiplayerGame('user-B');
    expect(id1).not.toBe(id2);
  });
});

describe('joinGame', () => {
  test('joining as second player gets the opposite color', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    const aColor = await lobbyManager.getPlayerTeam('user-A', id);
    const bColor = await lobbyManager.joinGame('user-B', id);
    expect(bColor).not.toBe(aColor);
    expect(['white', 'black']).toContain(bColor);
  });

  test('joining a non-existent game returns null', async () => {
    const result = await lobbyManager.joinGame('user-X', 'non-existent-id');
    expect(result).toBeNull();
  });

  test('joining a full game returns null', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    await lobbyManager.joinGame('user-B', id);
    const third = await lobbyManager.joinGame('user-C', id);
    expect(third).toBeNull();
  });
});

describe('getPlayerTeam', () => {
  test('returns null for a player not in the game', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    const team = await lobbyManager.getPlayerTeam('not-a-player', id);
    expect(team).toBeNull();
  });

  test('returns null for a non-existent game', async () => {
    const team = await lobbyManager.getPlayerTeam('user-A', 'no-such-game');
    expect(team).toBeNull();
  });
});

describe('getCurrentTurn', () => {
  test('starts as "w"', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    const turn = await lobbyManager.getCurrentTurn(id);
    expect(turn).toBe('w');
  });

  test('returns null for unknown game', async () => {
    const turn = await lobbyManager.getCurrentTurn('no-such-game');
    expect(turn).toBeNull();
  });
});

describe('updateGameState', () => {
  test('persists turn / fen / pgn / outcome', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    await lobbyManager.updateGameState(id, {
      turn: 'b',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      pgn: '1. e4',
      outcome: 'ongoing',
    });
    const turn = await lobbyManager.getCurrentTurn(id);
    expect(turn).toBe('b');
    const game = await lobbyManager.getGame(id);
    expect(game.gameState.fen).toMatch(/^rnbqkbnr/);
    expect(game.gameState.pgn).toBe('1. e4');
  });

  test('throws when game does not exist', async () => {
    await expect(
      lobbyManager.updateGameState('no-such-game', { turn: 'b', fen: 'x', pgn: '', outcome: 'ongoing' })
    ).rejects.toThrow('Game not found');
  });
});

describe('getGame', () => {
  test('returns the game object', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    const game = await lobbyManager.getGame(id);
    expect(game.gameId).toBe(id);
    expect(game.players).toHaveLength(1);
    expect(game.outcome).toBe('ongoing');
  });

  test('throws for unknown game', async () => {
    await expect(lobbyManager.getGame('no-such-game')).rejects.toThrow('Game not found');
  });
});

describe('handleDisconnect', () => {
  test('removes the in-memory game and returns true', async () => {
    const id = await lobbyManager.createMultiplayerGame('user-A');
    const ok = await lobbyManager.handleDisconnect(id);
    expect(ok).toBe(true);
    await expect(lobbyManager.getGame(id)).rejects.toThrow('Game not found');
  });

  test('returns null for an unknown game', async () => {
    const result = await lobbyManager.handleDisconnect('no-such-game');
    expect(result).toBeNull();
  });
});
