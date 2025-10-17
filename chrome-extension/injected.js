// Injected Script for Tic-Tac-Toe Chrome Extension
// This script runs in the page context and can access window.StacksProvider

console.log('TicTacToe Extension: Injected script loaded');

// Extension communication handler
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'TTT_EXTENSION_MESSAGE') {
        const { messageId, action, data } = event.data;
        
        console.log('Injected script received message:', action, data);
        
        let response;
        
        try {
            switch (action) {
                case 'CONNECT_WALLET':
                    response = await handleConnectWallet();
                    break;
                    
                case 'CREATE_GAME':
                    response = await handleCreateGame(data.stakeAmount, data.movePosition);
                    break;
                    
                default:
                    response = { success: false, error: 'Unknown action' };
            }
        } catch (error) {
            console.error('Error in injected script:', error);
            response = { success: false, error: error.message };
        }
        
        // Send response back
        window.postMessage({
            messageId,
            response
        }, '*');
    }
});

// Handle wallet connection
async function handleConnectWallet() {
    try {
        // Check if Stacks wallet provider is available
        if (!window.StacksProvider) {
            throw new Error('No Stacks wallet provider found. Please install a Stacks wallet.');
        }
        
        // Request wallet connection
        const authResponse = await window.StacksProvider.transactionRequest({
            txType: 'auth'
        });
        
        if (authResponse && authResponse.addresses && authResponse.addresses.testnet) {
            const address = authResponse.addresses.testnet;
            
            // Filter to ST addresses only (Stacks testnet)
            if (address.startsWith('ST')) {
                return {
                    success: true,
                    address: address
                };
            } else {
                throw new Error('Please connect a Stacks testnet address (ST format)');
            }
        } else {
            throw new Error('Failed to get wallet address');
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Handle game creation
async function handleCreateGame(stakeAmount, movePosition) {
    try {
        // Check if wallet is connected
        if (!window.StacksProvider) {
            throw new Error('Wallet not connected');
        }
        
        // Contract details
        const contractAddress = 'ST2S0QHZC65P50HFAA2P7GD9CJBT48KDJ9DNYGDSK';
        const contractName = 'tic-tac-toe-v2';
        const functionName = 'create-game';
        
        // Create transaction
        const txOptions = {
            contractAddress,
            contractName,
            functionName,
            functionArgs: [
                { type: 'uint', value: stakeAmount },
                { type: 'uint', value: movePosition },
                { type: 'uint', value: 1 } // Player X move
            ],
            fee: 2000, // 0.002 STX
            postConditionMode: 0x01, // Allow any post conditions
            network: 'testnet'
        };
        
        // Send transaction
        const result = await window.StacksProvider.transactionRequest(txOptions);
        
        if (result && result.txId) {
            // For now, we don't have the game ID immediately
            // In a real implementation, you'd parse the transaction result
            const gameId = Math.floor(Date.now() / 1000); // Placeholder
            
            return {
                success: true,
                txId: result.txId,
                gameId: gameId
            };
        } else {
            throw new Error('Transaction failed');
        }
    } catch (error) {
        console.error('Game creation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to check if we're on the right network
function isTestnetConnected() {
    // This would check the current network in a real implementation
    return true; // Simplified for now
}

console.log('TicTacToe Extension: Injected script ready');