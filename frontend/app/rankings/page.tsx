"use client";

import PlayerRankings from "@/components/player-rankings";
import Link from "next/link";

export default function RankingsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-4">Player Rankings</h1>
              <p className="text-gray-400">
                See where you stand among the top Tic-Tac-Toe players on Stacks!
              </p>
            </div>
            <Link
              href="/matchmaking"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Join Queue
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <PlayerRankings showCurrentPlayer={true} />
        </div>

        {/* Additional Statistics */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">About the Rating System</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">How Ratings Work</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <p>
                  • <strong>Starting Rating:</strong> All players begin with a 1200 rating
                </p>
                <p>
                  • <strong>ELO System:</strong> Win against higher-rated players to gain more points
                </p>
                <p>
                  • <strong>K-Factor:</strong> Rating changes are calculated with a K-factor of 32
                </p>
                <p>
                  • <strong>Minimum Rating:</strong> Players cannot drop below 800 rating
                </p>
                <p>
                  • <strong>Draws:</strong> No rating change occurs in drawn games
                </p>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-4">Ranking Benefits</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <p>
                  • <strong>Prestige:</strong> Show off your skill level with rank titles
                </p>
                <p>
                  • <strong>Fair Matches:</strong> Matchmaking considers player ratings
                </p>
                <p>
                  • <strong>Progress Tracking:</strong> See your improvement over time
                </p>
                <p>
                  • <strong>Competitive Spirit:</strong> Climb the leaderboard
                </p>
                <p>
                  • <strong>Bragging Rights:</strong> Prove you're the ultimate strategist
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">🏆 Competitive Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-gray-800/50 rounded">
                <p className="text-purple-400 font-semibold">Real-time Rankings</p>
                <p className="text-gray-400 mt-1">Updated with every game</p>
              </div>
              <div className="text-center p-4 bg-gray-800/50 rounded">
                <p className="text-blue-400 font-semibold">Win Rate Tracking</p>
                <p className="text-gray-400 mt-1">Detailed performance stats</p>
              </div>
              <div className="text-center p-4 bg-gray-800/50 rounded">
                <p className="text-green-400 font-semibold">Skill-based Matching</p>
                <p className="text-gray-400 mt-1">Play against similar opponents</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}