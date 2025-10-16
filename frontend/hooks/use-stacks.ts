import { useState, useEffect } from "react";
import {
  connect,
  disconnect,
  isConnected,
  openContractCall,
} from "@stacks/connect";
import { PostConditionMode } from "@stacks/transactions";
import { createNewGame, joinGame, Move, play } from "@/lib/contract";
import { getStxBalance } from "@/lib/stx-utils";

const appDetails = {
  name: "Tic Tac Toe",
  icon: "https://cryptologos.cc/logos/stacks-stx-logo.png",
};

type WalletAddresses =
  | string
  | string[]
  | { mainnet?: string; testnet?: string };

export function useStacks() {
  const [connected, setConnected] = useState(false);
  const [addresses, setAddresses] = useState<string[] | null>(null);
  const [stxBalance, setStxBalance] = useState(0);

  //  Connect wallet using the modern API
  async function connectWallet() {
    if (isConnected()) {
      console.log("Already connected");
      return;
    }

    const response = await connect();
    const addrs: string[] =
      Array.isArray(response.addresses)
        ? response.addresses.map((entry) => String((entry as any).address))
        : typeof response.addresses === "string"
        ? [response.addresses]
        : Object.values(response.addresses ?? {}).map(String);

    setAddresses(addrs);
    setConnected(true);
    console.log("Connected:", addrs);

    // Automatically load balance for the first testnet address
    if (addrs.length > 0) {
      getStxBalance(addrs[0]).then(setStxBalance);
    }
  }

  //  Disconnect wallet
  function disconnectWallet() {
    disconnect();
    setConnected(false);
    setAddresses(null);
    setStxBalance(0);
    console.log("User disconnected");
  }

  //  Create a new game
  async function handleCreateGame(betAmount: number, moveIndex: number, move: Move) {
    if (!connected || !addresses) return alert("Please connect wallet first");
    if (moveIndex < 0 || moveIndex > 8) return alert("Invalid move index");
    if (betAmount === 0) return alert("Please enter a bet amount");

    try {
      const txOptions = await createNewGame(betAmount, moveIndex, move);
      await openContractCall({
        ...txOptions,
        appDetails,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log("Create Game TX:", data);
          alert("Game created successfully!");
        },
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  }

  //  Join an existing game
  async function handleJoinGame(gameId: number, moveIndex: number, move: Move) {
    if (!connected || !addresses) return alert("Please connect wallet first");
    if (moveIndex < 0 || moveIndex > 8) return alert("Invalid move index");

    try {
      const txOptions = await joinGame(gameId, moveIndex, move);
      await openContractCall({
        ...txOptions,
        appDetails,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log("Join Game TX:", data);
          alert("Joined game successfully!");
        },
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  }

  //  Play a move in the game
  async function handlePlayGame(gameId: number, moveIndex: number, move: Move) {
    if (!connected || !addresses) return alert("Please connect wallet first");
    if (moveIndex < 0 || moveIndex > 8) return alert("Invalid move index");

    try {
      const txOptions = await play(gameId, moveIndex, move);
      await openContractCall({
        ...txOptions,
        appDetails,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log("Play Game TX:", data);
          alert("Move played successfully!");
        },
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  }

  //  Check wallet connection status on mount
  useEffect(() => {
    const status = isConnected();
    setConnected(status);
    console.log("Initial wallet status:", status);
  }, []);

  return {
    connected,
    addresses,
    stxBalance,
    connectWallet,
    disconnectWallet,
    handleCreateGame,
    handleJoinGame,
    handlePlayGame,
  };
}
