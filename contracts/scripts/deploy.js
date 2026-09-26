const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const verifier = process.env.VERIFIER_ADDRESS || deployer.address;
  console.log(`Deployer: ${deployer.address}\nVerifier: ${verifier}`);

  const moningo = await hre.ethers.deployContract("Moningo", [verifier]);
  await moningo.waitForDeployment();
  const address = await moningo.getAddress();
  console.log(`Moningo deployed: ${address}`);

  const seed = process.env.POOL_SEED_MON || "0";
  if (Number(seed) > 0) {
    const tx = await deployer.sendTransaction({ to: address, value: hre.ethers.parseEther(seed) });
    await tx.wait();
    console.log(`Reward pool seeded with ${seed} MON`);
  }

  // Shared deployment file consumed by the backend (/api/config) and frontend.
  const { abi } = await hre.artifacts.readArtifact("Moningo");
  const out = {
    address,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    abi,
  };
  const target = path.join(__dirname, "..", "..", "backend", "src", "contract", "moningo.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
  console.log(`Wrote ${path.relative(process.cwd(), target)}`);
  console.log(`Explorer: https://testnet.monadexplorer.com/address/${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
