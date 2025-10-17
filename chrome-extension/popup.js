// Popup JavaScript for Tic-Tac-Toe Chrome Extension

// Constants
const STORAGE_KEYS = {
    WALLET_ADDRESS: 'wallet_address',
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    LAST_GAMES_CHECK: 'last_games_check'
};

const STACKS_API_BASE = 'https://api.hiro.so';
const CONTRACT_ADDRESS = 'ST2S0QHZC65P50HFAA2P7GD9CJBT48KDJ9DNYGDSK';
const CONTRACT_NAME = 'tic-tac-toe-v2';

// DOM Elements
const elements = {
    // Status
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    
    // Wallet
    walletDisconnected: document.getElementById('walletDisconnected'),
    walletConnected: document.getElementById('walletConnected'),
    walletAddress: document.getElementById('walletAddress'),
    walletBalance: document.getElementById('walletBalance'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    
    // Actions
    createGameBtn: document.getElementById('createGameBtn'),
    joinGameBtn: document.getElementById('joinGameBtn'),
    spectateBtn: document.getElementById('spectateBtn'),
    openAppBtn: document.getElementById('openAppBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    
    // Games
    gamesLoading: document.getElementById('gamesLoading'),
    gamesEmpty: document.getElementById('gamesEmpty'),
    gamesList: document.getElementById('gamesList'),
    
    // Modal
    createGameModal: document.getElementById('createGameModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelCreateBtn: document.getElementById('cancelCreateBtn'),
    confirmCreateBtn: document.getElementById('confirmCreateBtn'),
    stakeAmount: document.getElementById('stakeAmount'),
    selectedPosition: document.getElementById('selectedPosition'),
    
    // Settings
    notificationsToggle: document.getElementById('notificationsToggle')
};

// State
let currentAddress = null;
let currentBalance = 0;
let games = [];
let selectedMovePosition = 4; // Default to center

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadStoredData();
    setupEventListeners();
    await checkWalletConnection();
    await loadGames();
});

// Load stored data from chrome storage
async function loadStoredData() {
    try {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.WALLET_ADDRESS,
            STORAGE_KEYS.NOTIFICATIONS_ENABLED
        ]);
        
        currentAddress = result[STORAGE_KEYS.WALLET_ADDRESS];
        
        const notificationsEnabled = result[STORAGE_KEYS.NOTIFICATIONS_ENABLED] ?? true;
        elements.notificationsToggle.checked = notificationsEnabled;
    } catch (error) {
        console.error('Error loading stored data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Wallet actions
    elements.connectBtn.addEventListener('click', connectWallet);
    elements.disconnectBtn.addEventListener('click', disconnectWallet);
    
    // Add second open app button
    const openAppBtn2 = document.getElementById('openAppBtn2');
    if (openAppBtn2) {
        openAppBtn2.addEventListener('click', openFullApp);
    }
    
    // Quick actions
    elements.createGameBtn.addEventListener('click', showCreateGameModal);
    elements.joinGameBtn.addEventListener('click', openJoinGames);
    elements.spectateBtn.addEventListener('click', openSpectate);
    elements.openAppBtn.addEventListener('click', openFullApp);
    elements.refreshBtn.addEventListener('click', loadGames);
    
    // Modal actions
    elements.closeModalBtn.addEventListener('click', hideCreateGameModal);
    elements.cancelCreateBtn.addEventListener('click', hideCreateGameModal);
    elements.confirmCreateBtn.addEventListener('click', createGame);
    
    // Board selector
    document.querySelectorAll('.mini-cell').forEach((cell, index) => {
        cell.addEventListener('click', () => selectPosition(index));
    });
    
    // Settings
    elements.notificationsToggle.addEventListener('change', toggleNotifications);
    
    // Click outside modal to close
    elements.createGameModal.addEventListener('click', (e) => {
        if (e.target === elements.createGameModal) {
            hideCreateGameModal();
        }
    });
}

// Check wallet connection status
async function checkWalletConnection() {
    if (currentAddress) {
        updateConnectionStatus(true);
        updateWalletDisplay(currentAddress);
        await loadBalance();
    } else {
        updateConnectionStatus(false);
        showWalletDisconnected();
    }
}

// Update connection status display
function updateConnectionStatus(connected) {
    elements.statusDot.className = `status-dot ${connected ? 'online' : 'offline'}`;
    elements.statusText.textContent = connected ? 'Monitoring Games' : 'Not Monitoring';
}

// Connect wallet
async function connectWallet() {
    try {
        // For Chrome extensions, we need to redirect to the main app for wallet connection
        // This is a simpler and more reliable approach
        
        // Ask user to manually enter their address for monitoring
        const userAddress = prompt(
            'Enter your Stacks testnet address to enable game monitoring:\n\n' +
            '• You can find this in your Stacks wallet\n' +
            '• Or connect through the main app first to see your address\n' +
            '• Address should start with "ST"\n\n' +
            'This enables notifications and game monitoring (read-only).'
        );
        
        if (userAddress && userAddress.startsWith('ST')) {
            currentAddress = userAddress;
            await chrome.storage.local.set({
                [STORAGE_KEYS.WALLET_ADDRESS]: currentAddress
            });
            
            updateConnectionStatus(true);
            updateWalletDisplay(currentAddress);
            await loadBalance();
            await loadGames();
            
            // Enable background monitoring
            chrome.runtime.sendMessage({
                type: 'WALLET_CONNECTED',
                address: currentAddress
            });
            
            showSuccess('Address added! You will now receive notifications for your games. Use the main app for playing.');
        } else if (userAddress) {
            showError('Invalid address. Please enter a valid Stacks testnet address starting with ST.');
        } else {
            // User cancelled - offer to open main app
            const openApp = confirm('Would you like to open the main app to connect your wallet first?');
            if (openApp) {
                chrome.tabs.create({ 
                    url: 'http://localhost:3000/',
                    active: true 
                });
            }
        }
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showError('Failed to connect wallet. Please use the main app for full wallet functionality.');
    }
}

// Disconnect wallet
async function disconnectWallet() {
    try {
        currentAddress = null;
        currentBalance = 0;
        games = [];
        
        await chrome.storage.local.remove([STORAGE_KEYS.WALLET_ADDRESS]);
        
        updateConnectionStatus(false);
        showWalletDisconnected();
        clearGamesList();
        
        // Disable background monitoring
        chrome.runtime.sendMessage({
            type: 'WALLET_DISCONNECTED'
        });
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
    }
}

// Update wallet display
function updateWalletDisplay(address) {
    elements.walletDisconnected.classList.add('hidden');
    elements.walletConnected.classList.remove('hidden');
    elements.walletAddress.textContent = abbreviateAddress(address);
}

// Show wallet disconnected state
function showWalletDisconnected() {
    elements.walletConnected.classList.add('hidden');
    elements.walletDisconnected.classList.remove('hidden');
}

// Load wallet balance
async function loadBalance() {
    if (!currentAddress) return;
    
    try {
        const response = await fetch(
            `${STACKS_API_BASE}/extended/v1/address/${currentAddress}/balances`
        );
        const data = await response.json();
        
        const stxBalance = parseInt(data.stx.balance) / 1000000; // Convert from microSTX
        currentBalance = stxBalance;
        elements.walletBalance.textContent = `${stxBalance.toFixed(2)} STX`;
    } catch (error) {
        console.error('Error loading balance:', error);
        elements.walletBalance.textContent = 'Balance unavailable';
    }
}

// Load user's active games
async function loadGames() {
    if (!currentAddress) return;
    
    showGamesLoading();
    
    try {
        // Get latest game ID
        const latestIdResponse = await fetch(
            `${STACKS_API_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-latest-game-id`
        );
        const latestIdData = await latestIdResponse.json();
        const latestId = parseInt(latestIdData.result.replace('u', ''));
        
        // Fetch recent games (last 10)
        const gamePromises = [];
        const startId = Math.max(0, latestId - 10);
        
        for (let i = startId; i <= latestId; i++) {
            gamePromises.push(fetchGame(i));
        }
        
        const allGames = await Promise.all(gamePromises);
        
        // Filter for user's active games
        games = allGames.filter(game => 
            game && 
            (game['player-one'] === currentAddress || game['player-two'] === currentAddress) &&
            !game.winner
        );
        
        updateGamesList();
    } catch (error) {
        console.error('Error loading games:', error);
        showGamesError();
    }
}

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
            // Parse the game data
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
    // This is a simplified parser - in real implementation you'd use proper Clarity parsing
    const match = contractResult.match(/player-one: (ST[A-Z0-9]+)/);
    const playerOne = match ? match[1] : null;
    
    const playerTwoMatch = contractResult.match(/player-two: \(some (ST[A-Z0-9]+)\)/);
    const playerTwo = playerTwoMatch ? playerTwoMatch[1] : null;
    
    const turnMatch = contractResult.match(/is-player-one-turn: (true|false)/);
    const isPlayerOneTurn = turnMatch ? turnMatch[1] === 'true' : false;
    
    const betMatch = contractResult.match(/bet-amount: u(\d+)/);
    const betAmount = betMatch ? parseInt(betMatch[1]) : 0;
    
    return {
        'player-one': playerOne,
        'player-two': playerTwo,
        'is-player-one-turn': isPlayerOneTurn,
        'bet-amount': betAmount,
        winner: null // Simplified - parse from winner field
    };
}

