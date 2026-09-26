// Backend-sent transactions (duel referee + practice bot). Serialized to avoid nonce races.
const { createWalletClient, http } = require("viem");
const { client, verifier, RPC_URL, CHAIN } = require("./chain");

const load = (name) => {
  try {
    return require(`./contract/${name}.json`);
  } catch {
    return { address: "", abi: [] };
  }
};
const duel = load("duel");
const practice = load("practice");

const wallet = verifier
  ? createWalletClient({
      account: verifier,
      chain: CHAIN,
      transport: http(RPC_URL, { retryCount: 4 }),
    })
  : null;

let queue = Promise.resolve();

/**
 * Sends a contract write with an explicit gas limit (Monad bills the full limit) and waits for the receipt.
 * @returns {Promise<{hash: string, status: string}>}
 */
function send({ address, abi, functionName, args = [], value, gas }) {
  if (!wallet) return Promise.reject(new Error("VERIFIER_PRIVATE_KEY not configured"));
  const run = async () => {
    const hash = await wallet.writeContract({ address, abi, functionName, args, value, gas });
    const receipt = await client.waitForTransactionReceipt({ hash, pollingInterval: 300 });
    return { hash, status: receipt.status };
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

module.exports = { send, duel, practice, account: verifier };
