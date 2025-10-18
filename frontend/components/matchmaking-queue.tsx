"use client";

import { useState, useEffect } from "react";
import { 
  getQueueStatus, 
  getPlayerQueueInfo, 
  joinQueue, 
  leaveQueue, 
  findMatch, 
  QueueStatus, 
  QueuePlayer 
} from "@/lib/contract";
import { useStacks } from "@/hooks/use-stacks";
import { openContractCall } from "@stacks/connect";
import { PostConditionMode } from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

interface MatchmakingQueueProps {
  onMatchFound?: (gameId: number) => void;
}

const appDetails = {
  name: "Tic Tac Toe",
  icon: "https://cryptologos.cc/logos/stacks-stx-logo.png",
};

export default function MatchmakingQueue({ onMatchFound }: MatchmakingQueueProps) {
  const { connected, addresses } = useStacks();
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [playerQueueInfo, setPlayerQueueInfo] = useState<QueuePlayer | null>(null);
  const [betAmount, setBetAmount] = useState<number>(1000000); // Default 1 STX in microSTX
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const currentAddress = addresses?.[0];

  // Fetch queue status and player info
  const fetchQueueData = async () => {
    try {
      const status = await getQueueStatus();
      setQueueStatus(status);

      if (currentAddress) {
        const playerInfo = await getPlayerQueueInfo(currentAddress);
        setPlayerQueueInfo(playerInfo);
      }
    } catch (error) {
      console.error("Error fetching queue data:", error);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchQueueData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchQueueData, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [currentAddress, autoRefresh]);

  const handleJoinQueue = async () => {
    if (!connected || !currentAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (betAmount <= 0) {
      alert("Bet amount must be greater than 0");
      return;
    }

    try {
      setIsLoading(true);
      const txOptions = await joinQueue(betAmount);
      
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          alert("Successfully joined the queue!");
          fetchQueueData();
        },
        onCancel: () => {
          alert("Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error joining queue:", error);
      alert("Failed to join queue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!connected || !currentAddress) return;

    try {
      setIsLoading(true);
      const txOptions = await leaveQueue();
      
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          alert("Successfully left the queue!");
          fetchQueueData();
        },
        onCancel: () => {
          alert("Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error leaving queue:", error);
      alert("Failed to leave queue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindMatch = async () => {
    if (!connected || !currentAddress) return;

    try {
      setIsLoading(true);
      const txOptions = await findMatch();
      
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          alert("Match found! Starting game...");
          if (onMatchFound && data.txId) {
            // In a real app, you'd parse the transaction to get the game ID
            // For now, we'll refresh the queue data
            setTimeout(fetchQueueData, 2000);
          }
        },
        onCancel: () => {
          alert("Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error finding match:", error);
      alert("Failed to find match");
    } finally {
      setIsLoading(false);
    }
  };

  const formatSTX = (microSTX: number): string => {
    return (microSTX / 1000000).toFixed(6);
  };

  if (!connected) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-white">Matchmaking Queue</h3>
        <p className="text-gray-400">Please connect your wallet to join the matchmaking queue.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Matchmaking Queue</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Auto-refresh</label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
        </div>
      </div>

      {/* Queue Status */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-lg font-semibold text-white mb-2">Queue Status</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400">Players in Queue</p>
            <p className="text-2xl font-bold text-green-400">
              {queueStatus?.["queue-size"] ?? "Loading..."}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Your Status</p>
            <p className="text-lg font-semibold text-blue-400">
              {playerQueueInfo ? "In Queue" : "Not in Queue"}
            </p>
          </div>
        </div>
      </div>

      {/* Player Queue Info */}
      {playerQueueInfo && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
          <h4 className="text-lg font-semibold text-blue-400 mb-2">Your Queue Info</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Bet Amount</p>
              <p className="text-white">{formatSTX(playerQueueInfo["bet-amount"])} STX</p>
            </div>
            <div>
              <p className="text-gray-400">Rating</p>
              <p className="text-white">{playerQueueInfo.rating}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue Actions */}
      {!playerQueueInfo ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Bet Amount (STX)
            </label>
            <input
              type="number"
              value={betAmount / 1000000}
              onChange={(e) => setBetAmount(Math.floor(parseFloat(e.target.value || "0") * 1000000))}
              step="0.000001"
              min="0.000001"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter bet amount..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum: 0.000001 STX ({betAmount} microSTX)
            </p>
          </div>
          
          <button
            onClick={handleJoinQueue}
            disabled={isLoading || betAmount <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {isLoading ? "Joining..." : "Join Queue"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={handleLeaveQueue}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Leaving..." : "Leave Queue"}
            </button>
            
            {queueStatus && queueStatus["queue-size"] >= 2 && (
              <button
                onClick={handleFindMatch}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? "Matching..." : "Find Match"}
              </button>
            )}
          </div>
          
          <p className="text-sm text-gray-400 text-center">
            {queueStatus && queueStatus["queue-size"] < 2 
              ? "Waiting for more players to join..."
              : "Ready to find a match!"
            }
          </p>
        </div>
      )}

      {/* Current Queue Players */}
      {queueStatus && queueStatus["queue-players"].length > 0 && (
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-2">Players in Queue</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {queueStatus["queue-players"].map((player, index) => (
              <div
                key={player}
                className={`text-sm p-2 rounded ${
                  player === currentAddress 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-600 text-gray-300"
                }`}
              >
                {index + 1}. {player === currentAddress ? "You" : `${player.slice(0, 8)}...${player.slice(-4)}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}