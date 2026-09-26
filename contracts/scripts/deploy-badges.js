// Deploys MoningoBadges (streak + duel achievement NFTs) against the live Moningo contract.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const dir = process.env.CONTRACTS_OUT_DIR || path.join(__dirname, "..", "..", "backend", "src", "contract");
  const moningo = require(path.join(dir, "moningo.json")).address;
  const verifier = process.env.VERIFIER_ADDRESS || deployer.address;
  const c = await hre.ethers.deployContract("MoningoBadges", [moningo, verifier]);
  await c.waitForDeployment();
  const address = await c.getAddress();
  const { abi } = await hre.artifacts.readArtifact("MoningoBadges");
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  fs.writeFileSync(path.join(dir, "badges.json"), JSON.stringify({ address, chainId, moningo, deployedAt: new Date().toISOString(), abi }, null, 2));
  console.log(`MoningoBadges: ${address} (moningo ${moningo}, verifier ${verifier})`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
