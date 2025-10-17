"use client";

import { useState, useEffect } from "react";
import MatchmakingQueue from "@/components/matchmaking-queue";
import PlayerRankings from "@/components/player-rankings";
import { getAllGames, Game } from "@/lib/contract";
import { useStacks } from "@/hooks/use-stacks";
import Link from "next/link";

export default function MatchmakingPage() {
  const { connected, addresses } = useStacks();
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentAddress = addresses?.[0];

  // Fetch recent games
  const fetchRecentGames = async () => {
    setIsLoading(true);
    try {
      const allGames = await getAllGames();
      // Get the 5 most recent games involving the current player
      const playerGames = allGames
        .filter(game => 
          currentAddress && (
            game["player-one"] === currentAddress || 
            game["player-two"] === currentAddress
          )
        )
        .sort((a, b) => b.id - a.id) // Sort by game ID (newest first)
        .slice(0, 5);
      
      setRecentGames(playerGames);
    } catch (error) {
      console.error("Error fetching recent games:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (connected && currentAddress) {
      fetchRecentGames();
    }
  }, [connected, currentAddress]);

  const handleMatchFound = (gameId: number) => {
    // Refresh recent games when a match is found
    fetchRecentGames();
  };

  const formatGameResult = (game: Game): { text: string; color: string } => {
    if (!game.winner) {
      return { text: "In Progress", color: "text-blue-400" };
    }
    
    if (game.winner === currentAddress) {
      return { text: "Won", color: "text-green-400" };
    } else {
      return { text: "Lost", color: "text-red-400" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Matchmaking & Rankings</h1>
          <p className="text-gray-400">
            Find opponents, track your progress, and compete for the top spot on the leaderboard!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matchmaking Queue */}
          <div className="lg:col-span-2">
            <MatchmakingQueue onMatchFound={handleMatchFound} />
            
            {/* Recent Games */}
            {connected && currentAddress && (
              <div className="mt-8 bg-gray-800 rounded-lg">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Your Recent Games</h3>
                    <Link 
                      href="/spectate"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      View All Games →
                    </Link>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading games...</p>
                  </div>
                ) : recentGames.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {recentGames.map((game) => {
                      const result = formatGameResult(game);
                      const opponent = game["player-one"] === currentAddress 
                        ? game["player-two"] 
                        : game["player-one"];
                      
                      return (
                        <Link
                          key={game.id}
                          href={`/game/${game.id}`}
                          className="block p-4 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">Game #{game.id}</p>
                              <p className="text-sm text-gray-400">
                                vs {opponent ? `${opponent.slice(0, 8)}...${opponent.slice(-4)}` : "Waiting for opponent"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${result.color}`}>
                                {result.text}
                              </p>
                              <p className="text-sm text-gray-400">
                                {(game["bet-amount"] / 1000000).toFixed(6)} STX
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">No games yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Join the queue to find your first opponent!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Player Rankings Sidebar */}
          <div>
            <PlayerRankings showCurrentPlayer={connected} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/create"
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-center transition-colors"
          >
            <h4 className="font-semibold mb-2">Create Custom Game</h4>
            <p className="text-sm text-blue-100">
              Set your own rules and invite friends
            </p>
          </Link>
          
          <Link
            href="/spectate"
            className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-center transition-colors"
          >
            <h4 className="font-semibold mb-2">Spectate Games</h4>
            <p className="text-sm text-purple-100">
              Watch live games and learn from others
            </p>
          </Link>
          
          <div className="p-4 bg-gray-700 rounded-lg text-center">
            <h4 className="font-semibold mb-2">Coming Soon</h4>
            <p className="text-sm text-gray-400">
              Tournaments and seasonal competitions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}