const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const DAY = 86400;
const mon = (v) => ethers.parseEther(v);

describe("Moningo", () => {
  async function deploy() {
    const [owner, verifier, alice, bob] = await ethers.getSigners();
    const moningo = await ethers.deployContract("Moningo", [verifier.address]);
    await owner.sendTransaction({ to: await moningo.getAddress(), value: mon("5") });
    const sign = async (user, signer = verifier) =>
      signer.signMessage(ethers.getBytes(await moningo.dailyDigest(user.address)));
    const claim = async (user) => moningo.connect(user).completeDaily(await sign(user));
    return { moningo, owner, verifier, alice, bob, sign, claim };
  }

  describe("daily rewards (no stake)", () => {
    it("pays the day-1 reward and starts the streak", async () => {
      const { moningo, alice, claim } = await loadFixture(deploy);
      const tx = claim(alice);
      await expect(tx).to.changeEtherBalance(alice, mon("0.005"));
      await expect(tx).to.emit(moningo, "DailyCompleted").withArgs(alice.address, 1, mon("0.005"));
      const u = await moningo.getUser(alice.address);
      expect(u.streak).to.equal(1);
      expect(u.claimedToday).to.equal(true);
    });

    it("allows only one claim per UTC day", async () => {
      const { moningo, alice, claim } = await loadFixture(deploy);
      await claim(alice);
      await expect(claim(alice)).to.be.revertedWithCustomError(moningo, "AlreadyClaimedToday");
    });

    it("grows the streak on consecutive days and resets after a missed day", async () => {
      const { moningo, alice, claim } = await loadFixture(deploy);
      for (let d = 1; d <= 3; d++) {
        await claim(alice);
        expect(await moningo.userStreaks(alice.address)).to.equal(d);
        await time.increase(DAY);
      }
      expect(await moningo.currentStreak(alice.address)).to.equal(3); // claimed yesterday: still alive
      await time.increase(DAY); // skip a day
      expect(await moningo.currentStreak(alice.address)).to.equal(0);
      await claim(alice);
      expect(await moningo.userStreaks(alice.address)).to.equal(1);
    });

    it("reward tiers grow with the streak", async () => {
      const { moningo } = await loadFixture(deploy);
      const cases = [
        [1, "0.005"],
        [6, "0.005"],
        [7, "0.01"],
        [30, "0.015"],
        [100, "0.02"],
        [365, "0.025"],
        [1000, "0.03"],
        [5000, "0.03"],
      ];
      for (const [streak, reward] of cases)
        expect(await moningo.rewardFor(streak)).to.equal(mon(reward));
    });

    it("pays the 7-day tier on the 7th consecutive day", async () => {
      const { moningo, alice, claim } = await loadFixture(deploy);
      for (let d = 1; d <= 6; d++) {
        await claim(alice);
        await time.increase(DAY);
      }
      expect((await moningo.getUser(alice.address)).nextReward).to.equal(mon("0.01"));
      await expect(claim(alice)).to.changeEtherBalance(alice, mon("0.01"));
    });

    it("signatures are bound to the user, the verifier and the day", async () => {
      const { moningo, alice, bob, sign } = await loadFixture(deploy);
      await expect(
        moningo.connect(alice).completeDaily(await sign(alice, alice))
      ).to.be.revertedWithCustomError(moningo, "BadSignature");
      await expect(
        moningo.connect(bob).completeDaily(await sign(alice))
      ).to.be.revertedWithCustomError(moningo, "BadSignature");
      const yesterday = await sign(alice);
      await time.increase(DAY);
      await expect(moningo.connect(alice).completeDaily(yesterday)).to.be.revertedWithCustomError(
        moningo,
        "BadSignature"
      );
    });

    it("keeps the streak but skips the reward when the pool is empty", async () => {
      const [, verifier, alice] = await ethers.getSigners();
      const moningo = await ethers.deployContract("Moningo", [verifier.address]);
      const sig = await verifier.signMessage(
        ethers.getBytes(await moningo.dailyDigest(alice.address))
      );
      const tx = moningo.connect(alice).completeDaily(sig);
      await expect(tx).to.changeEtherBalance(alice, 0);
      await expect(tx).to.emit(moningo, "DailyCompleted").withArgs(alice.address, 1, 0);
    });
  });

  describe("level test certificate", () => {
    const FEE = mon("0.05");
    const signExam = async (moningo, signer, user, level) =>
      signer.signMessage(ethers.getBytes(await moningo.examDigest(user.address, level)));

    it("paid level test mints a soulbound CEFR certificate", async () => {
      const { moningo, verifier, alice, bob } = await loadFixture(deploy);
      await expect(moningo.connect(alice).claimCertificate(3, "0x")).to.be.revertedWithCustomError(
        moningo,
        "NoPaidExam"
      );
      await expect(
        moningo.connect(alice).startLevelTest({ value: 1n })
      ).to.be.revertedWithCustomError(moningo, "WrongFee");
      const poolBefore = await moningo.rewardPool();
      await expect(moningo.connect(alice).startLevelTest({ value: FEE })).to.emit(
        moningo,
        "LevelTestStarted"
      );
      expect(await moningo.rewardPool()).to.equal(poolBefore + FEE);

      await expect(
        moningo.connect(alice).claimCertificate(4, await signExam(moningo, verifier, alice, 3))
      ).to.be.revertedWithCustomError(moningo, "BadSignature");
      const sig = await signExam(moningo, verifier, alice, 3);
      await expect(moningo.connect(alice).claimCertificate(3, sig))
        .to.emit(moningo, "CertificateMinted")
        .withArgs(alice.address, 1, 3);
      await expect(moningo.connect(alice).claimCertificate(3, sig)).to.be.revertedWithCustomError(
        moningo,
        "NoPaidExam"
      );
      expect(await moningo.ownerOf(1)).to.equal(alice.address);
      expect(await moningo.levelOf(alice.address)).to.equal(3);

      const meta = JSON.parse(
        Buffer.from((await moningo.tokenURI(1)).split(",")[1], "base64").toString()
      );
      expect(meta.name).to.equal("Moningo Certificate #1");
      expect(meta.attributes[0].value).to.equal("B1");
      expect(meta.image).to.match(/^data:image\/svg\+xml;base64,/);

      await expect(
        moningo.connect(alice).transferFrom(alice.address, bob.address, 1)
      ).to.be.revertedWithCustomError(moningo, "Soulbound");
    });

    it("rejects out-of-range levels", async () => {
      const { moningo, verifier, alice } = await loadFixture(deploy);
      await moningo.connect(alice).startLevelTest({ value: FEE });
      await expect(
        moningo.connect(alice).claimCertificate(6, await signExam(moningo, verifier, alice, 6))
      ).to.be.revertedWithCustomError(moningo, "BadLevel");
    });
  });

  it("only the owner can withdraw from the pool", async () => {
    const { moningo, owner, alice } = await loadFixture(deploy);
    await expect(moningo.connect(owner).withdrawPool(mon("1"))).to.changeEtherBalance(
      owner,
      mon("1")
    );
    await expect(moningo.connect(alice).withdrawPool(1)).to.be.revertedWithCustomError(
      moningo,
      "OwnableUnauthorizedAccount"
    );
  });
});
