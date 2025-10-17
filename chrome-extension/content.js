// Content Script for Tic-Tac-Toe Chrome Extension

console.log('TicTacToe Extension: Content script loaded');

// Only run on specific domains to avoid conflicts
const allowedDomains = ['localhost', '127.0.0.1', 'your-app-domain.com'];
const currentDomain = window.location.hostname;

if (!allowedDomains.includes(currentDomain)) {
    console.log('TicTacToe Extension: Not running on allowed domain');
    // Still listen for messages but don't inject UI
} else {
    console.log('TicTacToe Extension: Running on allowed domain');
    initializeContentScript();
}

// Initialize content script functionality
function initializeContentScript() {
    // Inject notification container
    injectNotificationContainer();
    
    // Inject wallet helper
    injectWalletHelper();
    
    // Set up periodic game checking
    startGameMonitoring();
}

// Inject notification container for in-page notifications
function injectNotificationContainer() {
    if (document.getElementById('ttt-notifications')) return;
    
    const container = document.createElement('div');
    container.id = 'ttt-notifications';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    document.body.appendChild(container);
}

// Inject wallet helper methods
function injectWalletHelper() {
    // Inject a script that can interact with the page's Stacks wallet APIs
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    switch (message.type) {
        case 'SHOW_NOTIFICATION':
            showInPageNotification(message.title, message.message, message.type);
            break;
            
        case 'CHECK_WALLET_CONNECTION':
            checkWalletConnection(sendResponse);
            return true;
            
        default:
            console.log('Unknown message type:', message.type);
    }
});

// Check if wallet is connected on the current page
async function checkWalletConnection(sendResponse) {
    try {
        // Check if we're on the main app and if wallet is connected
        if (window.location.hostname === 'localhost' && window.location.port === '3000') {
            // Try to detect if wallet is connected by looking for wallet elements
            const walletButton = document.querySelector('[data-testid="wallet-button"]');
            if (walletButton && walletButton.textContent.includes('ST')) {
                const address = walletButton.textContent.match(/ST[A-Z0-9]+/);
                if (address) {
                    sendResponse({
                        success: true,
                        address: address[0]
                    });
                    return;
                }
            }
        }
        
        sendResponse({
            success: false,
            error: 'Wallet not detected. Please connect through the main app.'
        });
    } catch (error) {
        console.error('Error checking wallet connection:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// Send message to injected script
function sendMessageToPage(type, data) {
    return new Promise((resolve) => {
        const messageId = `ttt_${Date.now()}_${Math.random()}`;
        
        // Listen for response
        const handleResponse = (event) => {
            if (event.data && event.data.messageId === messageId) {
                window.removeEventListener('message', handleResponse);
                resolve(event.data.response);
            }
        };
        
        window.addEventListener('message', handleResponse);
        
        // Send message
        window.postMessage({
            type: 'TTT_EXTENSION_MESSAGE',
            messageId,
            action: type,
            data
        }, '*');
        
        // Timeout after 10 seconds
        setTimeout(() => {
            window.removeEventListener('message', handleResponse);
            resolve({ success: false, error: 'Timeout' });
        }, 10000);
    });
}

// Show in-page notification
function showInPageNotification(title, message, type = 'info') {
    const container = document.getElementById('ttt-notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        margin-bottom: 12px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        cursor: pointer;
        min-width: 300px;
        max-width: 400px;
        font-size: 14px;
        line-height: 1.4;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        position: relative;
        overflow: hidden;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="opacity: 0.9;">${message}</div>
        <div style="position: absolute; top: 8px; right: 12px; font-size: 18px; cursor: pointer;">&times;</div>
    `;
    
    // Add click to dismiss
    notification.addEventListener('click', () => {
        dismissNotification(notification);
    });
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        dismissNotification(notification);
    }, 5000);
}

// Get notification color based on type
function getNotificationColor(type) {
    switch (type) {
        case 'success': return 'linear-gradient(135deg, #10b981, #059669)';
        case 'error': return 'linear-gradient(135deg, #ef4444, #dc2626)';
        case 'warning': return 'linear-gradient(135deg, #f59e0b, #d97706)';
        case 'turn': return 'linear-gradient(135deg, #3b82f6, #2563eb)';
        case 'win': return 'linear-gradient(135deg, #10b981, #059669)';
        case 'info':
        default: return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
}

// Dismiss notification
function dismissNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Start monitoring games for notifications
function startGameMonitoring() {
    // Check for game updates every 30 seconds
    setInterval(() => {
        chrome.runtime.sendMessage({ type: 'CHECK_GAMES_NOW' });
    }, 30000);
}

// Listen for window focus to check for updates
window.addEventListener('focus', () => {
    chrome.runtime.sendMessage({ type: 'CHECK_GAMES_NOW' });
});

// Detect if we're on the tic-tac-toe app and add extension integration
if (window.location.pathname.includes('game') || window.location.pathname === '/') {
    addGamePageIntegration();
}

// Add integration features to game pages
function addGamePageIntegration() {
    // Add extension indicator
    setTimeout(() => {
        addExtensionBadge();
    }, 2000);
}

// Add extension badge to show extension is active
function addExtensionBadge() {
    if (document.getElementById('ttt-extension-badge')) return;
    
    const badge = document.createElement('div');
    badge.id = 'ttt-extension-badge';
    badge.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        cursor: pointer;
        transition: transform 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    badge.innerHTML = '🎲 Extension Active';
    
    badge.addEventListener('mouseenter', () => {
        badge.style.transform = 'scale(1.05)';
    });
    
    badge.addEventListener('mouseleave', () => {
        badge.style.transform = 'scale(1)';
    });
    
    badge.addEventListener('click', () => {
        showInPageNotification(
            'Extension Active! 🎲',
            'Click the extension icon in your toolbar for quick access to games and notifications.',
            'info'
        );
    });
    
    document.body.appendChild(badge);
    
    // Hide badge after 10 seconds
    setTimeout(() => {
        if (badge.parentNode) {
            badge.style.opacity = '0.7';
        }
    }, 10000);
}

console.log('TicTacToe Extension: Content script initialized');