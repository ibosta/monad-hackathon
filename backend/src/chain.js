const { createPublicClient, http, isAddress, getAddress, formatEther } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { monadTestnet, hardhat } = require("viem/chains");
const path = require("path");
// Folder with deployed address+ABI JSON files (override for local chains / tests).
const CONTRACTS_DIR = process.env.CONTRACTS_DIR || path.join(__dirname, "contract");
const deployment = require(path.join(CONTRACTS_DIR, "moningo.json"));

const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
// Local hardhat node for tests/dev; Monad Testnet otherwise.
const CHAIN = /127\.0\.0\.1|localhost/.test(RPC_URL) ? hardhat : monadTestnet;
const EXPLORER_URL = "https://testnet.monadexplorer.com";
const CONTRACT_ADDRESS = process.env.MONINGO_ADDRESS || deployment.address || null;
const { abi } = deployment;

// Public Monad RPC is rate limited (15 req/s): batch calls and retry with backoff.
const client = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL, { batch: { batchSize: 10, wait: 16 }, retryCount: 6, retryDelay: 350 }),
});

const verifier = /^0x[0-9a-fA-F]{64}$/.test(process.env.VERIFIER_PRIVATE_KEY || "")
  ? privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY)
  : null;

// CHAIN_OFFLINE=1 disables all RPC reads (unit tests / CI without network access).
const OFFLINE = process.env.CHAIN_OFFLINE === "1";

function ready() {
  return !OFFLINE && Boolean(CONTRACT_ADDRESS && isAddress(CONTRACT_ADDRESS));
}

// ---------------------------------------------------------------------------
// Tiny read cache: the public Monad RPC allows ~15 req/s. Concurrent identical reads share
// one request, results live for a few seconds, and on an RPC error the last good value is
// served (stale-if-error) instead of failing the API call.
const cache = new Map(); // key -> { value, at, pending }

async function cached(key, ttlMs, load, { fresh = false } = {}) {
  const hit = cache.get(key);
  if (!fresh && hit && "value" in hit && Date.now() - hit.at < ttlMs) return hit.value;
  if (!fresh && hit?.pending) return hit.pending;
  const pending = load()
    .then((value) => {
      cache.set(key, { value, at: Date.now() });
      return value;
    })
    .catch((err) => {
      if (hit && "value" in hit) {
        cache.set(key, hit);
        console.warn(
          `[chain] ${key}: RPC failed (${err.shortMessage || err.message}), serving cached value`
        );
        return hit.value;
      }
      cache.delete(key);
      throw err;
    });
  cache.set(key, { ...(hit || {}), pending });
  return pending;
}

/** @param opts.fresh bypass the cache (use right after a write, e.g. a claim or mint). */
async function getOnchainUser(address, opts) {
  if (!ready()) return null;
  const user = getAddress(address);
  return cached(
    `user:${user}`,
    4_000,
    async () => {
      const [streak, claimedToday, nextReward, certificateId, level, examPaid] =
        await client.readContract({
          address: CONTRACT_ADDRESS,
          abi,
          functionName: "getUser",
          args: [user],
        });
      return {
        streak: Number(streak),
        claimedToday,
        nextReward: formatEther(nextReward),
        certificateId: Number(certificateId),
        level: Number(level),
        examPaid,
      };
    },
    opts
  );
}

async function getPool() {
  if (!ready()) return null;
  return cached("pool", 15_000, async () =>
    (
      await client.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "rewardPool" })
    ).toString()
  );
}

/** Signs today's dailyDigest(user) so the user can call completeDaily(signature). */
async function signCompletion(address) {
  const digest = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "dailyDigest",
    args: [getAddress(address)],
  });
  return verifier.signMessage({ message: { raw: digest } });
}

/** Signs examDigest(user, level) so the user can call claimCertificate(level, signature). */
async function signExam(address, level) {
  const digest = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "examDigest",
    args: [getAddress(address), level],
  });
  return verifier.signMessage({ message: { raw: digest } });
}