// Update games list display
function updateGamesList() {
    if (games.length === 0) {
        showGamesEmpty();
        return;
    }
    
    hideGamesLoading();
    elements.gamesEmpty.classList.add('hidden');
    
    const gamesHtml = games.map(game => {
        const isPlayerOne = game['player-one'] === currentAddress;
        const isUserTurn = (isPlayerOne && game['is-player-one-turn']) || 
                          (!isPlayerOne && !game['is-player-one-turn']);
        
        const statusText = isUserTurn ? 'Your turn' : 'Waiting for opponent';
        const statusClass = isUserTurn ? 'your-turn' : 'waiting';
        const stakeAmount = (game['bet-amount'] / 1000000).toFixed(2);
        
        return `
            <div class="game-item">
                <div class="game-info">
                    <div class="game-id">Game #${game.id}</div>
                    <div class="game-status ${statusClass}">${statusText} • ${stakeAmount} STX</div>
                </div>
                <div class="game-actions">
                    ${isUserTurn ? 
                        `<button class="game-btn play" onclick="playGame(${game.id})">Play</button>` :
                        `<button class="game-btn view" onclick="viewGame(${game.id})">View</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
    
    elements.gamesList.innerHTML = gamesHtml;
}

// Show games loading state
function showGamesLoading() {
    elements.gamesLoading.classList.remove('hidden');
    elements.gamesEmpty.classList.add('hidden');
    elements.gamesList.innerHTML = '';
}

// Hide games loading state
function hideGamesLoading() {
    elements.gamesLoading.classList.add('hidden');
}

// Show empty games state
function showGamesEmpty() {
    hideGamesLoading();
    elements.gamesEmpty.classList.remove('hidden');
}

// Show games error
function showGamesError() {
    hideGamesLoading();
    elements.gamesList.innerHTML = '<div class="error">Failed to load games</div>';
}

// Clear games list
function clearGamesList() {
    elements.gamesList.innerHTML = '';
    elements.gamesEmpty.classList.add('hidden');
    elements.gamesLoading.classList.add('hidden');
}

// Show create game modal
function showCreateGameModal() {
    if (!currentAddress) {
        showError('Please connect your wallet first');
        return;
    }
    
    elements.createGameModal.classList.remove('hidden');
    selectPosition(4); // Default to center
}

// Hide create game modal
function hideCreateGameModal() {
    elements.createGameModal.classList.add('hidden');
}

// Select position on mini board
function selectPosition(position) {
    selectedMovePosition = position;
    elements.selectedPosition.value = position;
    
    // Update visual selection
    document.querySelectorAll('.mini-cell').forEach((cell, index) => {
        if (index === position) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    });
}

// Create new game
async function createGame() {
    try {
        const stakeAmount = parseFloat(elements.stakeAmount.value);
        
        if (stakeAmount <= 0) {
            showError('Please enter a valid stake amount');
            return;
        }
        
        if (stakeAmount > currentBalance) {
            showError('Insufficient balance');
            return;
        }
        
        // For now, redirect to main app for game creation with pre-filled values
        const createUrl = `http://localhost:3000/create?stake=${stakeAmount}&position=${selectedMovePosition}`;
        
        chrome.tabs.create({ 
            url: createUrl,
            active: true 
        });
        
        hideCreateGameModal();
        
        showSuccess(`Redirecting to main app to create game with ${stakeAmount} STX stake...`);
        
        // Close popup after short delay
        setTimeout(() => {
            window.close();
        }, 2000);
        
    } catch (error) {
        console.error('Error creating game:', error);
        showError('Failed to open game creation: ' + error.message);
    }
}

// Quick action functions
function openJoinGames() {
    openUrl('http://localhost:3000/');
}

function openSpectate() {
    openUrl('http://localhost:3000/#live-games');
}

function openFullApp() {
    openUrl('http://localhost:3000/');
}

function playGame(gameId) {
    openUrl(`http://localhost:3000/game/${gameId}`);
}

function viewGame(gameId) {
    openUrl(`http://localhost:3000/game/${gameId}`);
}

// Toggle notifications
async function toggleNotifications() {
    const enabled = elements.notificationsToggle.checked;
    
    await chrome.storage.local.set({
        [STORAGE_KEYS.NOTIFICATIONS_ENABLED]: enabled
    });
    
    // Update background script
    chrome.runtime.sendMessage({
        type: 'NOTIFICATIONS_TOGGLED',
        enabled
    });
    
    if (enabled) {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            elements.notificationsToggle.checked = false;
            showError('Notification permission denied');
        }
    }
}

// Utility functions
function abbreviateAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function openUrl(url) {
    chrome.tabs.create({ url });
    window.close();
}

function showError(message) {
    // Simple error display - could be enhanced with proper toast notifications
    alert('Error: ' + message);
}

function showSuccess(message) {
    // Simple success display - could be enhanced with proper toast notifications
    alert('Success: ' + message);
}

// Make functions globally available for onclick handlers
window.playGame = playGame;
window.viewGame = viewGame;