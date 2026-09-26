// Top up the reward pool: AMOUNT_MON=1 npm run fund:testnet
const hre = require("hardhat");
const { address } = require("../../shared/moningo.json");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const amount = process.env.AMOUNT_MON || "0.5";
  const tx = await signer.sendTransaction({ to: address, value: hre.ethers.parseEther(amount) });
  await tx.wait();
  console.log(`Sent ${amount} MON to pool ${address} (tx ${tx.hash})`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
