# 🎲 Tic-Tac-Toe on Stacks Blockchain

A fully decentralized, real-money tic-tac-toe game built on the Stacks blockchain. Play against other users with STX stakes, watch live matches, and experience transparent gaming powered by smart contracts.

## 🌟 Features

### 🎮 Core Gameplay
- **Real Stakes Gaming**: Play tic-tac-toe with real STX cryptocurrency stakes
- **Trustless Gameplay**: All game logic runs on smart contracts - no centralized servers
- **Fair Play**: Blockchain transparency ensures no cheating or manipulation
- **Instant Payouts**: Winners automatically receive the full prize pool (both players' stakes)

### ⚡ Advanced Game Mechanics
- **Timeout Protection**: Prevents games from getting stuck when opponents don't move
  - Games automatically timeout after 300 blocks (~5 minutes of inactivity)
  - Waiting players can withdraw all stakes if opponents abandon games
  - Clear timeout warnings and countdown timers
- **Move Validation**: Smart contract enforces valid moves and turn order
- **Winner Detection**: Automatic detection of three-in-a-row wins
- **Game State Tracking**: Complete move history stored on-chain

### 👀 Live Spectating & Observer Mode
- **Real-Time Spectating**: Watch ongoing games as they unfold on the blockchain
  - Live board updates every 10 seconds
  - Real-time game status and player information
  - Timeout tracking and warnings for spectators
- **Featured High-Stakes Matches**: Prominently display games with stakes ≥1 STX
- **Spectator-Friendly UI**: 
  - Player addresses and stake amounts
  - Current turn indicators
  - Game status (Live, Timed Out, Ended)
  - Total prize pool display
- **Easy Discovery**: Dedicated "Live Games" section in navigation

### 💰 Financial Features
- **Flexible Stakes**: Create games with any STX amount (minimum enforced by contract)
- **Automatic Escrow**: Stakes held securely in smart contract during gameplay
- **Winner Takes All**: Victorious player receives both stakes automatically
- **Timeout Withdrawals**: Recover stakes when opponents abandon games
- **High-Stakes Badges**: Special indicators for games with significant stakes

### 🔗 Wallet Integration
- **Stacks Testnet Support**: Seamless integration with Stacks testnet
- **Leather Wallet Compatible**: Connect using popular Stacks wallets
- **Address Filtering**: Automatically connects to correct Stacks testnet addresses (ST format)
- **Session Persistence**: Maintains wallet connection across page reloads

## 🚀 How to Play

### Getting Started
1. **Connect Your Wallet**
   - Click "Connect Wallet" in the top navigation
   - Approve connection in your Stacks wallet (Leather recommended)
   - Ensure you're on Stacks testnet with STX balance

2. **Create a New Game**
   - Click "Create Game" in the navigation or homepage
   - Set your desired stake amount (in STX)
   - Make your first move as Player X
   - Your STX stake is automatically escrowed in the smart contract

3. **Join an Existing Game**
   - Browse "Joinable Games" on the homepage
   - Click on any game that interests you
   - Make your first move as Player O
   - Your STX stake joins the prize pool

### Gameplay Rules
- **Players**: Player X (game creator) vs Player O (joiner)
- **Turns**: Players alternate making moves
- **Winning**: First to get three in a row (horizontal, vertical, or diagonal) wins
- **Stakes**: Winner automatically receives both players' stakes
- **Timeouts**: Players have ~5 minutes per move to prevent stalling

### Spectating Live Games
1. **Find Live Games**
   - Check "Live Games to Spectate" section on homepage
   - Or click "👀 Live Games" in the navigation
   - Featured high-stakes matches appear at the top

2. **Start Spectating**
   - Click "👀 Spectate" on any ongoing game
   - Watch real-time updates as players make moves
   - See player information, stakes, and timeout status
   - Enjoy the excitement of high-stakes blockchain gaming!

## 🛡️ Timeout Protection System

### How It Works
- Each move updates a timestamp on the blockchain
- If no move is made for 300+ blocks (~5 minutes), the game becomes "timed out"
- The waiting player can then withdraw all stakes (their own + opponent's)

### For Players
- **Timeout Warnings**: Clear indicators when opponent is taking too long
- **Withdraw Button**: Prominent button appears when timeout is reached
- **Automatic Recovery**: Get your stakes back plus opponent's stakes
- **Fair Play**: Prevents griefing and ensures games conclude

### For Spectators
- **Timeout Tracking**: See remaining time for each player's move
- **Status Updates**: Clear indicators when games are at risk of timeout
- **Drama**: Watch tension build as timeout deadlines approach!

## 🎯 Game States & Status

### Active Games
- **Your Turn**: Games where it's your move
- **Opponent's Turn**: Waiting for opponent to move
- **Timeout Risk**: Opponent has <2 minutes to move

### Spectatable Games
- **Live Games**: Both players present, game in progress
- **High Stakes**: Games with ≥1 STX stakes get special prominence
- **Featured Matches**: Most exciting games displayed prominently

### Ended Games
- **Won Games**: Games you've won (you received the prize)
- **Lost Games**: Games you've lost
- **Timed Out**: Games ended due to opponent timeout (you withdrew stakes)

## 🔧 Technical Details

### Smart Contract Features
- **Contract Address**: `ST2S0QHZC65P50HFAA2P7GD9CJBT48KDJ9DNYGDSK.tic-tac-toe-v2`
- **Language**: Clarity smart contracts on Stacks blockchain
- **Security**: Trustless game logic with automatic stake management
- **Transparency**: All moves and outcomes recorded on-chain

### Frontend Technology
- **Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Blockchain Integration**: @stacks/connect for wallet interaction
- **Real-time Updates**: Automatic polling for live game states

## 🌐 Network Information
- **Blockchain**: Stacks Testnet
- **Currency**: STX (Stacks tokens)
- **Block Time**: ~10 minutes average
- **Timeout Period**: 300 blocks (~5 minutes per move)

## 🎨 User Interface Features
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Eye-friendly dark color scheme
- **Live Indicators**: Real-time status updates and animations
- **Intuitive Navigation**: Easy access to all game features
- **Visual Feedback**: Clear success/error messages and loading states

## 🏆 Why Play on Stacks?
- **True Ownership**: Your stakes and winnings are genuinely yours
- **No House Edge**: Pure peer-to-peer gaming with no platform fees
- **Transparent**: Every move and outcome is publicly verifiable
- **Secure**: Smart contracts eliminate possibility of cheating
- **Fun**: Experience the thrill of real-stakes gaming on the blockchain!

---

**Ready to play?** Connect your wallet and start your first game, or jump into spectating mode to watch the action unfold! 🎮
