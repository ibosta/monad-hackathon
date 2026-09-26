const { createPublicClient, http, isAddress, getAddress } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { monadTestnet } = require("viem/chains");
const deployment = require("./contract/moningo.json");

const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const EXPLORER_URL = "https://testnet.monadexplorer.com";
const CONTRACT_ADDRESS = process.env.MONINGO_ADDRESS || deployment.address || null;
const { abi } = deployment;

// Public Monad RPC is rate limited (15 req/s): batch calls and retry with backoff.
const client = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL, { batch: { batchSize: 10, wait: 16 }, retryCount: 6, retryDelay: 350 }),
});

const verifier = /^0x[0-9a-fA-F]{64}$/.test(process.env.VERIFIER_PRIVATE_KEY || "")
  ? privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY)
  : null;

function ready() {
  return Boolean(CONTRACT_ADDRESS && isAddress(CONTRACT_ADDRESS));
}

async function getOnchainUser(address) {
  if (!ready()) return null;
  const [streak, stakedAt, active, certificateId, level, examPaid] = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "getUser",
    args: [getAddress(address)],
  });
  return {
    streak: Number(streak),
    stakedAt: Number(stakedAt),
    active,
    certificateId: Number(certificateId),
    level: Number(level),
    examPaid,
  };
}

async function getPool() {
  if (!ready()) return null;
  const pool = await client.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "rewardPool" });
  return pool.toString();
}

/** Signs the contract's taskDigest(user) so the user can call completeEnglishTask(signature). */
async function signCompletion(address) {
  const digest = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: "taskDigest",
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
  return { name: json.name, description: json.description, image: json.image, level: attr.Level, dailyLessons: attr["Daily lessons"] };
}

/** All certificate NFTs owned by `owner` (token ids are sequential, so a multicall over ownerOf is enough). */
// Certificates are soulbound and immutable -> safe to cache forever.
const certCache = new Map();

async function getCertificates(owner) {
  if (!ready()) return [];
  const next = Number(await client.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "nextTokenId" }));
  const missing = [];
  for (let id = 1; id < next; id++) if (!certCache.has(id)) missing.push(BigInt(id));
  if (missing.length) {
    const owners = await client.multicall({
      contracts: missing.map((id) => ({ address: CONTRACT_ADDRESS, abi, functionName: "ownerOf", args: [id] })),
      allowFailure: false,
    });
    const uris = await client.multicall({
      contracts: missing.map((id) => ({ address: CONTRACT_ADDRESS, abi, functionName: "tokenURI", args: [id] })),
      allowFailure: false,
    });
    missing.forEach((id, i) =>
      certCache.set(Number(id), { tokenId: Number(id), owner: owners[i], contract: CONTRACT_ADDRESS, ...decodeTokenURI(uris[i]) })
    );
  }
  return [...certCache.values()].filter((c) => c.owner.toLowerCase() === owner.toLowerCase()).sort((a, b) => b.tokenId - a.tokenId);
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

module.exports = {
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
};
