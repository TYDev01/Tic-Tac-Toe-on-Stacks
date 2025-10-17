"use client";

import { Game, Move, getTimeoutInfo, canCancelGame, getCurrentBlockHeight } from "@/lib/contract";
import { GameBoard } from "./game-board";
import { abbreviateAddress, explorerAddress, formatStx } from "@/lib/stx-utils";
import Link from "next/link";
import { useStacks } from "@/hooks/use-stacks";
import { useState, useEffect } from "react";

interface PlayGameProps {
  game: Game;
}

export function PlayGame({ game }: PlayGameProps) {
  const { addresses, handleJoinGame, handlePlayGame, handleWithdrawStakes } = useStacks();

  // Initial game board is the current `game.board` state
  const [board, setBoard] = useState(game.board);

  // cell where user played their move. -1 denotes no move has been played
  const [playedMoveIndex, setPlayedMoveIndex] = useState(-1);

  // Current block height for timeout calculations
  const [currentBlockHeight, setCurrentBlockHeight] = useState(0);

  // Update current block height periodically
  useEffect(() => {
    const updateBlockHeight = async () => {
      const height = await getCurrentBlockHeight();
      setCurrentBlockHeight(height);
    };

    updateBlockHeight();
    // Update every 30 seconds
    const interval = setInterval(updateBlockHeight, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // If user is not logged in, don't show anything
  if (!addresses || addresses.length === 0) return null;

  const currentAddress = addresses[0];
  const isPlayerOne = currentAddress === game["player-one"];
  const isPlayerTwo = currentAddress === game["player-two"];

  const isJoinable = game["player-two"] === null && !isPlayerOne;
  const isJoinedAlready = isPlayerOne || isPlayerTwo;
  const nextMove = game["is-player-one-turn"] ? Move.X : Move.O;
  const isMyTurn =
    (game["is-player-one-turn"] && isPlayerOne) ||
    (!game["is-player-one-turn"] && isPlayerTwo);
  const isGameOver = game.winner !== null;

  // Timeout calculations
  const timeoutInfo = currentBlockHeight > 0 ? getTimeoutInfo(game, currentBlockHeight) : null;
  const canCancel = currentBlockHeight > 0 ? canCancelGame(game, currentAddress, currentBlockHeight) : false;
  // Only show timeout info for games with timestamps (new games)
  const showTimeoutInfo = game["player-two"] && !isGameOver && timeoutInfo && game["last-move-block"] > 0;

  function onCellClick(index: number) {
    const tempBoard = [...board];
    tempBoard[index] = nextMove;
    setBoard(tempBoard);
    setPlayedMoveIndex(index);
  }

  return (
    <>
      <GameBoard
        board={board}
        onCellClick={onCellClick}
        nextMove={nextMove}
        cellClassName="size-32 text-6xl"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Bet Amount: </span>
          <span>{formatStx(game["bet-amount"])} STX</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Player One: </span>
          <Link
            href={explorerAddress(game["player-one"])}
            target="_blank"
            className="hover:underline"
          >
            {abbreviateAddress(game["player-one"])}
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Player Two: </span>
          {game["player-two"] ? (
            <Link
              href={explorerAddress(game["player-two"])}
              target="_blank"
              className="hover:underline"
            >
              {abbreviateAddress(game["player-two"])}
            </Link>
          ) : (
            <span>Nobody</span>
          )}
        </div>

        {game["winner"] && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">Winner: </span>
            <Link
              href={explorerAddress(game["winner"])}
              target="_blank"
              className="hover:underline"
            >
              {abbreviateAddress(game["winner"])}
            </Link>
          </div>
        )}

        {showTimeoutInfo && timeoutInfo && (
          <div className="flex flex-col gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <span className="text-yellow-700 font-medium">Game Timeout:</span>
              {timeoutInfo.isTimedOut ? (
                <span className="text-red-600 font-medium">⏰ TIMED OUT</span>
              ) : (
                <span className="text-yellow-600">
                  {timeoutInfo.timeoutInMinutes}m remaining
                </span>
              )}
            </div>
            {timeoutInfo.isTimedOut && canCancel && (
              <div className="text-sm text-yellow-700">
                ✅ Your opponent didn't move in time! You can now withdraw all stakes ({formatStx(game["bet-amount"] * 2)} STX) below.
              </div>
            )}
            {timeoutInfo.isTimedOut && !canCancel && (
              <div className="text-sm text-yellow-700">
                ⏱️ Game timed out. The waiting player can withdraw all stakes.
              </div>
            )}
            {!timeoutInfo.isTimedOut && (
              <div className="text-sm text-yellow-700">
                ⏳ If your opponent doesn't move within {timeoutInfo.timeoutInMinutes} minutes, you'll be able to withdraw all stakes ({formatStx(game["bet-amount"] * 2)} STX).
              </div>
            )}
          </div>
        )}
      </div>

      {isJoinable && (
        <button
          onClick={() => handleJoinGame(game.id, playedMoveIndex, nextMove)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Join Game
        </button>
      )}

      {isMyTurn && (
        <button
          onClick={() => handlePlayGame(game.id, playedMoveIndex, nextMove)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Play
        </button>
      )}

      {isJoinedAlready && !isMyTurn && !isGameOver && (
        <div className="text-gray-500">Waiting for opponent to play...</div>
      )}

      {canCancel && (
        <div className="flex flex-col items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-700 text-center">
            🎉 Opponent didn't move within 5 minutes!
            <br />
            You can withdraw <span className="font-bold">{formatStx(game["bet-amount"] * 2)} STX</span> (both stakes)
          </div>
          <button
            onClick={() => handleWithdrawStakes(game.id)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            💰 Withdraw Stakes ({formatStx(game["bet-amount"] * 2)} STX)
          </button>
        </div>
      )}
    </>
  );
}