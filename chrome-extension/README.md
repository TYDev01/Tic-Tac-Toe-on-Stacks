# 🎲 Tic-Tac-Toe on Stacks - Chrome Extension

A Chrome browser extension for quick access to the Tic-Tac-Toe on Stacks blockchain game. Get instant notifications for game events and manage your games directly from your browser toolbar.

## ✨ Features

### 🎮 Quick Game Access
- **Popup Interface**: Access all game functions from the extension popup
- **Wallet Integration**: Connect your Stacks wallet directly from the extension
- **Game Creation**: Create new games with custom stakes right from the popup
- **Active Games Overview**: See all your active games and their status
- **Quick Actions**: Join games, spectate matches, or open the full app

### 🔔 Push Notifications
- **Real-time Alerts**: Get notified instantly when it's your turn
- **Game Events**: Notifications for wins, losses, new opponents, and timeouts
- **Clickable Notifications**: Click notifications to jump directly to the game
- **Smart Filtering**: Only receive notifications for games you're playing

### 🌐 Web Integration
- **In-page Notifications**: Beautiful notifications overlay on any webpage
- **Extension Badge**: Shows when the extension is active and monitoring
- **Background Monitoring**: Continuous checking for game updates
- **Cross-tab Sync**: Notifications work across all browser tabs

## 🚀 Installation

### Method 1: Load Unpacked (Development)

1. **Download the Extension**
   ```bash
   # Navigate to the chrome-extension directory
   cd /path/to/tic-tac-toe/chrome-extension
   ```

2. **Open Chrome Extensions**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension should now appear in your extensions list

4. **Pin Extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Tic-Tac-Toe on Stacks" and click the pin icon
   - The extension icon will now appear in your toolbar

### Method 2: Package and Install

1. **Package Extension**
   - Go to `chrome://extensions/`
   - Click "Pack extension"
   - Select the `chrome-extension` folder as the root directory
   - This creates a `.crx` file

2. **Install Package**
   - Drag the `.crx` file into Chrome
   - Click "Add extension" when prompted

## 🎯 Usage Guide

### First Setup

1. **Connect Wallet**
   - Click the extension icon in your toolbar
   - Click "Connect Wallet" 
   - Approve the connection in your Stacks wallet
   - Ensure you're connected to Stacks testnet

2. **Enable Notifications**
   - The notifications toggle should be enabled by default
   - Make sure Chrome notifications are allowed for your browser

### Creating Games

1. **Quick Creation**
   - Click extension icon
   - Click "Create Game" action button
   - Set your stake amount (in STX)
   - Select your starting position (1-9)
   - Click "Create Game"

2. **Full App Creation**
   - Click "Open App" to access the full interface
   - Use the complete game creation interface

### Managing Active Games

1. **View Your Games**
   - Open the extension popup
   - Scroll to "Your Active Games" section
   - See game status: "Your turn" or "Waiting for opponent"

2. **Quick Actions**
   - **Play**: Click when it's your turn (opens game page)
   - **View**: Click to spectate or check game status

### Notifications

1. **Notification Types**
   - 🎮 **Game Created**: When you create a new game
   - 🎯 **Opponent Joined**: Someone joins your game
   - ⚡ **Your Turn**: When it's your move
   - 🏆 **You Won**: Victory notifications with prize amount
   - 😔 **Game Over**: Loss notifications
   - ⏰ **Timeout Warning**: When opponents are taking too long

2. **Notification Actions**
   - **Click**: Opens the relevant game page
   - **Auto-dismiss**: Notifications disappear after 10 seconds
   - **Toggle**: Turn notifications on/off in extension settings

### Spectating

1. **Quick Spectate**
   - Click "Spectate" in the extension popup
   - Opens the live games section of the app

2. **Featured Matches**
   - High-stakes games (≥1 STX) are highlighted
   - Watch exciting matches as they unfold

## ⚙️ Settings & Configuration

