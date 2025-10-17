"use client";

import { useStacks } from "@/hooks/use-stacks";
import { abbreviateAddress } from "@/lib/stx-utils";
import Link from "next/link";

export function Navbar() {
  const { connected, addresses, connectWallet, disconnectWallet } = useStacks();

  const primaryAddress = addresses?.[0]; // usually testnet address

  return (
    <nav className="flex w-full items-center justify-between gap-4 p-4 h-16 border-b border-gray-500">
      <Link href="/" className="text-2xl font-bold">
        TicTacToe 🎲
      </Link>

      <div className="flex items-center gap-6">
        <Link href="/" className="text-gray-300 hover:text-gray-50">
          Home
        </Link>
        <Link 
          href="/matchmaking" 
          className="text-blue-300 hover:text-blue-100 font-medium"
          title="Find opponents and play ranked matches"
        >
          🎯 Matchmaking
        </Link>
        <Link 
          href="/rankings" 
          className="text-yellow-300 hover:text-yellow-100 font-medium"
          title="View player rankings and leaderboard"
        >
          🏆 Rankings
        </Link>
        <Link href="/create" className="text-gray-300 hover:text-gray-50">
          Create Game
        </Link>
        <Link 
          href="/spectate" 
          className="text-purple-300 hover:text-purple-100 font-medium"
          title="Watch live games"
        >
          👀 Spectate
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {connected && primaryAddress ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {abbreviateAddress(primaryAddress)}
            </button>
            <button
              type="button"
              onClick={disconnectWallet}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={connectWallet}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
