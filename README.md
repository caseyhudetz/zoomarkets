# ZooMarkets

Degenerate meeting betting. A Polymarket-style prediction market app for Zoom calls, standups, or any group hang.

Create bets like "Will Dave be late?", "Who says synergy first?", or "Will this meeting end on time?" — then watch the odds move in real-time as people place bets with fake Meeting Bucks.

Works as a **standalone party game** or **alongside Zoom/Teams/Meet** calls.

## How It Works

1. **Create a Room** — Get a 4-character room code (like `A3F7`)
2. **Share the Code** — Friends join from their phones or laptops
3. **Create Markets** — Anyone can create a Yes/No prediction market
4. **Place Bets** — Bet Meeting Bucks on YES or NO. Prices move with demand (LMSR pricing)
5. **Resolve** — Host resolves markets. Winners get paid out automatically
6. **Leaderboard** — Track who's the best degenerate predictor

### Zoom Integration (Optional)

Click "+ Import Names" to paste participant names from your Zoom call. They show up as players on the board — perfect for betting on who'll do what during the meeting. No Zoom API needed, just copy-paste.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Open http://localhost:3000
```

## Tech Stack

- **Next.js 16** (App Router + React 19)
- **Socket.io** for real-time WebSocket communication
- **LMSR pricing engine** (same math as Polymarket/prediction markets)
- **Tailwind CSS v4** with custom dark theme + neon accents
- **No database** — rooms are ephemeral, in-memory, auto-cleanup after 30 min

## Deploying (to share with friends)

This app requires **WebSocket support**, so Vercel won't work. Use one of these:

### Railway (Recommended)

1. Push to GitHub (see below)
2. Go to [railway.app](https://railway.app), sign in with GitHub
3. Click "New Project" > "Deploy from GitHub Repo"
4. Select your repo
5. Railway auto-detects Node.js. Set:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
6. Done! Share the Railway URL with friends

### Render

1. Push to GitHub
2. Go to [render.com](https://render.com), create a new **Web Service**
3. Connect your repo
4. Set:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Fly.io

```bash
fly launch
fly deploy
```

## Push to GitHub

```bash
# Set your git identity (one-time)
git config user.name "Your Name"
git config user.email "your@email.com"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/zoomarkets.git
git add -A
git commit -m "Initial commit: ZooMarkets prediction betting app"
git branch -M main
git push -u origin main
```

Or use the GitHub CLI:

```bash
gh repo create zoomarkets --public --source=. --push
```

## Project Structure

```
zoomarkets/
├── server/                 # Custom Node.js + Socket.io server
│   ├── index.ts            # HTTP server entry point
│   ├── engine/lmsr.ts      # LMSR pricing math
│   ├── socket/handler.ts   # WebSocket event handlers
│   └── state/RoomManager.ts # In-memory room/market state
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── page.tsx        # Landing page (create/join)
│   │   └── room/[code]/    # Room page
│   ├── components/room/    # UI components
│   ├── hooks/              # useSocket, useRoom hooks
│   ├── lib/                # Constants, templates
│   └── types/              # Shared TypeScript types
└── package.json
```

## Game Rules

- Everyone starts with **$1,000 Meeting Bucks**
- Minimum bet: **$1**
- Markets use **LMSR (Logarithmic Market Scoring Rule)** pricing — the same algorithm used by real prediction markets
- Prices range from $0.01 to $0.99 and always sum to $1.00
- Anyone can create markets, anyone can bet
- Host resolves markets (decides YES or NO)
- Payouts = your shares in the winning side

## License

MIT
