"use client";

import { useState, useEffect } from "react";
import { Game, Move, playWithStats, joinGame, quitDraw, rematch, getGameResult, canRematchOrQuit } from "@/lib/contract";
import { useStacks } from "@/hooks/use-stacks";
import { openContractCall } from "@stacks/connect";
import { PostConditionMode } from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
import { GameBoard } from "./game-board";

const appDetails = {
  name: "Tic Tac Toe",
  icon: "https://cryptologos.cc/logos/stacks-stx-logo.png",
};

interface DrawGameProps {
  game: Game;
  onGameUpdate?: () => void;
  onNewGame?: (gameId: number) => void;
}

export function DrawGameComponent({ game, onGameUpdate, onNewGame }: DrawGameProps) {
  const { connected, addresses } = useStacks();
  const [board, setBoard] = useState(game.board);
  const [playedMoveIndex, setPlayedMoveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"quit" | "rematch" | null>(null);

  const currentAddress = addresses?.[0];
  
  // Reset board when game prop changes
  useEffect(() => {
    setBoard(game.board);
    setPlayedMoveIndex(-1);
  }, [game]);

  if (!connected || !currentAddress) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <p className="text-gray-400 text-center">Please connect your wallet to view game</p>
      </div>
    );
  }

  const isPlayerOne = currentAddress === game["player-one"];
  const isPlayerTwo = currentAddress === game["player-two"];
  const canJoinAsPlayerTwo = !game["player-two"] && !isPlayerOne;
  const isJoinedAlready = isPlayerOne || isPlayerTwo;
  const nextMove = game["is-player-one-turn"] ? Move.X : Move.O;
  const isMyTurn = 
    (game["is-player-one-turn"] && isPlayerOne) ||
    (!game["is-player-one-turn"] && isPlayerTwo) ||
    canJoinAsPlayerTwo;

  // Handle cell click for making a move or joining the game
  const handleCellClick = async (index: number) => {
    console.log("Cell clicked:", index, {
      isMyTurn,
      gameWinner: game.winner,
      isDraw: game["is-draw"],
      cellEmpty: board[index] === Move.EMPTY,
      isLoading,
      currentMove: nextMove,
      canJoinAsPlayerTwo
    });
    
    if (!isMyTurn || game.winner || game["is-draw"] || board[index] !== Move.EMPTY || isLoading) {
      console.log("Click blocked - conditions not met");
      return;
    }

    try {
      setIsLoading(true);
      
      // Optimistically update the board
      const newBoard = [...board];
      newBoard[index] = nextMove;
      setBoard(newBoard);
      setPlayedMoveIndex(index);

      // Choose the right function based on whether we're joining or playing
      const txOptions = canJoinAsPlayerTwo 
        ? await joinGame(game.id, index, Move.O) // Second player always plays O
        : await playWithStats(game.id, index, nextMove);
      
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          alert(canJoinAsPlayerTwo ? "Joined game successfully!" : "Move played successfully!");
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

  // Handle quit draw
  const handleQuitDraw = async () => {
    if (!canRematchOrQuit(game)) return;

    try {
      setActionLoading("quit");
      const txOptions = await quitDraw(game.id);
      
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          alert("Stakes claimed successfully! Both players have received their STX back.");
          if (onGameUpdate) {
            setTimeout(onGameUpdate, 2000);
          }
        },
        onCancel: () => {
          alert("Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error quitting draw:", error);
      alert("Failed to quit game");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle rematch
  const handleRematch = async () => {
    if (!canRematchOrQuit(game)) return;

    try {
      setActionLoading("rematch");
      const txOptions = await rematch(game.id);
      
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          alert("Rematch created successfully! A new game has been started.");
          if (onNewGame && data.txId) {
            // In a real implementation, you'd parse the transaction to get the new game ID
            // For now, we'll trigger a refresh
            setTimeout(() => {
              if (onGameUpdate) onGameUpdate();
            }, 2000);
          }
        },
        onCancel: () => {
          alert("Transaction cancelled");
        },
      });
    } catch (error) {
      console.error("Error creating rematch:", error);
      alert("Failed to create rematch");
    } finally {
      setActionLoading(null);
    }
  };

  // Game status messages
  const gameResult = getGameResult(game, currentAddress);

  return (
    <div className="space-y-6">
      {/* Game Status */}
      <div className="text-center">
        <h3 className={`text-xl font-bold ${gameResult.color}`}>
          {gameResult.message}
        </h3>
        {isLoading && (
          <p className="text-sm text-gray-400 mt-2">Processing move...</p>
        )}
        
        {/* Turn indicator for active games */}
        {!game.winner && !game["is-draw"] && (
          <div className="mt-3 p-3 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300">
              {canJoinAsPlayerTwo ? (
                <>
                  <span className="text-blue-400 font-semibold">Join the game!</span>
                  <br />
                  Click on any empty cell to join as Player 2 (O)
                </>
              ) : isMyTurn ? (
                <>
                  <span className="text-green-400 font-semibold">Your turn!</span>
                  <br />
                  Click on any empty cell to play as {nextMove === Move.X ? "X" : "O"}
                </>
              ) : (
                <>
                  <span className="text-orange-400">Waiting for opponent...</span>
                  <br />
                  {game["is-player-one-turn"] ? "Player 1" : "Player 2"} is thinking
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="bg-gray-800 p-6 rounded-lg">
          <GameBoard 
            board={board} 
            onCellClick={(!isMyTurn || !!game.winner || game["is-draw"] || isLoading) ? undefined : handleCellClick}
            cellClassName="size-32 text-6xl"
            nextMove={nextMove}
          />
        </div>
      </div>

      {/* Draw Actions - Show rematch/quit buttons for draws */}
      {game["is-draw"] && canRematchOrQuit(game) && isJoinedAlready && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6">
          <div className="text-center mb-4">
            <h4 className="text-lg font-semibold text-yellow-400 mb-2">
              🤝 Game Ended in a Draw!
            </h4>
            <p className="text-sm text-gray-300">
              The board is full and no one won. You can either quit to claim your stakes back, 
              or rematch for another round with the same opponent.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleQuitDraw}
              disabled={!!actionLoading}
              className="flex-1 sm:flex-none px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {actionLoading === "quit" ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Claiming Stakes...
                </span>
              ) : (
                "💰 Quit & Claim Stakes"
              )}
            </button>
            
            <button
              onClick={handleRematch}
              disabled={!!actionLoading}
              className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {actionLoading === "rematch" ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Rematch...
                </span>
              ) : (
                "🔄 Rematch"
              )}
            </button>
          </div>
          
          <div className="mt-4 text-xs text-gray-400 text-center">
            <p>
              <strong>Quit:</strong> Both players get their {(game["bet-amount"] / 1000000).toFixed(6)} STX back
            </p>
            <p>
              <strong>Rematch:</strong> Start a new game with the same bet amount ({(game["bet-amount"] / 1000000).toFixed(6)} STX each)
            </p>
          </div>
        </div>
      )}

      {/* Draw Already Resolved */}
      {game["is-draw"] && game["draw-resolved"] && (
        <div className="bg-gray-700 border border-gray-500 rounded-lg p-4 text-center">
          <p className="text-gray-400">
            ✅ This draw has been resolved. Stakes have been returned to both players.
          </p>
        </div>
      )}

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
              <span className="text-gray-400">Status:</span>
              <span className={gameResult.color}>
                {game["is-draw"] ? "Draw" : 
                 game.winner ? "Finished" : 
                 game["is-player-one-turn"] ? "Player 1's Turn" : "Player 2's Turn"}
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

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
          <h4 className="text-sm font-semibold text-red-400 mb-2">Debug Info</h4>
          <div className="text-xs text-red-300 space-y-1">
            <div>Connected: {connected ? "Yes" : "No"}</div>
            <div>Current Address: {currentAddress?.slice(0, 8)}...{currentAddress?.slice(-4)}</div>
            <div>Is Player One: {isPlayerOne ? "Yes" : "No"}</div>
            <div>Is Player Two: {isPlayerTwo ? "Yes" : "No"}</div>
            <div>Can Join as Player Two: {canJoinAsPlayerTwo ? "Yes" : "No"}</div>
            <div>Is My Turn: {isMyTurn ? "Yes" : "No"}</div>
            <div>Game Winner: {game.winner || "None"}</div>
            <div>Is Draw: {game["is-draw"] ? "Yes" : "No"}</div>
            <div>Is Loading: {isLoading ? "Yes" : "No"}</div>
            <div>Next Move: {nextMove}</div>
            <div>Player One Turn: {game["is-player-one-turn"] ? "Yes" : "No"}</div>
          </div>
        </div>
      )}

      {/* Waiting for Player 2 */}
      {!game["player-two"] && !canJoinAsPlayerTwo && (
        <div className="p-4 bg-blue-900/20 border border-blue-500 rounded-lg text-center">
          <h4 className="text-lg font-semibold text-blue-400 mb-2">
            ⏳ Waiting for Second Player
          </h4>
          <p className="text-sm text-gray-300 mb-2">
            This game is waiting for a second player to join.
          </p>
          <p className="text-xs text-gray-400">
            Share this game link with a friend, or they can join through the matchmaking queue!
          </p>
        </div>
      )}

      {/* Game Instructions */}
      {(isJoinedAlready || canJoinAsPlayerTwo) && !game.winner && !game["is-draw"] && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">How to Play</h4>
          <ul className="text-xs text-gray-500 space-y-1">
            {canJoinAsPlayerTwo ? (
              <>
                <li>• Click on any empty cell to join the game as Player 2 (O)</li>
                <li>• You'll need to stake {(game["bet-amount"] / 1000000).toFixed(6)} STX to join</li>
                <li>• Once joined, take turns with Player 1 to get three in a row</li>
              </>
            ) : (
              <>
                <li>• Click on any empty cell to make your move</li>
                <li>• Get three in a row (horizontally, vertically, or diagonally) to win</li>
                <li>• If all cells are filled without a winner, the game is a draw</li>
                <li>• In a draw, you can quit to get your stakes back or rematch</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}