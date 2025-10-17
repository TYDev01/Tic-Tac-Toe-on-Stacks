"use client";

import { useState, useEffect } from "react";
import { Game, Move, playWithStats } from "@/lib/contract";
import { useStacks } from "@/hooks/use-stacks";
import { openContractCall } from "@stacks/connect";
import { PostConditionMode } from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { GameBoard } from "./game-board";

const appDetails = {
  name: "Tic Tac Toe",
  icon: "https://cryptologos.cc/logos/stacks-stx-logo.png",
};

interface EnhancedPlayGameProps {
  game: Game;
  onGameUpdate?: () => void;
}

export function EnhancedPlayGame({ game, onGameUpdate }: EnhancedPlayGameProps) {
  const { connected, addresses } = useStacks();
  const [board, setBoard] = useState(game.board);
  const [playedMoveIndex, setPlayedMoveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const currentAddress = addresses?.[0];
  
  // Reset board when game prop changes
  useEffect(() => {
    setBoard(game.board);
    setPlayedMoveIndex(-1);
  }, [game]);

  if (!connected || !currentAddress) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <p className="text-gray-400 text-center">Please connect your wallet to play</p>
      </div>
    );
  }

  const isPlayerOne = currentAddress === game["player-one"];
  const isPlayerTwo = currentAddress === game["player-two"];
  const isJoinedAlready = isPlayerOne || isPlayerTwo;
  const nextMove = game["is-player-one-turn"] ? Move.X : Move.O;
  const isMyTurn = 
    (game["is-player-one-turn"] && isPlayerOne) ||
    (!game["is-player-one-turn"] && isPlayerTwo);

  // Handle cell click for making a move
  const handleCellClick = async (index: number) => {
    if (!isMyTurn || game.winner || board[index] !== Move.EMPTY || isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Optimistically update the board
      const newBoard = [...board];
      newBoard[index] = nextMove;
      setBoard(newBoard);
      setPlayedMoveIndex(index);

      // Make the move on the blockchain
      const txOptions = await playWithStats(game.id, index, nextMove);
      
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          alert("Move played successfully!");
          if (onGameUpdate) {
            setTimeout(onGameUpdate, 2000); // Give time for blockchain to update
          }
        },
        onCancel: () => {
          // Revert optimistic update
          setBoard(game.board);
          setPlayedMoveIndex(-1);
          alert("Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error playing move:", error);
      // Revert optimistic update
      setBoard(game.board);
      setPlayedMoveIndex(-1);
      alert("Failed to play move");
    } finally {
      setIsLoading(false);
    }
  };

  // Game status messages
  const getGameStatus = () => {
    if (game.winner) {
      if (game.winner === currentAddress) {
        return { message: "🎉 You won!", color: "text-green-400" };
      } else {
        return { message: "😞 You lost", color: "text-red-400" };
      }
    }

    if (!isJoinedAlready) {
      return { message: "You are not a player in this game", color: "text-gray-400" };
    }

    if (isMyTurn) {
      return { message: "Your turn!", color: "text-blue-400" };
    }

    return { message: "Waiting for opponent...", color: "text-yellow-400" };
  };

  const status = getGameStatus();

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="text-center">
        <h3 className={`text-xl font-bold ${status.color}`}>
          {status.message}
        </h3>
        {isLoading && (
          <p className="text-sm text-gray-400 mt-2">Processing move...</p>
        )}
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="bg-gray-800 p-6 rounded-lg">
          <GameBoard 
            board={board} 
            onCellClick={(!isMyTurn || !!game.winner || isLoading) ? undefined : handleCellClick}
          />
        </div>
      </div>

      {/* Game Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-2">Players</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Player 1 (X):</span>
              <span className={`text-sm ${isPlayerOne ? "text-blue-400" : "text-white"}`}>
                {isPlayerOne ? "You" : `${game["player-one"].slice(0, 8)}...${game["player-one"].slice(-4)}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Player 2 (O):</span>
              <span className={`text-sm ${isPlayerTwo ? "text-blue-400" : "text-white"}`}>
                {game["player-two"] 
                  ? (isPlayerTwo ? "You" : `${game["player-two"].slice(0, 8)}...${game["player-two"].slice(-4)}`)
                  : "Waiting..."
                }
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-2">Game Details</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Game ID:</span>
              <span className="text-white">{game.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Bet Amount:</span>
              <span className="text-white">{(game["bet-amount"] / 1000000).toFixed(6)} STX</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Current Turn:</span>
              <span className="text-white">
                {game["is-player-one-turn"] ? "Player 1 (X)" : "Player 2 (O)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Move History */}
      {playedMoveIndex !== -1 && (
        <div className="p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
          <p className="text-blue-400 text-sm">
            Your last move: Position {playedMoveIndex + 1} ({nextMove === Move.X ? "X" : "O"})
          </p>
        </div>
      )}

      {/* Game Instructions */}
      {isJoinedAlready && !game.winner && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">How to Play</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Click on any empty cell to make your move</li>
            <li>• Get three in a row (horizontally, vertically, or diagonally) to win</li>
            <li>• Each move updates your player stats and rating</li>
            <li>• Winners gain rating points, losers lose points</li>
          </ul>
        </div>
      )}
    </div>
  );
}