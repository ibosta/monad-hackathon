const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MoningoPractice", () => {
  async function deploy() {
    const [owner, verifier, alice] = await ethers.getSigners();
    const practice = await ethers.deployContract("MoningoPractice", [verifier.address]);
    await owner.sendTransaction({ to: await practice.getAddress(), value: ethers.parseEther("1") });
    const sign = async (user, level, signer = verifier) =>
      signer.signMessage(ethers.getBytes(await practice.checkpointDigest(user.address, level)));
    return { practice, owner, verifier, alice, sign };
  }

  it("buys energy packs at the exact price", async () => {
    const { practice, alice } = await loadFixture(deploy);
    await expect(practice.connect(alice).buyEnergy(2, { value: ethers.parseEther("0.02") }))
      .to.emit(practice, "EnergyPurchased")
      .withArgs(alice.address, 2, 10);
    expect(await practice.energyBought(alice.address)).to.equal(10);
    await expect(
      practice.connect(alice).buyEnergy(1, { value: ethers.parseEther("0.02") })
    ).to.be.revertedWithCustomError(practice, "WrongPayment");
    await expect(practice.connect(alice).buyEnergy(0, { value: 0 })).to.be.revertedWithCustomError(
      practice,
      "WrongPayment"
    );
  });

  it("pays a signed checkpoint reward exactly once", async () => {
    const { practice, alice, sign } = await loadFixture(deploy);
    const sig = await sign(alice, 10);
    await expect(practice.connect(alice).claimCheckpoint(10, sig)).to.changeEtherBalance(
      alice,
      ethers.parseEther("0.02")
    );
    await expect(practice.connect(alice).claimCheckpoint(10, sig)).to.be.revertedWithCustomError(
      practice,
      "AlreadyClaimed"
    );
  });

  it("rejects non-checkpoint levels and forged signatures", async () => {
    const { practice, alice, sign } = await loadFixture(deploy);
    await expect(
      practice.connect(alice).claimCheckpoint(7, await sign(alice, 7))
    ).to.be.revertedWithCustomError(practice, "BadCheckpoint");
    await expect(
      practice.connect(alice).claimCheckpoint(20, await sign(alice, 20, alice))
    ).to.be.revertedWithCustomError(practice, "BadSignature");
    await expect(
      practice.connect(alice).claimCheckpoint(20, await sign(alice, 10))
    ).to.be.revertedWithCustomError(practice, "BadSignature");
  });

  it("reverts when the pool is empty", async () => {
    const [, verifier, alice] = await ethers.getSigners();
    const practice = await ethers.deployContract("MoningoPractice", [verifier.address]);
    const sig = await verifier.signMessage(
      ethers.getBytes(await practice.checkpointDigest(alice.address, 10))
    );
    await expect(practice.connect(alice).claimCheckpoint(10, sig)).to.be.revertedWithCustomError(
      practice,
      "PoolEmpty"
    );
  });
});
