"use client";

import { useState, useEffect } from "react";
import { DrawGameComponent } from "./draw-game-component";
import { getGame, Game } from "@/lib/contract";
import { useRouter } from "next/navigation";

interface ClientGameWrapperProps {
  initialGame: Game;
  gameId: number;
}

export function ClientGameWrapper({ initialGame, gameId }: ClientGameWrapperProps) {
  const [game, setGame] = useState<Game>(initialGame);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleGameUpdate = async () => {
    setIsRefreshing(true);
    try {
      const updatedGame = await getGame(gameId);
      if (updatedGame) {
        setGame(updatedGame);
      }
    } catch (error) {
      console.error("Error updating game:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNewGame = (newGameId: number) => {
    router.push(`/game/${newGameId}`);
  };

  // Auto-refresh every 10 seconds for active games
  useEffect(() => {
    if (!game.winner && !game["is-draw"]) {
      const interval = setInterval(handleGameUpdate, 10000);
      return () => clearInterval(interval);
    }
  }, [game, gameId]);

  return (
    <div>
      {isRefreshing && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            Updating game...
          </div>
        </div>
      )}
      
      <DrawGameComponent 
        game={game} 
        onGameUpdate={handleGameUpdate}
        onNewGame={handleNewGame}
      />
    </div>
  );
}