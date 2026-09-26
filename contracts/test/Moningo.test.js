const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const STAKE = ethers.parseEther("0.1");
const REWARD = ethers.parseEther("0.01");

describe("Moningo", () => {
  async function deploy() {
    const [owner, verifier, alice, bob] = await ethers.getSigners();
    const moningo = await ethers.deployContract("Moningo", [verifier.address]);
    await owner.sendTransaction({ to: await moningo.getAddress(), value: ethers.parseEther("1") });
    const sign = async (user, signer = verifier) =>
      signer.signMessage(ethers.getBytes(await moningo.taskDigest(user.address)));
    return { moningo, owner, verifier, alice, bob, sign };
  }

  async function completeDay(moningo, user, sign) {
    await moningo.connect(user).startStreak({ value: STAKE });
    await moningo.connect(user).completeEnglishTask(await sign(user));
  }

  it("stakes and emits StreakStarted", async () => {
    const { moningo, alice } = await loadFixture(deploy);
    await expect(moningo.connect(alice).startStreak({ value: STAKE })).to.emit(moningo, "StreakStarted");
    expect(await moningo.totalLocked()).to.equal(STAKE);
  });

  it("rejects wrong stake and double start", async () => {
    const { moningo, alice } = await loadFixture(deploy);
    await expect(moningo.connect(alice).startStreak({ value: 1n })).to.be.revertedWithCustomError(moningo, "WrongStake");
    await moningo.connect(alice).startStreak({ value: STAKE });
    await expect(moningo.connect(alice).startStreak({ value: STAKE })).to.be.revertedWithCustomError(moningo, "StreakActive");
  });

  it("refunds stake + reward on completion with verifier signature", async () => {
    const { moningo, alice, sign } = await loadFixture(deploy);
    await moningo.connect(alice).startStreak({ value: STAKE });
    const sig = await sign(alice);
    const tx = moningo.connect(alice).completeEnglishTask(sig);
    await expect(tx).to.changeEtherBalance(alice, STAKE + REWARD);
    await expect(tx).to.emit(moningo, "TaskCompleted").withArgs(alice.address, 1);
    await expect(tx).to.emit(moningo, "RewardPaid").withArgs(alice.address, REWARD);
    expect(await moningo.totalLocked()).to.equal(0);
  });

  it("signature cannot be replayed", async () => {
    const { moningo, alice, sign } = await loadFixture(deploy);
    await moningo.connect(alice).startStreak({ value: STAKE });
    const sig = await sign(alice);
    await moningo.connect(alice).completeEnglishTask(sig);
    await expect(moningo.connect(alice).completeEnglishTask(sig)).to.be.revertedWithCustomError(moningo, "NoActiveStreak");
    await moningo.connect(alice).startStreak({ value: STAKE });
    await expect(moningo.connect(alice).completeEnglishTask(sig)).to.be.revertedWithCustomError(moningo, "BadSignature");
  });

  it("rejects non-verifier signatures and other users' signatures", async () => {
    const { moningo, alice, bob, sign } = await loadFixture(deploy);
    await moningo.connect(alice).startStreak({ value: STAKE });
    await expect(moningo.connect(alice).completeEnglishTask(await sign(alice, alice))).to.be.revertedWithCustomError(moningo, "BadSignature");
    await moningo.connect(bob).startStreak({ value: STAKE });
    await expect(moningo.connect(bob).completeEnglishTask(await sign(alice))).to.be.revertedWithCustomError(moningo, "BadSignature");
  });

  it("expired stake is forfeited to pool and streak resets", async () => {
    const { moningo, alice, sign } = await loadFixture(deploy);
    await completeDay(moningo, alice, sign);
    await moningo.connect(alice).startStreak({ value: STAKE });
    await time.increase(86401);
    await expect(moningo.connect(alice).completeEnglishTask(await sign(alice))).to.be.revertedWithCustomError(moningo, "StreakExpired");
    await expect(moningo.connect(alice).startStreak({ value: STAKE })).to.emit(moningo, "StreakLost");
    expect(await moningo.userStreaks(alice.address)).to.equal(0);
    expect(await moningo.totalLocked()).to.equal(STAKE);
  });

  it("refunds stake without reward when pool is empty", async () => {
    const [, verifier, alice] = await ethers.getSigners();
    const moningo = await ethers.deployContract("Moningo", [verifier.address]);
    await moningo.connect(alice).startStreak({ value: STAKE });
    const sig = await verifier.signMessage(ethers.getBytes(await moningo.taskDigest(alice.address)));
    const tx = moningo.connect(alice).completeEnglishTask(sig);
    await expect(tx).to.changeEtherBalance(alice, STAKE);
    await expect(tx).not.to.emit(moningo, "RewardPaid");
  });

  it("mints a soulbound certificate after 3 completions", async () => {
    const { moningo, alice, bob, sign } = await loadFixture(deploy);
    await expect(moningo.connect(alice).claimCertificate()).to.be.revertedWithCustomError(moningo, "NotEligible");
    for (let i = 0; i < 3; i++) await completeDay(moningo, alice, sign);
    await expect(moningo.connect(alice).claimCertificate()).to.emit(moningo, "CertificateMinted").withArgs(alice.address, 1, 3);
    await expect(moningo.connect(alice).claimCertificate()).to.be.revertedWithCustomError(moningo, "AlreadyCertified");
    expect(await moningo.ownerOf(1)).to.equal(alice.address);

    const uri = await moningo.tokenURI(1);
    const meta = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
    expect(meta.name).to.equal("Moningo Certificate #1");
    expect(meta.image).to.match(/^data:image\/svg\+xml;base64,/);

    await expect(moningo.connect(alice).transferFrom(alice.address, bob.address, 1)).to.be.revertedWithCustomError(moningo, "Soulbound");
  });

  it("owner can only withdraw surplus, never user stakes", async () => {
    const { moningo, owner, alice } = await loadFixture(deploy);
    await moningo.connect(alice).startStreak({ value: STAKE });
    await expect(moningo.connect(owner).withdrawPool(ethers.parseEther("1.01"))).to.be.revertedWith("exceeds pool");
    await expect(moningo.connect(owner).withdrawPool(ethers.parseEther("1"))).to.changeEtherBalance(owner, ethers.parseEther("1"));
    await expect(moningo.connect(alice).withdrawPool(1)).to.be.revertedWithCustomError(moningo, "OwnableUnauthorizedAccount");
  });
});
