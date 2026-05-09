// Verify the io module wires up the expected socket events and that handlers
// delegate to lobbyManager correctly. lobbyManager is fully mocked so these
// tests don't touch state created by the lobbyManager unit tests.

jest.mock('../lobbyManager', () => ({
  createMultiplayerGame: jest.fn(),
  joinGame: jest.fn(),
  getPlayerTeam: jest.fn(),
  getCurrentTurn: jest.fn(),
  updateGameState: jest.fn(),
  getGame: jest.fn(),
  handleDisconnect: jest.fn(),
}));

const lobbyManager = require('../lobbyManager');
const ioHandler = require('../io');

function makeMockSocket() {
  const handlers = {};
  return {
    handlers,
    id: 'sock-' + Math.random().toString(36).slice(2),
    on: jest.fn((event, cb) => { handlers[event] = cb; }),
    emit: jest.fn(),
    broadcast: { emit: jest.fn() },
  };
}

function makeMockIo() {
  const connectionHandlers = [];
  return {
    connectionHandlers,
    on: jest.fn((event, cb) => {
      if (event === 'connection') connectionHandlers.push(cb);
    }),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ioHandler wiring', () => {
  test('registers a connection handler on the io server', () => {
    const io = makeMockIo();
    ioHandler(io);
    expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  test('registers expected socket events when a client connects', () => {
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    const events = Object.keys(socket.handlers);
    expect(events).toEqual(expect.arrayContaining([
      'setUserInfo',
      'userConnected',
      'newMultiplayerGameRequested',
      'joinGameRequested',
      'move',
      'requestBoardSync',
      'offerDraw',
      'respondDraw',
      'resign',
      'disconnect',
    ]));
  });
});

describe('newMultiplayerGameRequested', () => {
  test('emits newMultiplayerGameCreated with the new game id', async () => {
    lobbyManager.createMultiplayerGame.mockResolvedValue('new-game-123');
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    await socket.handlers['newMultiplayerGameRequested']('user-A');

    expect(lobbyManager.createMultiplayerGame).toHaveBeenCalledWith('user-A');
    expect(socket.emit).toHaveBeenCalledWith('newMultiplayerGameCreated', 'new-game-123');
  });

  test('emits an error when game creation fails', async () => {
    lobbyManager.createMultiplayerGame.mockRejectedValue(new Error('boom'));
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    await socket.handlers['newMultiplayerGameRequested']('user-A');

    expect(socket.emit).toHaveBeenCalledWith('error', expect.stringMatching(/Failed to create/i));
  });
});

describe('joinGameRequested', () => {
  test('emits joinGameReplied with the joined game id on success', async () => {
    lobbyManager.joinGame.mockResolvedValue('white');
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    await socket.handlers['joinGameRequested']('user-B', 'game-1');

    expect(lobbyManager.joinGame).toHaveBeenCalledWith('user-B', 'game-1');
    expect(socket.emit).toHaveBeenCalledWith('joinGameReplied', 'white');
  });

  test('emits joinGameReplied with null when join fails', async () => {
    lobbyManager.joinGame.mockRejectedValue(new Error('not found'));
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    await socket.handlers['joinGameRequested']('user-B', 'bad-game');

    expect(socket.emit).toHaveBeenCalledWith('joinGameReplied', null);
  });
});

// Helper: connect a socket and set its user info so subsequent events pass
// the currentUserId/currentGameId guards in io.js.
function freshSocketWithUser(userId = 'user-X', gameId = 'game-1') {
  const io = makeMockIo();
  ioHandler(io);
  const socket = makeMockSocket();
  io.connectionHandlers[0](socket);
  socket.handlers['setUserInfo'](userId, gameId);
  return { io, socket };
}

describe('access guards (no user info set)', () => {
  test.each(['move', 'offerDraw', 'respondDraw', 'resign'])(
    '%s emits "Invalid game access" when called without setUserInfo',
    async (event) => {
      const io = makeMockIo();
      ioHandler(io);
      const socket = makeMockSocket();
      io.connectionHandlers[0](socket);

      // Pass through whatever the handler expects; the guard fires first.
      await socket.handlers[event]('game-1', { fen: 'x', pgn: '', turn: 'w' });
      expect(socket.emit).toHaveBeenCalledWith('error', 'Invalid game access');
    }
  );
});

describe('move', () => {
  test('rejects when both players have not joined yet', async () => {
    const { socket } = freshSocketWithUser();
    await socket.handlers['move']('game-1', { fen: 'x', pgn: '', turn: 'w' });
    expect(socket.emit).toHaveBeenCalledWith(
      'error',
      'Wait for opponent to join before making moves'
    );
  });
});

describe('requestBoardSync', () => {
  test('emits syncBoard with the current game state', async () => {
    lobbyManager.getGame.mockResolvedValue({
      gameId: 'game-1',
      gameState: { turn: 'w', fen: 'fen-string', pgn: '', outcome: 'ongoing' },
    });
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    await socket.handlers['requestBoardSync']('game-1');

    expect(lobbyManager.getGame).toHaveBeenCalledWith('game-1');
    expect(socket.emit).toHaveBeenCalledWith(
      'syncBoard',
      expect.objectContaining({ fen: 'fen-string' })
    );
  });

  test('does not throw when the game is missing', () => {
    // syncBoard internally catches its own errors, so the event handler
    // (which is sync and doesn't await) returns undefined without throwing.
    lobbyManager.getGame.mockRejectedValue(new Error('Game not found'));
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    expect(() => socket.handlers['requestBoardSync']('no-such-game')).not.toThrow();
  });
});

describe('respondDraw', () => {
  test('updates outcome to draw when accepted', async () => {
    lobbyManager.getGame.mockResolvedValue({
      gameState: { turn: 'w', fen: 'fen-string', pgn: '1. e4 e5' },
    });
    lobbyManager.updateGameState.mockResolvedValue({});
    const { socket } = freshSocketWithUser();

    await socket.handlers['respondDraw']('game-1', true);

    expect(lobbyManager.updateGameState).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({ outcome: 'draw' })
    );
  });

  test('does not update outcome when declined', async () => {
    const { socket } = freshSocketWithUser();
    await socket.handlers['respondDraw']('game-1', false);
    expect(lobbyManager.updateGameState).not.toHaveBeenCalled();
  });
});

// Helper: drive handleConnection via the userConnected event so that
// gamePlayers[gameId] is populated, unlocking move / offerDraw / resign /
// disconnect happy paths.
async function connectTwoPlayers(io, ws, bs, gameId = 'game-1') {
  // Both players share the same mocked lobbyManager.getGame return value
  lobbyManager.getGame.mockResolvedValue({
    gameId,
    gameState: { turn: 'w', fen: 'start', pgn: '', outcome: 'ongoing' },
  });
  lobbyManager.getPlayerTeam
    .mockResolvedValueOnce(null)   // white not in game yet
    .mockResolvedValueOnce(null);  // black not in game yet
  lobbyManager.joinGame
    .mockResolvedValueOnce('white')
    .mockResolvedValueOnce('black');
  lobbyManager.getCurrentTurn.mockResolvedValue('w');

  ws.handlers['setUserInfo']('user-W', gameId);
  bs.handlers['setUserInfo']('user-B', gameId);
  await ws.handlers['userConnected']('user-W', gameId);
  await bs.handlers['userConnected']('user-B', gameId);
}

describe('happy-path handlers (after both players connected)', () => {
  test('move with valid game state delegates to lobbyManager.updateGameState', async () => {
    const io = makeMockIo();
    ioHandler(io);
    const ws = makeMockSocket();
    const bs = makeMockSocket();
    io.connectionHandlers[0](ws);
    io.connectionHandlers[0](bs);

    await connectTwoPlayers(io, ws, bs);
    lobbyManager.updateGameState.mockResolvedValue({});

    await ws.handlers['move']('game-1', {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b',
      pgn: '1. e4',
      turn: 'b',
      move: { from: 'e2', to: 'e4' },
    });

    expect(lobbyManager.updateGameState).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({ fen: expect.any(String), pgn: '1. e4' })
    );
  });

  test('move with missing fen / pgn rejects with "Invalid move data"', async () => {
    const io = makeMockIo();
    ioHandler(io);
    const ws = makeMockSocket();
    const bs = makeMockSocket();
    io.connectionHandlers[0](ws);
    io.connectionHandlers[0](bs);
    await connectTwoPlayers(io, ws, bs);

    await ws.handlers['move']('game-1', { turn: 'b' }); // no fen/pgn
    expect(ws.emit).toHaveBeenCalledWith('error', 'Invalid move data');
  });

  test('resign updates outcome and emits youResigned to the resigning socket', async () => {
    const io = makeMockIo();
    ioHandler(io);
    const ws = makeMockSocket();
    const bs = makeMockSocket();
    io.connectionHandlers[0](ws);
    io.connectionHandlers[0](bs);
    await connectTwoPlayers(io, ws, bs);
    lobbyManager.updateGameState.mockResolvedValue({});

    await ws.handlers['resign']('game-1');

    expect(lobbyManager.updateGameState).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({ outcome: 'checkmate' })
    );
    expect(ws.emit).toHaveBeenCalledWith('youResigned', 'white');
  });

  test('disconnect removes the player from gamePlayers without throwing', async () => {
    const io = makeMockIo();
    ioHandler(io);
    const ws = makeMockSocket();
    const bs = makeMockSocket();
    io.connectionHandlers[0](ws);
    io.connectionHandlers[0](bs);
    await connectTwoPlayers(io, ws, bs);

    await expect(ws.handlers['disconnect']()).resolves.not.toThrow();
  });
});

describe('disconnect', () => {
  test('does not throw when the disconnecting socket is not in any game', async () => {
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    await expect(socket.handlers['disconnect']()).resolves.not.toThrow();
  });
});

describe('setUserInfo', () => {
  test('does not emit anything (just stores state)', () => {
    const io = makeMockIo();
    ioHandler(io);
    const socket = makeMockSocket();
    io.connectionHandlers[0](socket);

    socket.handlers['setUserInfo']('user-A', 'game-1');
    expect(socket.emit).not.toHaveBeenCalled();
    expect(socket.userId).toBe('user-A');
    expect(socket.gameId).toBe('game-1');
  });
});
