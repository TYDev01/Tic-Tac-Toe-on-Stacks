"use client";

import { useEffect, useState } from "react";
import { Game, getGame, getCurrentBlockHeight, getTimeoutInfo } from "@/lib/contract";
import { GameBoard } from "./game-board";
import { formatStx } from "@/lib/stx-utils";
import Link from "next/link";

interface SpectateGameProps {
  gameId: number;
}

export function SpectateGame({ gameId }: SpectateGameProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBlockHeight, setCurrentBlockHeight] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

  // Function to fetch the latest game state
  const fetchGameState = async () => {
    try {
      const gameData = await getGame(gameId);
      if (gameData) {
        setGame(gameData);
        setError(null);
        setLastUpdateTime(new Date().toLocaleTimeString());
      } else {
        setError("Game not found");
      }
    } catch (err) {
      console.error("Error fetching game:", err);
      setError("Failed to load game data");
    }
  };

  // Function to update block height
  const updateBlockHeight = async () => {
    try {
      const height = await getCurrentBlockHeight();
      setCurrentBlockHeight(height);
    } catch (err) {
      console.error("Error fetching block height:", err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchGameState(), updateBlockHeight()]);
      setLoading(false);
    };

    loadInitialData();
  }, [gameId]);

  // Set up polling for real-time updates
  useEffect(() => {
    if (loading) return;

    // Poll for game state changes every 10 seconds
    const gameInterval = setInterval(fetchGameState, 10000);
    
    // Update block height every 30 seconds
    const blockInterval = setInterval(updateBlockHeight, 30000);

    return () => {
      clearInterval(gameInterval);
      clearInterval(blockInterval);
    };
  }, [loading, gameId]);

  if (loading) {
    return (
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Loading Game...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link
            href="/"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Game Not Found</h1>
          <p className="text-gray-600 mb-8">
            The game with ID {gameId} could not be found.
          </p>
          <Link
            href="/"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  // Get timeout information
  const timeoutInfo = currentBlockHeight > 0 && game["last-move-block"] 
    ? getTimeoutInfo(game, currentBlockHeight) 
    : null;

  // Determine game status
  const getGameStatus = () => {
    if (game.winner) {
      return {
        status: "Game Ended",
        statusColor: "text-red-500",
        description: `Winner: ${game.winner === game["player-one"] ? "Player X" : "Player O"}`,
      };
    } else if (!game["player-two"]) {
      return {
        status: "Waiting for Player",
        statusColor: "text-yellow-500",
        description: "Waiting for second player to join",
      };
    } else if (timeoutInfo?.isTimedOut) {
      return {
        status: "Timed Out",
        statusColor: "text-orange-500",
        description: "Game can be cancelled due to timeout",
      };
    } else {
      return {
        status: "Live Game",
        statusColor: "text-green-500",
        description: `${game["is-player-one-turn"] ? "Player X" : "Player O"}'s turn`,
      };
    }
  };

  const gameStatus = getGameStatus();

  return (
    <div className="w-full max-w-2xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-3xl font-bold">Game #{gameId}</h1>
          <span className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded-full font-medium">
            👀 Spectating
          </span>
          {game && game["bet-amount"] >= 1000000 && (
            <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full font-bold">
              🔥 HIGH STAKES
            </span>
          )}
        </div>
        <p className="text-gray-600">
          Watch this live tic-tac-toe match unfold on the blockchain
        </p>
      </div>

      {/* Game Status */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <div className="text-center">
          <h2 className={`text-xl font-bold ${gameStatus.statusColor} mb-2`}>
            {gameStatus.status}
          </h2>
          <p className="text-gray-600">{gameStatus.description}</p>
          {lastUpdateTime && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {lastUpdateTime}
            </p>
          )}
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-white border rounded-lg p-8">
        <div className="flex justify-center mb-6">
          <GameBoard
            board={game.board}
            cellClassName="size-16 text-4xl font-bold border-2 border-gray-300 rounded-md bg-gray-50 flex items-center justify-center"
          />
        </div>
      </div>

      {/* Game Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Players */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Players</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Player X:</span>
              <span className="text-sm text-gray-600 font-mono">
                {game["player-one"].slice(0, 8)}...{game["player-one"].slice(-4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Player O:</span>
              <span className="text-sm text-gray-600 font-mono">
                {game["player-two"] 
                  ? `${game["player-two"].slice(0, 8)}...${game["player-two"].slice(-4)}`
                  : "Waiting..."
                }
              </span>
            </div>
          </div>
        </div>

        {/* Game Details */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Game Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Stakes:</span>
              <span className="font-bold text-green-600">
                {formatStx(game["bet-amount"])} STX each
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Prize:</span>
              <span className="font-bold text-blue-600">
                {formatStx(game["bet-amount"] * 2)} STX
              </span>
            </div>
            {timeoutInfo && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Timeout:</span>
                <span className={timeoutInfo.isTimedOut ? "text-red-600" : "text-gray-600"}>
                  {timeoutInfo.isTimedOut 
                    ? "⚠️ Timed out" 
                    : `${timeoutInfo.timeoutInMinutes}m remaining`
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Updates Badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live updates every 10 seconds
        </div>
      </div>

      {/* Navigation */}
      <div className="text-center">
        <Link
          href="/"
          className="rounded-lg bg-gray-500 px-6 py-3 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          ← Back to Games List
        </Link>
      </div>
    </div>
  );
}