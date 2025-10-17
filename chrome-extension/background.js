// Background Service Worker for Tic-Tac-Toe Chrome Extension

// Constants
const STORAGE_KEYS = {
    WALLET_ADDRESS: 'wallet_address',
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    LAST_GAMES_CHECK: 'last_games_check',
    KNOWN_GAMES: 'known_games'
};

const STACKS_API_BASE = 'https://api.hiro.so';
const CONTRACT_ADDRESS = 'ST2S0QHZC65P50HFAA2P7GD9CJBT48KDJ9DNYGDSK';
const CONTRACT_NAME = 'tic-tac-toe-v2';

const CHECK_INTERVAL = 30000; // 30 seconds
const NOTIFICATION_TIMEOUT = 10000; // 10 seconds

// State
let monitoringActive = false;
let currentAddress = null;
let knownGames = new Map();

// Initialize background script
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

async function initialize() {
    console.log('TicTacToe Extension: Background script initialized');
    
    // Load stored data
    await loadStoredData();
    
    // Start monitoring if wallet is connected
    if (currentAddress) {
        startMonitoring();
    }
    
    // Set up periodic checks
    chrome.alarms.create('gameMonitor', { periodInMinutes: 0.5 }); // Every 30 seconds
}

// Load stored data
async function loadStoredData() {
    try {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.WALLET_ADDRESS,
            STORAGE_KEYS.NOTIFICATIONS_ENABLED,
            STORAGE_KEYS.KNOWN_GAMES
        ]);
        
        currentAddress = result[STORAGE_KEYS.WALLET_ADDRESS];
        
        if (result[STORAGE_KEYS.KNOWN_GAMES]) {
            knownGames = new Map(JSON.parse(result[STORAGE_KEYS.KNOWN_GAMES]));
        }
    } catch (error) {
        console.error('Error loading stored data:', error);
    }
}

// Save known games to storage
async function saveKnownGames() {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.KNOWN_GAMES]: JSON.stringify([...knownGames])
        });
    } catch (error) {
        console.error('Error saving known games:', error);
    }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.type) {
        case 'WALLET_CONNECTED':
            handleWalletConnected(message.address);
            break;
            
        case 'WALLET_DISCONNECTED':
            handleWalletDisconnected();
            break;
            
        case 'NOTIFICATIONS_TOGGLED':
            handleNotificationsToggled(message.enabled);
            break;
            
        case 'CHECK_GAMES_NOW':
            checkForGameUpdates().then(() => sendResponse({ success: true }));
            return true; // Keep message port open
            
        default:
            console.log('Unknown message type:', message.type);
    }
});

// Handle wallet connection
function handleWalletConnected(address) {
    console.log('Wallet connected:', address);
    currentAddress = address;
    startMonitoring();
}

// Handle wallet disconnection
function handleWalletDisconnected() {
    console.log('Wallet disconnected');
    currentAddress = null;
    stopMonitoring();
    knownGames.clear();
}

// Handle notifications toggle
async function handleNotificationsToggled(enabled) {
    console.log('Notifications toggled:', enabled);
    
    if (enabled && currentAddress) {
        startMonitoring();
    } else {
        stopMonitoring();
    }
}

// Start monitoring games
function startMonitoring() {
    if (monitoringActive || !currentAddress) return;
    
    console.log('Starting game monitoring for:', currentAddress);
    monitoringActive = true;
    
    // Initial check
    checkForGameUpdates();
}

// Stop monitoring games
function stopMonitoring() {
    if (!monitoringActive) return;
    
    console.log('Stopping game monitoring');
    monitoringActive = false;
}

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'gameMonitor' && monitoringActive && currentAddress) {
        checkForGameUpdates();
    }
});

// Check for game updates
async function checkForGameUpdates() {
    if (!currentAddress) return;
    
    try {
        console.log('Checking for game updates...');
        
        // Check if notifications are enabled
        const settings = await chrome.storage.local.get([STORAGE_KEYS.NOTIFICATIONS_ENABLED]);
        const notificationsEnabled = settings[STORAGE_KEYS.NOTIFICATIONS_ENABLED] ?? true;
        
        if (!notificationsEnabled) {
            console.log('Notifications disabled, skipping check');
            return;
        }
        
        // Get latest game ID
        const latestIdResponse = await fetch(
            `${STACKS_API_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-latest-game-id`
        );
        const latestIdData = await latestIdResponse.json();
        const latestId = parseInt(latestIdData.result.replace('u', ''));
        
        // Fetch recent games
        const gamePromises = [];
        const startId = Math.max(0, latestId - 20); // Check last 20 games
        
        for (let i = startId; i <= latestId; i++) {
            gamePromises.push(fetchGame(i));
        }
        
        const allGames = await Promise.all(gamePromises);
        
        // Filter for user's games
        const userGames = allGames.filter(game => 
            game && (game['player-one'] === currentAddress || game['player-two'] === currentAddress)
        );
        
        // Check for new events
        await processGameUpdates(userGames);
        
        console.log(`Checked ${userGames.length} user games`);
        
    } catch (error) {
        console.error('Error checking for game updates:', error);
    }
}

// Process game updates and send notifications
async function processGameUpdates(games) {
    for (const game of games) {
        const gameKey = `game_${game.id}`;
        const previousGame = knownGames.get(gameKey);
        
        if (!previousGame) {
            // New game detected
            knownGames.set(gameKey, game);
            
            if (game['player-two'] && game['player-one'] !== currentAddress) {
                // User joined an existing game
                await sendNotification(
                    'Game Joined! 🎮',
                    `You joined Game #${game.id} with ${formatStx(game['bet-amount'])} STX stakes`,
                    'join',
                    game.id
                );
            } else if (!game['player-two'] && game['player-one'] === currentAddress) {
                // User created a new game
                await sendNotification(
                    'Game Created! ➕',
                    `Game #${game.id} created. Waiting for opponent to join.`,
                    'create',
                    game.id
                );
            }
        } else {
            // Check for game state changes
            await checkGameStateChanges(previousGame, game);
            knownGames.set(gameKey, game);
        }
    }
    
    // Save updated known games
    await saveKnownGames();
}

