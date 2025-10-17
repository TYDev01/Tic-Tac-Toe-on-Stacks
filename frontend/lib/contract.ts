import { STACKS_TESTNET } from "@stacks/network";
import {
  BooleanCV,
  cvToValue,
  fetchCallReadOnlyFunction,
  ListCV,
  OptionalCV,
  PrincipalCV,
  principalCV,
  TupleCV,
  uintCV,
  UIntCV,
} from "@stacks/transactions";

// REPLACE THESE WITH YOUR OWN
const CONTRACT_ADDRESS = "ST2S0QHZC65P50HFAA2P7GD9CJBT48KDJ9DNYGDSK";
const CONTRACT_NAME = "tic-tac-toe-v3";

type GameCV = {
  "player-one": PrincipalCV;
  "player-two": OptionalCV<PrincipalCV>;
  "is-player-one-turn": BooleanCV;
  "bet-amount": UIntCV;
  board: ListCV<UIntCV>;
  winner: OptionalCV<PrincipalCV>;
  "is-draw": BooleanCV;
  "draw-resolved": BooleanCV;
  "last-move-block": UIntCV;
};

type PlayerStatsCV = {
  wins: UIntCV;
  losses: UIntCV;
  draws: UIntCV;
  rating: UIntCV;
  "games-played": UIntCV;
  "last-game-block": UIntCV;
};

type QueuePlayerCV = {
  "bet-amount": UIntCV;
  "join-time": UIntCV;
  rating: UIntCV;
};

type QueueStatusCV = {
  "queue-size": UIntCV;
  "queue-players": ListCV<PrincipalCV>;
};

export type Game = {
  id: number;
  "player-one": string;
  "player-two": string | null;
  "is-player-one-turn": boolean;
  "bet-amount": number;
  board: number[];
  winner: string | null;
  "is-draw": boolean;
  "draw-resolved": boolean;
  "last-move-block": number;
};

export type PlayerStats = {
  wins: number;
  losses: number;
  draws: number;
  rating: number;
  "games-played": number;
  "last-game-block": number;
};

export type QueuePlayer = {
  "bet-amount": number;
  "join-time": number;
  rating: number;
};

export type QueueStatus = {
  "queue-size": number;
  "queue-players": string[];
};

export enum Move {
  EMPTY = 0,
  X = 1,
  O = 2,
}

export const EMPTY_BOARD = [
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
  Move.EMPTY,
];


export async function getAllGames() {
  // Fetch the latest-game-id from the contract
  const latestGameIdCV = (await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-latest-game-id",
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  })) as UIntCV;

  // Convert the uintCV to a JS/TS number type
  const latestGameId = parseInt(latestGameIdCV.value.toString());

  // Loop from 0 to latestGameId-1 and fetch the game details for each game
  const games: Game[] = [];
  for (let i = 0; i < latestGameId; i++) {
    const game = await getGame(i);
    if (game) games.push(game);
  }
  return games;
}

export async function getCurrentBlockHeight(): Promise<number> {
  try {
    const baseUrl = "https://api.testnet.hiro.so";
    const response = await fetch(`${baseUrl}/extended/v1/block`);
    const data = await response.json();
    return data.height || 0;
  } catch (error) {
    console.error("Error fetching current block height:", error);
    return 0;
  }
}

export async function getGame(gameId: number) {
  // Use the get-game read only function to fetch the game details for the given gameId
  const gameDetails = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-game",
    functionArgs: [uintCV(gameId)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  });

  const responseCV = gameDetails as OptionalCV<TupleCV<GameCV>>;
  // If we get back a none, then the game does not exist and we return null
  if (responseCV.type === "none") return null;
  // If we get back a value that is not a tuple, something went wrong and we return null
  if (responseCV.value.type !== "tuple") return null;

  // If we got back a GameCV tuple, we can convert it to a Game object
  const gameCV = responseCV.value.value;

  const game: Game = {
    id: gameId,
    "player-one": gameCV["player-one"].value,
    "player-two":
      gameCV["player-two"].type === "some"
        ? gameCV["player-two"].value.value
        : null,
    "is-player-one-turn": cvToValue(gameCV["is-player-one-turn"]),
    "bet-amount": parseInt(gameCV["bet-amount"].value.toString()),
    board: gameCV["board"].value.map((cell) => parseInt(cell.value.toString())),
    winner:
      gameCV["winner"].type === "some" ? gameCV["winner"].value.value : null,
    // Handle backward compatibility - use false if is-draw doesn't exist (old games)
    "is-draw": gameCV["is-draw"] ? cvToValue(gameCV["is-draw"]) : false,
    // Handle backward compatibility - use false if draw-resolved doesn't exist (old games)
    "draw-resolved": gameCV["draw-resolved"] ? cvToValue(gameCV["draw-resolved"]) : false,
    // Handle backward compatibility - use 0 if last-move-block doesn't exist (old games)
    "last-move-block": gameCV["last-move-block"] 
      ? parseInt(gameCV["last-move-block"].value.toString())
      : 0,
  };
  return game;
}



