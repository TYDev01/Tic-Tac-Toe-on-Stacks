import { GamesList } from "@/components/games-list";
import { getAllGames } from "@/lib/contract";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const games = await getAllGames();

  return (
    <section className="flex flex-col items-center py-20">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Tic Tac Toe 🎲</h1>
        <p className="text-xl text-gray-400 mb-2">
          Competitive Tic-Tac-Toe on the Stacks blockchain
        </p>
        <p className="text-sm text-gray-500">
          Play ranked matches, climb the leaderboard, and earn your place among the top players!
        </p>
      </div>

      {/* Featured Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-4xl w-full px-4">
        <Link
          href="/matchmaking"
          className="group p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-center text-white">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-bold mb-2">Ranked Matchmaking</h3>
            <p className="text-sm text-blue-100">
              Join the queue and get matched with players of similar skill level
            </p>
          </div>
        </Link>
        
        <Link
          href="/rankings"
          className="group p-6 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-center text-white">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-lg font-bold mb-2">Leaderboard</h3>
            <p className="text-sm text-yellow-100">
              View rankings, track your progress, and compete for the top spot
            </p>
          </div>
        </Link>
        
        <Link
          href="/create"
          className="group p-6 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all duration-300 transform hover:scale-105"
        >
          <div className="text-center text-white">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-bold mb-2">Quick Match</h3>
            <p className="text-sm text-purple-100">
              Create a custom game with your own rules and bet amount
            </p>
          </div>
        </Link>
      </div>

      {/* Features Overview */}
      <div className="mb-16 max-w-4xl w-full px-4">
        <h2 className="text-2xl font-bold text-center text-white mb-8">New Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-green-400 mb-3">🎮 ELO Rating System</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Win/Loss tracking with detailed statistics</li>
              <li>• Dynamic ELO ratings that reflect your skill</li>
              <li>• Rank titles from Novice to Grandmaster</li>
              <li>• Fair matchmaking based on player ratings</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">⚡ Smart Matchmaking</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Automatic opponent matching system</li>
              <li>• Queue-based game creation</li>
              <li>• Real-time queue status updates</li>
              <li>• Skill-based opponent selection</li>
            </ul>
          </div>
        </div>
      </div>

      <div id="live-games">
        <GamesList games={games} />
      </div>
    </section>
  );
}