### Notification Settings
- **Enable/Disable**: Toggle in extension popup
- **Browser Permissions**: Ensure Chrome allows notifications
- **Frequency**: Checks for updates every 30 seconds

### Wallet Settings
- **Connect/Disconnect**: Manage wallet connection
- **Address Display**: Shows abbreviated wallet address
- **Balance**: Current STX balance display

### Monitoring Settings
- **Auto-monitoring**: Starts when wallet is connected
- **Background Updates**: Runs even when popup is closed
- **Game Filtering**: Only monitors games you're playing

## 🔧 Technical Details

### Permissions Required
- **Storage**: Save wallet address and preferences
- **Notifications**: Send push notifications
- **Active Tab**: Interact with current webpage
- **Background**: Monitor games continuously
- **Host Permissions**: Access Stacks API and localhost

### API Integration
- **Stacks API**: Fetches game data from blockchain
- **Contract Calls**: Reads from tic-tac-toe-v2 contract
- **Real-time Updates**: Polls every 30 seconds for changes

### Security Features
- **Local Storage**: Wallet addresses stored locally only
- **No Private Keys**: Extension never handles private keys
- **Wallet Integration**: Uses existing wallet providers
- **Permission-based**: Only accesses what's necessary

## 🛠️ Development

### File Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Main popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for web pages
├── content.css            # Content script styling
├── injected.js            # Page context script
├── icons/                 # Extension icons
└── README.md              # This file
```

### Key Components

1. **Popup Interface** (`popup.js`, `popup.html`, `popup.css`)
   - Main user interface
   - Wallet connection and game management
   - Quick actions and settings

2. **Background Worker** (`background.js`)
   - Monitors games continuously
   - Sends push notifications
   - Manages extension state

3. **Content Scripts** (`content.js`, `content.css`)
   - Injects notifications into web pages
   - Provides wallet integration
   - Shows extension activity indicators

4. **Injected Script** (`injected.js`)
   - Interacts with page's wallet APIs
   - Handles transaction requests
   - Bridges extension and page context

### Customization

1. **Styling**: Edit CSS files to change appearance
2. **Notifications**: Modify notification types in `background.js`
3. **Polling Frequency**: Adjust check intervals
4. **UI Elements**: Add new features to popup interface

## 🚨 Troubleshooting

### Common Issues

1. **Extension Not Loading**
   - Check that Developer mode is enabled
   - Verify all files are in the correct directory
   - Look for errors in Chrome's extension management page

2. **Wallet Connection Fails**
   - Ensure you have a Stacks wallet installed (Leather recommended)
   - Check that you're on Stacks testnet
   - Verify wallet is unlocked and ready

3. **No Notifications**
   - Check Chrome notification permissions
   - Ensure notifications toggle is enabled in extension
   - Verify wallet is connected and monitoring is active

4. **Games Not Loading**
   - Check internet connection
   - Verify Stacks API is accessible
   - Look for errors in browser console

### Debug Mode

1. **View Console Logs**
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page"
   - Check console for error messages

2. **Check Storage**
   - In background page console, type: `chrome.storage.local.get(null, console.log)`
   - Verify wallet address and settings are stored

3. **Test Notifications**
   - Manually trigger notification test
   - Check browser notification settings

## 📝 Version History

### v1.0.0 (Current)
- Initial release
- Basic popup interface
- Wallet connection
- Game creation and management
- Push notifications for game events
- Background monitoring
- Web page integration

## 🤝 Contributing

To contribute to the extension:

1. **Fork the Repository**
2. **Make Changes** to the chrome-extension directory
3. **Test Thoroughly** by loading unpacked extension
4. **Submit Pull Request** with detailed description

## 📄 License

This extension is part of the Tic-Tac-Toe on Stacks project. See main project license for details.

## 🆘 Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console for errors
- Ensure all dependencies are properly installed
- Verify Stacks wallet and testnet connectivity

---

**Enjoy playing Tic-Tac-Toe with real stakes, right from your browser! 🎮**