export async function createNewGame(
  betAmount: number,
  moveIndex: number,
  move: Move
) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "create-game",
    functionArgs: [uintCV(betAmount), uintCV(moveIndex), uintCV(move)],
  };

  return txOptions;
}

export async function joinGame(gameId: number, moveIndex: number, move: Move) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "join-game",
    functionArgs: [uintCV(gameId), uintCV(moveIndex), uintCV(move)],
  };

  return txOptions;
}

export async function play(gameId: number, moveIndex: number, move: Move) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "play",
    functionArgs: [uintCV(gameId), uintCV(moveIndex), uintCV(move)],
  };

  return txOptions;
}

export async function cancelGameTimeout(gameId: number) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "cancel-game-timeout",
    functionArgs: [uintCV(gameId)],
  };

  return txOptions;
}

// Timeout constants (should match the contract)
export const GAME_TIMEOUT_BLOCKS = 300; // ~5 minutes
export const ESTIMATED_SECONDS_PER_BLOCK = 1; // Rough estimate

// Helper functions for timeout calculations
export function getTimeoutInfo(game: Game, currentBlockHeight: number) {
  // Handle old games without timestamp (return null or safe defaults)
  if (!game["last-move-block"] || game["last-move-block"] === 0) {
    return {
      blocksSinceLastMove: 0,
      blocksUntilTimeout: GAME_TIMEOUT_BLOCKS,
      secondsUntilTimeout: GAME_TIMEOUT_BLOCKS * ESTIMATED_SECONDS_PER_BLOCK,
      isTimedOut: false,
      timeoutInMinutes: Math.ceil((GAME_TIMEOUT_BLOCKS * ESTIMATED_SECONDS_PER_BLOCK) / 60),
    };
  }

  const blocksSinceLastMove = currentBlockHeight - game["last-move-block"];
  const blocksUntilTimeout = GAME_TIMEOUT_BLOCKS - blocksSinceLastMove;
  const secondsUntilTimeout = Math.max(0, blocksUntilTimeout * ESTIMATED_SECONDS_PER_BLOCK);
  const isTimedOut = blocksSinceLastMove >= GAME_TIMEOUT_BLOCKS;
  
  return {
    blocksSinceLastMove,
    blocksUntilTimeout,
    secondsUntilTimeout,
    isTimedOut,
    timeoutInMinutes: Math.ceil(secondsUntilTimeout / 60),
  };
}

export function canCancelGame(game: Game, currentAddress: string, currentBlockHeight: number): boolean {
  // Can't cancel if game is already won
  if (game.winner) return false;
  
  // Can't cancel if game doesn't have two players
  if (!game["player-two"]) return false;
  
  // Can't cancel old games without timestamps (they don't support timeout)
  if (!game["last-move-block"] || game["last-move-block"] === 0) return false;
  
  // Can only cancel if timeout has been reached
  const timeoutInfo = getTimeoutInfo(game, currentBlockHeight);
  if (!timeoutInfo.isTimedOut) return false;
  
  // Can only cancel if you're the waiting player (not the one whose turn it is)
  const isPlayerOne = currentAddress === game["player-one"];
  const isPlayerTwo = currentAddress === game["player-two"];
  const isWaitingPlayer = game["is-player-one-turn"] ? isPlayerTwo : isPlayerOne;
  
  return isWaitingPlayer;
}

// Matchmaking and Ranking Functions

