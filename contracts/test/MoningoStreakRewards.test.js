const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MoningoStreakRewards", () => {
  async function deploy() {
    const [owner, verifier, alice, bob] = await ethers.getSigners();
    const moningo = await ethers.deployContract("Moningo", [verifier.address]);
    const tree = await ethers.deployContract("MoningoStreakRewards", [await moningo.getAddress()]);
    await owner.sendTransaction({ to: await tree.getAddress(), value: ethers.parseEther("2") });
    const completeDays = async (user, n) => {
      for (let i = 0; i < n; i++) {
        await moningo.connect(user).startStreak({ value: ethers.parseEther("0.1") });
        const sig = await verifier.signMessage(
          ethers.getBytes(await moningo.taskDigest(user.address))
        );
        await moningo.connect(user).completeEnglishTask(sig);
      }
    };
    return { moningo, tree, owner, alice, bob, completeDays };
  }

  it("exposes growing milestone rewards", async () => {
    const { tree } = await loadFixture(deploy);
    const [days, rewards] = await tree.milestones();
    expect(days.map(Number)).to.deep.equal([1, 3, 5, 7, 10, 14, 21, 30, 50, 100]);
    for (let i = 1; i < rewards.length; i++) expect(rewards[i]).to.be.greaterThan(rewards[i - 1]);
  });

  it("pays a milestone once the on-chain streak reaches it, only once", async () => {
    const { tree, alice, completeDays } = await loadFixture(deploy);
    await expect(tree.connect(alice).claim(1)).to.be.revertedWithCustomError(
      tree,
      "StreakTooShort"
    );
    await completeDays(alice, 3);
    await expect(tree.connect(alice).claim(1)).to.changeEtherBalance(
      alice,
      ethers.parseEther("0.005")
    );
    await expect(tree.connect(alice).claim(3))
      .to.emit(tree, "MilestoneClaimed")
      .withArgs(alice.address, 3, ethers.parseEther("0.01"));
    await expect(tree.connect(alice).claim(3)).to.be.revertedWithCustomError(
      tree,
      "AlreadyClaimed"
    );
    await expect(tree.connect(alice).claim(5)).to.be.revertedWithCustomError(
      tree,
      "StreakTooShort"
    );
  });

  it("rejects non-milestone days and empty pools", async () => {
    const { moningo, tree, alice, completeDays } = await loadFixture(deploy);
    await completeDays(alice, 2);
    await expect(tree.connect(alice).claim(2)).to.be.revertedWithCustomError(tree, "NotAMilestone");
    const empty = await ethers.deployContract("MoningoStreakRewards", [await moningo.getAddress()]);
    await expect(empty.connect(alice).claim(1)).to.be.revertedWithCustomError(empty, "PoolEmpty");
  });
});