function decodeTokenURI(uri) {
  const json = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
  const attr = Object.fromEntries((json.attributes || []).map((a) => [a.trait_type, a.value]));
  return {
    name: json.name,
    description: json.description,
    image: json.image,
    level: attr.Level,
    dailyLessons: attr["Daily lessons"],
  };
}

/** All certificate NFTs owned by `owner` (token ids are sequential, so a multicall over ownerOf is enough). */
// Certificates are soulbound and immutable -> safe to cache forever.
const certCache = new Map();

class RpcUnavailableError extends Error {}

/**
 * All certificate NFTs owned by `owner`. Token ids are sequential and certificates are soulbound
 * (immutable), so each token is read once and cached forever. If the RPC is rate limited and the
 * answer would be incomplete, throws RpcUnavailableError instead of returning a misleading list.
 */
async function getCertificates(owner) {
  if (!ready()) return [];
  let next;
  let incomplete = false;
  try {
    next = await cached("nextTokenId", 5_000, async () =>
      Number(
        await client.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "nextTokenId" })
      )
    );
  } catch (err) {
    console.warn(`[chain] certificates: ${err.shortMessage || err.message}`);
    throw new RpcUnavailableError("Monad RPC is busy, try again in a few seconds");
  }
  const missing = [];
  for (let id = 1; id < next; id++) if (!certCache.has(id)) missing.push(BigInt(id));
  if (missing.length) {
    const read = (functionName) =>
      readMany(missing.map((id) => ({ address: CONTRACT_ADDRESS, abi, functionName, args: [id] })));
    const owners = (await read("ownerOf")).map((r) => r.result);
    const uris = (await read("tokenURI")).map((r) => r.result);
    missing.forEach((id, i) => {
      if (!owners[i] || !uris[i]) {
        incomplete = true; // failed read: don't cache, retry next time
        return;
      }
      certCache.set(Number(id), {
        tokenId: Number(id),
        owner: owners[i],
        contract: CONTRACT_ADDRESS,
        ...decodeTokenURI(uris[i]),
      });
    });
  }
  const mine = [...certCache.values()]
    .filter((c) => c.owner.toLowerCase() === owner.toLowerCase())
    .sort((a, b) => b.tokenId - a.tokenId);
  if (incomplete && mine.length === 0)
    throw new RpcUnavailableError("Monad RPC is busy, try again in a few seconds");
  return mine;
}

async function getCertificate(tokenId) {
  if (certCache.has(tokenId)) return certCache.get(tokenId);
  const id = BigInt(tokenId);
  const [owner, uri] = await Promise.all([
    client.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "ownerOf", args: [id] }),
    client.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "tokenURI", args: [id] }),
  ]);
  const cert = { tokenId: Number(id), owner, contract: CONTRACT_ADDRESS, ...decodeTokenURI(uri) };
  certCache.set(Number(id), cert);
  return cert;
}

/**
 * Multicall with a fallback to individual (transport-batched) reads, for chains without multicall3.
 * Returns viem-style { status, result } entries.
 */
async function readMany(contracts) {
  try {
    return await client.multicall({ contracts, allowFailure: true });
  } catch {
    const settled = await Promise.allSettled(contracts.map((c) => client.readContract(c)));
    return settled.map((s) =>
      s.status === "fulfilled"
        ? { status: "success", result: s.value }
        : { status: "failure", error: s.reason }
    );
  }
}

module.exports = {
  RpcUnavailableError,
  readMany,
  CONTRACTS_DIR,
  getCertificates,
  getCertificate,
  signExam,
  abi,
  client,
  verifier,
  ready,
  getOnchainUser,
  getPool,
  signCompletion,
  RPC_URL,
  EXPLORER_URL,
  CONTRACT_ADDRESS,
  CHAIN_ID: monadTestnet.id,
  CHAIN,
};
