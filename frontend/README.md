# Moningo Frontend ⚡

Minimalist Web3 English learning streak platform for **Monad Testnet**. Stake `0.1 MON`, complete daily English quizzes, and claim your stake back plus rewards.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + Shadcn-style UI primitives (Radix)
- **Wagmi / Viem** configured for Monad Testnet (chainId `10143`)
- **Lucide React** for gamified icons (🔥 🪙 🏆)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local to point at your backend and contract

# 3. Run dev server
npm run dev
# -> http://localhost:3000
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | no | `http://localhost:5000` | Backend API base URL |
| `NEXT_PUBLIC_MONAD_RPC_URL` | no | `https://testnet-rpc.monad.xyz` | Monad Testnet RPC |
| `NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS` | no | — | Explicit contract address override (else fetched from `/api/config`) |

## Backend Endpoints Used

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/config` | Chain config + contract address + ABI |
| GET | `/api/english-lessons` | Today's 3 lessons (rotating pool) |
| POST | `/api/sync-progress` | Sync lesson completion, may return claim signature |
| POST | `/api/claim-signature` | Re-issue completion signature (fallback) |
| GET | `/api/users/:address` | User progress + on-chain state |

## Smart Contract Flow

1. **Dashboard** → `startStreak()` with `0.1 MON` (payable)
2. **Learn** → answer quizzes → `POST /api/sync-progress`
3. **Complete** → backend signs `taskDigest(user)` → `completeEnglishTask(signature)` → stake + reward returned
4. After 3 completions → `claimCertificate()` mints a soulbound NFT

## Docker

```bash
docker build -t moningo-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BACKEND_URL=http://host.docker.internal:5000 \
  -e NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS=0x... \
  moningo-frontend
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + providers + navbar
│   │   ├── page.tsx            # Dashboard & staking hub
│   │   ├── learn/page.tsx      # Interactive English quiz
│   │   └── globals.css         # Dark slate theme
│   ├── components/
│   │   ├── navbar.tsx
│   │   ├── wallet-button.tsx
│   │   ├── stat-card.tsx
│   │   ├── providers.tsx       # Wagmi + React Query
│   │   └── ui/                 # button, card, progress, dialog
│   ├── hooks/
│   │   └── use-moningo.ts      # Contract read/write hooks
│   └── lib/
│       ├── wagmi.ts            # Monad Testnet chain config
│       ├── contract.ts         # ABI + constants
│       ├── api.ts              # Backend client
│       └── utils.ts            # cn(), formatters
├── Dockerfile
├── .env.example
└── package.json
```