export async function getPlayerStats(playerAddress: string): Promise<PlayerStats | null> {
  const playerStatsCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-player-stats",
    functionArgs: [principalCV(playerAddress)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  }) as OptionalCV<TupleCV<PlayerStatsCV>>;

  if (playerStatsCV.type === "none") return null;
  if (playerStatsCV.value.type !== "tuple") return null;

  const statsCV = playerStatsCV.value.value;
  return {
    wins: parseInt(statsCV.wins.value.toString()),
    losses: parseInt(statsCV.losses.value.toString()),
    draws: parseInt(statsCV.draws.value.toString()),
    rating: parseInt(statsCV.rating.value.toString()),
    "games-played": parseInt(statsCV["games-played"].value.toString()),
    "last-game-block": parseInt(statsCV["last-game-block"].value.toString()),
  };
}

export async function getQueueStatus(): Promise<QueueStatus> {
  const queueStatusCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-queue-status",
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  }) as TupleCV<QueueStatusCV>;

  const queueData = queueStatusCV.value;
  return {
    "queue-size": parseInt(queueData["queue-size"].value.toString()),
    "queue-players": queueData["queue-players"].value.map((player) => player.value),
  };
}

export async function getPlayerQueueInfo(playerAddress: string): Promise<QueuePlayer | null> {
  const queuePlayerCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-player-queue-info",
    functionArgs: [principalCV(playerAddress)],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  }) as OptionalCV<TupleCV<QueuePlayerCV>>;

  if (queuePlayerCV.type === "none") return null;
  if (queuePlayerCV.value.type !== "tuple") return null;

  const queueData = queuePlayerCV.value.value;
  return {
    "bet-amount": parseInt(queueData["bet-amount"].value.toString()),
    "join-time": parseInt(queueData["join-time"].value.toString()),
    rating: parseInt(queueData.rating.value.toString()),
  };
}

export async function getLeaderboard(): Promise<string[]> {
  const leaderboardCV = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "get-leaderboard",
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: STACKS_TESTNET,
  }) as ListCV<PrincipalCV>;

  return leaderboardCV.value.map((player) => player.value);
}

// Transaction Functions for Matchmaking

export async function joinQueue(betAmount: number) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "join-queue",
    functionArgs: [uintCV(betAmount)],
  };

  return txOptions;
}

export async function leaveQueue() {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "leave-queue",
    functionArgs: [],
  };

  return txOptions;
}

export async function findMatch() {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "find-match",
    functionArgs: [],
  };

  return txOptions;
}

export async function playWithStats(gameId: number, moveIndex: number, move: Move) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "play-with-stats",
    functionArgs: [uintCV(gameId), uintCV(moveIndex), uintCV(move)],
  };

  return txOptions;
}

export async function quitDraw(gameId: number) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "quit-draw",
    functionArgs: [uintCV(gameId)],
  };

  return txOptions;
}

export async function rematch(gameId: number) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: "rematch",
    functionArgs: [uintCV(gameId)],
  };

  return txOptions;
}

// Helper functions for ranking

export function calculateWinRate(stats: PlayerStats): number {
  if (stats["games-played"] === 0) return 0;
  return (stats.wins / stats["games-played"]) * 100;
}

export function getRankTitle(rating: number): string {
  if (rating >= 2200) return "Grandmaster";
  if (rating >= 2000) return "Master";
  if (rating >= 1800) return "Expert";
  if (rating >= 1600) return "Advanced";
  if (rating >= 1400) return "Intermediate";
  if (rating >= 1200) return "Beginner";
  return "Novice";
}

export function getRatingChange(oldRating: number, newRating: number): number {
  return newRating - oldRating;
}

// Game state helper functions

export function isGameFinished(game: Game): boolean {
  return !!game.winner || game["is-draw"];
}

export function isGameDraw(game: Game): boolean {
  return game["is-draw"] && !game.winner;
}

export function canRematchOrQuit(game: Game): boolean {
  return game["is-draw"] && !game["draw-resolved"];
}

export function getGameResult(game: Game, currentAddress: string): {
  status: "won" | "lost" | "draw" | "in-progress";
  message: string;
  color: string;
} {
  if (game["is-draw"]) {
    return {
      status: "draw",
      message: "Game ended in a draw",
      color: "text-yellow-400"
    };
  }
  
  if (game.winner) {
    if (game.winner === currentAddress) {
      return {
        status: "won",
        message: "🎉 You won!",
        color: "text-green-400"
      };
    } else {
      return {
        status: "lost",
        message: "😞 You lost",
        color: "text-red-400"
      };
    }
  }
  
  return {
    status: "in-progress",
    message: "Game in progress",
    color: "text-blue-400"
  };
}