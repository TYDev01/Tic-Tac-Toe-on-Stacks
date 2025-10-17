import { useState, useEffect } from "react";
import {
  connect,
  disconnect,
  isConnected,
  openContractCall,
} from "@stacks/connect";
import { PostConditionMode } from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";
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

  //  Connect wallet
  async function connectWallet() {
    if (isConnected()) {
      console.log("Already connected");
      return;
    }

    try {
      const response = await connect();
      console.log("Raw connect response:", response);
      handleConnectionResponse(response);
    } catch (connectError) {
      console.error("Connection error:", connectError);
      alert("Failed to connect to wallet. Please make sure you have a compatible Stacks wallet installed and try again.");
    }
  }

  //  Disconnect wallet
  function disconnectWallet() {
    disconnect();
    setConnected(false);
    setAddresses(null);
    setStxBalance(0);
    localStorage.removeItem("stx_addresses");
    console.log("User disconnected");
  }

  //  Helper to store addresses - only Stacks testnet addresses
  function handleConnectionResponse(response: any) {
    console.log("Handling connection response:", response);
    
    let allAddrs: string[] = [];
    
    if (Array.isArray(response.addresses)) {
      allAddrs = response.addresses.map((entry: any) => 
        typeof entry === "string" ? entry : entry.address
      ).filter((addr: any) => typeof addr === "string");
    } else if (typeof response.addresses === "string") {
      allAddrs = [response.addresses];
    } else if (typeof response.addresses === "object" && response.addresses) {
      // Handle object format like { mainnet: "SP...", testnet: "ST..." }
      // Prioritize testnet address if available
      if (response.addresses.testnet && typeof response.addresses.testnet === "string") {
        allAddrs = [response.addresses.testnet];
      } else {
        allAddrs = Object.values(response.addresses).filter((addr): addr is string => 
          typeof addr === "string"
        );
      }
    }

    // Filter for Stacks testnet addresses only (addresses starting with "ST")
    const testnetAddrs = allAddrs.filter(addr => 
      typeof addr === "string" && addr.startsWith("ST")
    );

    console.log("All parsed addresses:", allAddrs);
    console.log("Filtered testnet addresses:", testnetAddrs);
    
    if (testnetAddrs.length > 0) {
      setAddresses(testnetAddrs);
      setConnected(true);
      localStorage.setItem("stx_addresses", JSON.stringify(testnetAddrs));
      console.log("Connection successful, stored testnet addresses:", testnetAddrs);

      // Load balance for the first testnet address
      getStxBalance(testnetAddrs[0]).then(balance => {
        setStxBalance(balance);
        console.log("Testnet balance loaded:", balance);
      }).catch(err => {
        console.error("Error loading balance:", err);
      });
    } else {
      console.error("No valid Stacks testnet addresses found in response");
      alert("Could not find a valid Stacks testnet address (ST...). Please make sure your wallet is configured for Stacks testnet and try again.");
    }
  }

  //  Contract interaction functions
  async function handleCreateGame(betAmount: number, moveIndex: number, move: Move) {
    console.log("handleCreateGame called - state:", { connected, addresses });
    
    if (!connected || !addresses) return alert("Please connect wallet first");
    if (moveIndex < 0 || moveIndex > 8) return alert("Invalid move index");
    if (betAmount === 0) return alert("Please enter a bet amount");

    try {
      const txOptions = await createNewGame(betAmount, moveIndex, move);
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
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

  async function handleJoinGame(gameId: number, moveIndex: number, move: Move) {
    console.log("handleJoinGame called - state:", { connected, addresses });
    
    if (!connected || !addresses) return alert("Please connect wallet first");
    if (moveIndex < 0 || moveIndex > 8) return alert("Invalid move index");

    try {
      const txOptions = await joinGame(gameId, moveIndex, move);
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
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

  async function handlePlayGame(gameId: number, moveIndex: number, move: Move) {
    console.log("handlePlayGame called - state:", { connected, addresses });
    
    if (!connected || !addresses) return alert("Please connect wallet first");
    if (moveIndex < 0 || moveIndex > 8) return alert("Invalid move index");

    try {
      const txOptions = await play(gameId, moveIndex, move);
      await openContractCall({
        ...txOptions,
        appDetails,
        network: STACKS_TESTNET,
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

  //  Auto-reconnect on page reload
  useEffect(() => {
    console.log("useEffect: Checking for stored session or existing connection");
    
    const stored = localStorage.getItem("stx_addresses");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("Found stored addresses:", parsed);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter for testnet addresses only
          const testnetAddrs = parsed.filter((addr: string) => 
            typeof addr === "string" && addr.startsWith("ST")
          );
          
          if (testnetAddrs.length > 0) {
            setAddresses(testnetAddrs);
            setConnected(true);
            
            // Update localStorage with filtered addresses if different
            if (testnetAddrs.length !== parsed.length) {
              localStorage.setItem("stx_addresses", JSON.stringify(testnetAddrs));
              console.log("Updated stored addresses to testnet only:", testnetAddrs);
            }
            
            // Load balance for the first testnet address
            getStxBalance(testnetAddrs[0]).then(balance => {
              setStxBalance(balance);
              console.log("Restored testnet session with balance:", balance);
            }).catch(err => {
              console.error("Error loading stored balance:", err);
            });
          } else {
            console.log("No testnet addresses found in stored session, clearing storage");
            localStorage.removeItem("stx_addresses");
          }
        }
      } catch (err) {
        console.error("Error parsing stored addresses:", err);
        localStorage.removeItem("stx_addresses");
      }
    } else {
      console.log("No stored session found");
    }
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
