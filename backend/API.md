# Moningo API

Base URL: `http://localhost:5001` with Docker (`BACKEND_PORT`), `http://localhost:5000` with `npm run dev`.
All bodies are JSON. Errors have the shape `{ "success": false, "message": "..." }`.

## GET /api/health
```json
{ "ok": true, "contract": "0x…" , "verifier": "0x…" }
```

## GET /api/config
Everything the frontend needs to talk to the chain. Use this instead of hard-coding the address or ABI.
```json
{
  "chainId": 10143, "chainName": "Monad Testnet",
  "rpcUrl": "https://testnet-rpc.monad.xyz",
  "explorerUrl": "https://testnet.monadexplorer.com",
  "faucetUrl": "https://faucet.monad.xyz",
  "contractAddress": "0x…",          // null until deployed
  "dailyStake": "0.1", "reward": "0.01", "certThreshold": 3,
  "rewardPool": "0.47",              // MON available for rewards
  "lessonsPerDay": 3,
  "abi": [ … ]
}
```

## GET /api/english-lessons
Today's 3 lessons (they rotate daily).
```json
[{ "id": 4, "type": "vocabulary", "question": "Which word means 'very big'?", "options": ["Tiny","Huge","Narrow"], "answer": "Huge" }]
```

## POST /api/sync-progress
Body: `{ "walletAddress": "0x…", "lessonId": 4, "score": 100 }`. The score is an integer from 0 to 100, and a lesson counts as done when `score > 0`.
```json
{
  "success": true, "message": "Progress synced",
  "lessonsDoneToday": 3, "lessonsPerDay": 3, "completedToday": true,
  "signature": "0x…",   // present once all lessons are done AND the user has an active stake
  "claimError": null     // otherwise the reason, e.g. "No active stake: call startStreak() with 0.1 MON first"
}
```

## POST /api/claim-signature
Body: `{ "walletAddress": "0x…" }`. This re-issues the completion signature, for example when the user staked *after* finishing the lessons.
`200 { "success": true, "signature": "0x…" }` · `403` lessons not finished · `409` no active stake

## GET /api/users/:address
```json
{
  "walletAddress": "0x…", "totalScore": 300, "lessonsCompleted": 3,
  "todayProgress": [{ "lessonId": 4, "score": 100 }],
  "completedToday": true,
  "onchain": { "streak": 2, "stakedAt": 1790000000, "active": true, "certificateId": 0 }
}
```

## GET /api/leaderboard
```json
[{ "walletAddress": "0x…", "totalScore": 300, "lessonsCompleted": 3 }]
```

---

## Endpoint Smoke Test Tool

A lightweight CLI smoke test is included for live backend endpoint checks. It is preferred over a Postman collection for this repo because it is versioned, automatable in CI, and uses the same Node.js toolchain as the backend.

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd backend
npm run test:api
```

Useful overrides:

```bash
API_BASE_URL=http://localhost:5001 npm run test:api
TEST_WALLET=0x1111111111111111111111111111111111111111 npm run test:api
node scripts/api-smoke-test.js --base-url http://localhost:5001 --wallet 0x1111111111111111111111111111111111111111
```

The tool validates health/config, lessons/progress, level test, practice, achievements, leaderboard, invalid-input handling, and graceful responses for chain-dependent claim/signature endpoints.

## Contract calls (frontend → wallet, via wagmi/viem)

| Step | Call | Value |
|---|---|---|
| 1. Stake for the day | `startStreak()` | `0.1 MON` |
| 2. Do lessons | `POST /api/sync-progress` for each lesson → take `signature` | – |
| 3. Claim | `completeEnglishTask(signature)` → +0.1 stake back, +0.01 MON reward | – |
| 4. Certificate | `claimCertificate()` when `onchain.streak >= 3` → soulbound NFT | – |

Reads: `getUser(address) → (streak, stakedAt, active, certificateId)`, `rewardPool()`, `tokenURI(id)` (on-chain SVG JSON).
Events: `StreakStarted`, `TaskCompleted`, `RewardPaid`, `StreakLost`, `CertificateMinted`.
Custom errors to surface in the UI: `WrongStake`, `StreakActive`, `NoActiveStreak`, `StreakExpired`, `BadSignature`, `NotEligible`, `AlreadyCertified`.

A stake that isn't claimed within 24 h is forfeited to the reward pool, and the streak resets.