// Check for specific game state changes
async function checkGameStateChanges(previousGame, currentGame) {
    const gameId = currentGame.id;
    
    // Check if it's now the user's turn
    const isPlayerOne = currentGame['player-one'] === currentAddress;
    const wasUserTurn = (isPlayerOne && previousGame['is-player-one-turn']) || 
                        (!isPlayerOne && !previousGame['is-player-one-turn']);
    const isUserTurn = (isPlayerOne && currentGame['is-player-one-turn']) || 
                       (!isPlayerOne && !currentGame['is-player-one-turn']);
    
    if (!wasUserTurn && isUserTurn && currentGame['player-two']) {
        // It's now the user's turn
        await sendNotification(
            'Your Turn! ⚡',
            `It's your move in Game #${gameId}. Don't keep your opponent waiting!`,
            'turn',
            gameId
        );
    }
    
    // Check if someone joined the user's game
    if (!previousGame['player-two'] && currentGame['player-two'] && 
        currentGame['player-one'] === currentAddress) {
        await sendNotification(
            'Opponent Joined! 🎯',
            `Someone joined your Game #${gameId}. The match has begun!`,
            'opponent-joined',
            gameId
        );
    }
    
    // Check if game ended (winner determined)
    if (!previousGame.winner && currentGame.winner) {
        const userWon = currentGame.winner === currentAddress;
        const prizeAmount = formatStx(currentGame['bet-amount'] * 2);
        
        if (userWon) {
            await sendNotification(
                'You Won! 🏆',
                `Congratulations! You won Game #${gameId} and earned ${prizeAmount} STX!`,
                'win',
                gameId
            );
        } else {
            await sendNotification(
                'Game Over 😔',
                `You lost Game #${gameId}. Better luck next time!`,
                'loss',
                gameId
            );
        }
    }
    
    // Check for timeout warnings (simplified - would need block height tracking)
    // This is a placeholder for timeout logic
    if (isUserTurn && !currentGame.winner) {
        // Could add timeout warning logic here
    }
}

// Send notification
async function sendNotification(title, message, type, gameId) {
    try {
        // Create notification
        const notificationId = `ttt_${type}_${gameId}_${Date.now()}`;
        
        await chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: title,
            message: message,
            priority: 2
        });
        
        console.log('Notification sent:', title);
        
        // Auto-clear notification after timeout
        setTimeout(() => {
            chrome.notifications.clear(notificationId);
        }, NOTIFICATION_TIMEOUT);
        
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('Notification clicked:', notificationId);
    
    // Extract game ID from notification ID
    const parts = notificationId.split('_');
    if (parts.length >= 3) {
        const gameId = parts[2];
        
        // Open game in new tab
        chrome.tabs.create({
            url: `http://localhost:3000/game/${gameId}`
        });
    } else {
        // Open main app
        chrome.tabs.create({
            url: 'http://localhost:3000/'
        });
    }
    
    // Clear the notification
    chrome.notifications.clear(notificationId);
});

// Fetch individual game
async function fetchGame(gameId) {
    try {
        const response = await fetch(
            `${STACKS_API_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-game`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [`u${gameId}`]
                })
            }
        );
        
        const data = await response.json();
        
        if (data.result && data.result !== '(none)') {
            const gameData = parseGameFromContract(data.result);
            return { id: gameId, ...gameData };
        }
        
        return null;
    } catch (error) {
        console.error(`Error fetching game ${gameId}:`, error);
        return null;
    }
}

// Parse game data from contract response
function parseGameFromContract(contractResult) {
    try {
        // Parse player-one
        const playerOneMatch = contractResult.match(/player-one: (ST[A-Z0-9]+)/);
        const playerOne = playerOneMatch ? playerOneMatch[1] : null;
        
        // Parse player-two
        const playerTwoMatch = contractResult.match(/player-two: \(some (ST[A-Z0-9]+)\)|player-two: none/);
        let playerTwo = null;
        if (playerTwoMatch && playerTwoMatch[1]) {
            playerTwo = playerTwoMatch[1];
        }
        
        // Parse turn
        const turnMatch = contractResult.match(/is-player-one-turn: (true|false)/);
        const isPlayerOneTurn = turnMatch ? turnMatch[1] === 'true' : false;
        
        // Parse bet amount
        const betMatch = contractResult.match(/bet-amount: u(\d+)/);
        const betAmount = betMatch ? parseInt(betMatch[1]) : 0;
        
        // Parse winner
        const winnerMatch = contractResult.match(/winner: \(some (ST[A-Z0-9]+)\)|winner: none/);
        let winner = null;
        if (winnerMatch && winnerMatch[1]) {
            winner = winnerMatch[1];
        }
        
        return {
            'player-one': playerOne,
            'player-two': playerTwo,
            'is-player-one-turn': isPlayerOneTurn,
            'bet-amount': betAmount,
            winner: winner
        };
    } catch (error) {
        console.error('Error parsing game data:', error);
        return null;
    }
}

// Utility function to format STX amounts
function formatStx(microStx) {
    const stx = microStx / 1000000;
    return stx.toFixed(2);
}

console.log('TicTacToe Extension: Background script loaded');