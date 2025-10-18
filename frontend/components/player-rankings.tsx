"use client";

import { useState, useEffect } from "react";
import { 
  getPlayerStats, 
  getLeaderboard, 
  PlayerStats, 
  calculateWinRate, 
  getRankTitle,
  getRatingChange 
} from "@/lib/contract";
import { useStacks } from "@/hooks/use-stacks";

interface PlayerRankingsProps {
  showCurrentPlayer?: boolean;
}

export default function PlayerRankings({ showCurrentPlayer = true }: PlayerRankingsProps) {
  const { connected, addresses } = useStacks();
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<string[]>([]);
  const [playerStatsMap, setPlayerStatsMap] = useState<{ [key: string]: PlayerStats }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const currentAddress = addresses?.[0];

  // Fetch player stats and leaderboard
  const fetchRankingData = async () => {
    setIsLoading(true);
    try {
      // Fetch current player stats
      if (currentAddress && showCurrentPlayer) {
        const stats = await getPlayerStats(currentAddress);
        setPlayerStats(stats);
      }

      // Fetch leaderboard
      const board = await getLeaderboard();
      setLeaderboard(board);

      // Fetch stats for all leaderboard players
      const statsMap: { [key: string]: PlayerStats } = {};
      for (const playerAddress of board) {
        const stats = await getPlayerStats(playerAddress);
        if (stats) {
          statsMap[playerAddress] = stats;
        }
      }
      setPlayerStatsMap(statsMap);
    } catch (error) {
      console.error("Error fetching ranking data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchRankingData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchRankingData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [currentAddress, autoRefresh]);

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  const sortedLeaderboard = leaderboard
    .filter(address => playerStatsMap[address])
    .sort((a, b) => {
      const statsA = playerStatsMap[a];
      const statsB = playerStatsMap[b];
      
      // Sort by rating first, then by games played
      if (statsA.rating !== statsB.rating) {
        return statsB.rating - statsA.rating;
      }
      return statsB["games-played"] - statsA["games-played"];
    });

  return (
    <div className="space-y-6">
      {/* Auto-refresh toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Player Rankings</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Auto-refresh</label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <button
            onClick={fetchRankingData}
            disabled={isLoading}
            className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Current Player Stats */}
      {connected && currentAddress && playerStats && showCurrentPlayer && (
        <div className="p-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">Your Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{playerStats.wins}</p>
              <p className="text-sm text-gray-400">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{playerStats.losses}</p>
              <p className="text-sm text-gray-400">Losses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{playerStats.draws}</p>
              <p className="text-sm text-gray-400">Draws</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{playerStats["games-played"]}</p>
              <p className="text-sm text-gray-400">Total Games</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800 rounded">
              <p className="text-xl font-bold text-purple-400">{playerStats.rating}</p>
              <p className="text-sm text-gray-400">Rating</p>
              <p className="text-xs text-purple-300">{getRankTitle(playerStats.rating)}</p>
            </div>
            <div className="text-center p-3 bg-gray-800 rounded">
              <p className="text-xl font-bold text-cyan-400">
                {playerStats["games-played"] > 0 ? calculateWinRate(playerStats).toFixed(1) : "0.0"}%
              </p>
              <p className="text-sm text-gray-400">Win Rate</p>
            </div>
            <div className="text-center p-3 bg-gray-800 rounded">
              <p className="text-sm text-gray-400">Rank</p>
              <p className="text-lg font-bold text-orange-400">
                {sortedLeaderboard.findIndex(addr => addr === currentAddress) + 1 || "Unranked"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Not Connected Message */}
      {!connected && showCurrentPlayer && (
        <div className="p-4 bg-gray-800 rounded-lg text-center">
          <p className="text-gray-400">Connect your wallet to view your stats</p>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-700 border-b border-gray-600">
          <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
          <p className="text-sm text-gray-400">Top players by rating</p>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading rankings...</p>
          </div>
        ) : sortedLeaderboard.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {sortedLeaderboard.map((address, index) => {
              const stats = playerStatsMap[address];
              const isCurrentPlayer = address === currentAddress;
              
              return (
                <div
                  key={address}
                  className={`p-4 border-b border-gray-700 last:border-b-0 ${
                    isCurrentPlayer 
                      ? "bg-blue-900/30 border-blue-500" 
                      : "hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-yellow-500 text-yellow-900" :
                        index === 1 ? "bg-gray-400 text-gray-900" :
                        index === 2 ? "bg-amber-600 text-amber-100" :
                        "bg-gray-600 text-white"
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${isCurrentPlayer ? "text-blue-400" : "text-white"}`}>
                            {isCurrentPlayer ? "You" : formatAddress(address)}
                          </p>
                          <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded">
                            {getRankTitle(stats.rating)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {stats["games-played"]} games • {calculateWinRate(stats).toFixed(1)}% win rate
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-400">{stats.rating}</p>
                      <p className="text-sm text-gray-400">
                        {stats.wins}W-{stats.losses}L-{stats.draws}D
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-400">No ranked players yet</p>
            <p className="text-sm text-gray-500">Play some games to appear on the leaderboard!</p>
          </div>
        )}
      </div>

      {/* Rating Legend */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Rating System</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-700 rounded">
            <p className="text-red-400 font-semibold">Novice</p>
            <p className="text-gray-400">&lt; 1200</p>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <p className="text-orange-400 font-semibold">Beginner</p>
            <p className="text-gray-400">1200-1399</p>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <p className="text-yellow-400 font-semibold">Intermediate</p>
            <p className="text-gray-400">1400-1599</p>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <p className="text-green-400 font-semibold">Advanced</p>
            <p className="text-gray-400">1600-1799</p>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <p className="text-blue-400 font-semibold">Expert</p>
            <p className="text-gray-400">1800-1999</p>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <p className="text-purple-400 font-semibold">Master</p>
            <p className="text-gray-400">2000-2199</p>
          </div>
          <div className="text-center p-2 bg-gray-700 rounded">
            <p className="text-pink-400 font-semibold">Grandmaster</p>
            <p className="text-gray-400">2200+</p>
          </div>
        </div>
      </div>
    </div>
  );
}