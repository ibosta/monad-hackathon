// Deploys MoningoDuel + MoningoPractice and writes their address/ABI for the backend.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function deploy(name, args) {
  const c = await hre.ethers.deployContract(name, args);
  await c.waitForDeployment();
  const address = await c.getAddress();
  const { abi } = await hre.artifacts.readArtifact(name);
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  const file = path.join(__dirname, "..", "..", "backend", "src", "contract", `${name.replace("Moningo", "").toLowerCase()}.json`);
  fs.writeFileSync(file, JSON.stringify({ address, chainId, deployedAt: new Date().toISOString(), abi }, null, 2));
  console.log(`${name}: ${address} -> ${path.basename(file)}`);
  return address;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const verifier = process.env.VERIFIER_ADDRESS || deployer.address;
  await deploy("MoningoDuel", [verifier]);
  const practice = await deploy("MoningoPractice", [verifier]);
  const seed = process.env.PRACTICE_POOL_SEED_MON || "0.3";
  await (await deployer.sendTransaction({ to: practice, value: hre.ethers.parseEther(seed) })).wait();
  console.log(`Practice pool seeded with ${seed} MON`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
