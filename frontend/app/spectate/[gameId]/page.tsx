"use client";

import { SpectateGame } from "@/components/spectate-game";

export default function SpectatePage({
  params,
}: {
  params: { gameId: string };
}) {
  const gameId = parseInt(params.gameId, 10);
  
  if (isNaN(gameId)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Invalid Game ID</h1>
          <p className="text-gray-600 mb-8">
            The game ID provided is not valid.
          </p>
          <a
            href="/"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Back to Games
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <SpectateGame gameId={gameId} />
    </div>
  );
}