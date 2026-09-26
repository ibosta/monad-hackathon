const { createPublicClient, http, isAddress, getAddress } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { monadTestnet } = require("viem/chains");
const deployment = require("./contract/moningo.json");

const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const EXPLORER_URL = "https://testnet.monadexplorer.com";
const CONTRACT_ADDRESS = process.env.MONINGO_ADDRESS || deployment.address || null;
const { abi } = deployment;

const client = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

const verifier = /^0x[0-9a-fA-F]{64}$/.test(process.env.VERIFIER_PRIVATE_KEY || "")
  ? privateKeyToAccount(process.env.VERIFIER_PRIVATE_KEY)
  : null;

function ready() {
  return Boolean(CONTRACT_ADDRESS && isAddress(CONTRACT_ADDRESS));
}

async function getOnchainUser(address) {
  if (!ready()) return null;
  const [streak, stakedAt, active, certificateId] = await client.readContract({
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

module.exports = {
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
