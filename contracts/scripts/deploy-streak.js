// Deploys MoningoStreakRewards pointing at the live Moningo contract.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const dir = process.env.CONTRACTS_OUT_DIR || path.join(__dirname, "..", "..", "backend", "src", "contract");
  const moningo = require(path.join(dir, "moningo.json")).address;
  const c = await hre.ethers.deployContract("MoningoStreakRewards", [moningo]);
  await c.waitForDeployment();
  const address = await c.getAddress();
  const { abi } = await hre.artifacts.readArtifact("MoningoStreakRewards");
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  fs.writeFileSync(path.join(dir, "streak.json"), JSON.stringify({ address, chainId, moningo, deployedAt: new Date().toISOString(), abi }, null, 2));
  console.log(`MoningoStreakRewards: ${address} (moningo ${moningo})`);
  const seed = process.env.STREAK_POOL_SEED_MON || "0.3";
  await (await deployer.sendTransaction({ to: address, value: hre.ethers.parseEther(seed) })).wait();
  console.log(`Streak pool seeded with ${seed} MON`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
