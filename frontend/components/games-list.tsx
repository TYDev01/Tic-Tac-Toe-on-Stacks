"use client";

import { Game, getTimeoutInfo, getCurrentBlockHeight } from "@/lib/contract";
import Link from "next/link";
import { GameBoard } from "./game-board";
import { useStacks } from "@/hooks/use-stacks";
import { useMemo, useState, useEffect } from "react";
import { formatStx } from "@/lib/stx-utils";

export function GamesList({ games }: { games: Game[] }) {
  const { addresses } = useStacks();
  
  // Current block height for timeout calculations
  const [currentBlockHeight, setCurrentBlockHeight] = useState(0);

  // Update current block height periodically
  useEffect(() => {
    const updateBlockHeight = async () => {
      const height = await getCurrentBlockHeight();
      setCurrentBlockHeight(height);
    };

    updateBlockHeight();
    // Update every minute for games list
    const interval = setInterval(updateBlockHeight, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Helper function to render timeout badge
  const renderTimeoutBadge = (game: Game) => {
    // Don't show timeout badges for old games without timestamps
    if (!game["player-two"] || game.winner || currentBlockHeight === 0 || !game["last-move-block"] || game["last-move-block"] === 0) {
      return null;
    }
    
    const timeoutInfo = getTimeoutInfo(game, currentBlockHeight);
    
    if (timeoutInfo.isTimedOut) {
      return (
        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
          ⏰ Timed Out
        </span>
      );
    } else if (timeoutInfo.timeoutInMinutes <= 2) {
      return (
        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
          ⚠️ {timeoutInfo.timeoutInMinutes}m left
        </span>
      );
    }
    
    return null;
  };

  // User Games are games in which the user is a player
  // and a winner has not been decided yet
  const userGames = useMemo(() => {
    if (!addresses || addresses.length === 0) return [];
    const userAddress = addresses[0];
    const filteredGames = games.filter(
      (game) =>
        (game["player-one"] === userAddress ||
          game["player-two"] === userAddress) &&
        game.winner === null
    );
    return filteredGames;
  }, [addresses, games]);

  // Joinable games are games in which there still isn't a second player
  // and also the currently logged in user is not the creator of the game
  const joinableGames = useMemo(() => {
    if (!addresses || addresses.length === 0) return [];
    const userAddress = addresses[0];

    return games.filter(
      (game) =>
        game.winner === null &&
        game["player-one"] !== userAddress &&
        game["player-two"] === null
    );
  }, [games, addresses]);

  // Ended games are games in which the winner has been decided
  const endedGames = useMemo(() => {
    return games.filter((game) => game.winner !== null);
  }, [games]);

  return (
    <div className="w-full max-w-4xl space-y-12">
      {addresses && addresses.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Games</h2>
          {userGames.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-gray-500 mb-4">
                You haven&apos;t joined any games yet
              </p>
              <Link
                href="/create"
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create New Game
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-8 max-w-7xl overflow-y-scroll">
              {userGames.map((game, index) => (
                <Link
                  key={`your-game-${index}`}
                  href={`/game/${game.id}`}
                  className="shrink-0 flex flex-col gap-2 border p-4 rounded-md border-gray-700 bg-gray-900 w-fit"
                >
                  <GameBoard
                    key={index}
                    board={game.board}
                    cellClassName="size-8 text-xl"
                  />
                  <div className="text-md px-1 py-0.5 bg-gray-800 rounded text-center w-full">
                    {formatStx(game["bet-amount"])} STX
                  </div>
                  <div className="text-md px-1 py-0.5 bg-gray-800 rounded text-center w-full">
                    Next Turn: {game["is-player-one-turn"] ? "X" : "O"}
                  </div>
                  {renderTimeoutBadge(game) && (
                    <div className="flex justify-center">
                      {renderTimeoutBadge(game)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div>
        <h2 className="text-2xl font-bold mb-4">Joinable Games</h2>
        {joinableGames.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-gray-500 mb-4">
              No joinable games found. Do you want to create a new one?
            </p>
            <Link
              href="/create"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create New Game
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-8 max-w-7xl overflow-y-scroll">
            {joinableGames.map((game, index) => (
              <Link
                key={`joinable-game-${index}`}
                href={`/game/${game.id}`}
                className="shrink-0 flex flex-col gap-2 border p-4 rounded-md border-gray-700 bg-gray-900 w-fit"
              >
                <GameBoard
                  key={index}
                  board={game.board}
                  cellClassName="size-8 text-xl"
                />
                <div className="text-md px-1 py-0.5 bg-gray-800 rounded text-center w-full">
                  {formatStx(game["bet-amount"])} STX
                </div>
                <div className="text-md px-1 py-0.5 bg-gray-800 rounded text-center w-full">
                  Next Turn: {game["is-player-one-turn"] ? "X" : "O"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Ended Games</h2>
        {endedGames.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-gray-500 mb-4">
              No ended games yet. Do you want to create a new one?
            </p>
            <Link
              href="/create"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create New Game
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-8 max-w-7xl overflow-y-scroll">
            {endedGames.map((game, index) => (
              <Link
                key={`ended-game-${index}`}
                href={`/game/${game.id}`}
                className="shrink-0 flex flex-col gap-2 border p-4 rounded-md border-gray-700 bg-gray-900 w-fit"
              >
                <GameBoard
                  key={index}
                  board={game.board}
                  cellClassName="size-8 text-xl"
                />
                <div className="text-md px-1 py-0.5 bg-gray-800 rounded text-center w-full">
                  {formatStx(game["bet-amount"])} STX
                </div>
                <div className="text-md px-1 py-0.5 bg-gray-800 rounded text-center w-full">
                  Winner: {game["is-player-one-turn"] ? "O" : "X"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}