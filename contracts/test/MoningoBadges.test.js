const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MoningoBadges", () => {
  async function deploy() {
    const [owner, verifier, alice, bob] = await ethers.getSigners();
    const moningo = await ethers.deployContract("Moningo", [verifier.address]);
    await owner.sendTransaction({ to: await moningo.getAddress(), value: ethers.parseEther("5") });
    const badges = await ethers.deployContract("MoningoBadges", [
      await moningo.getAddress(),
      verifier.address,
    ]);
    const completeDays = async (user, n) => {
      for (let i = 0; i < n; i++) {
        const sig = await verifier.signMessage(
          ethers.getBytes(await moningo.dailyDigest(user.address))
        );
        await moningo.connect(user).completeDaily(sig);
        await time.increase(86400);
      }
    };
    const signBadge = async (user, id, signer = verifier) =>
      signer.signMessage(ethers.getBytes(await badges.badgeDigest(user.address, id)));
    return { badges, alice, bob, completeDays, signBadge };
  }

  it("streak badge requires the on-chain streak and mints once", async () => {
    const { badges, alice, completeDays } = await loadFixture(deploy);
    await expect(badges.connect(alice).claimStreakBadge(1)).to.be.revertedWithCustomError(
      badges,
      "NotEarned"
    );
    await completeDays(alice, 10);
    await expect(badges.connect(alice).claimStreakBadge(1))
      .to.emit(badges, "BadgeMinted")
      .withArgs(alice.address, 1, 1);
    await expect(badges.connect(alice).claimStreakBadge(1)).to.be.revertedWithCustomError(
      badges,
      "AlreadyOwned"
    );
    await expect(badges.connect(alice).claimStreakBadge(2)).to.be.revertedWithCustomError(
      badges,
      "NotEarned"
    );
    const meta = JSON.parse(
      Buffer.from((await badges.tokenURI(1)).split(",")[1], "base64").toString()
    );
    expect(meta.name).to.equal("10-Day Streak");
    expect(meta.attributes[1].value).to.equal("Streak");
  });

  it("duel badge needs a verifier signature bound to user and badge", async () => {
    const { badges, alice, bob, signBadge } = await loadFixture(deploy);
    await expect(
      badges.connect(alice).claimDuelBadge(11, await signBadge(alice, 11, alice))
    ).to.be.revertedWithCustomError(badges, "BadSignature");
    await expect(
      badges.connect(bob).claimDuelBadge(11, await signBadge(alice, 11))
    ).to.be.revertedWithCustomError(badges, "BadSignature");
    await expect(
      badges.connect(alice).claimDuelBadge(12, await signBadge(alice, 11))
    ).to.be.revertedWithCustomError(badges, "BadSignature");
    await expect(badges.connect(alice).claimDuelBadge(11, await signBadge(alice, 11))).to.emit(
      badges,
      "BadgeMinted"
    );
  });

  it("rejects wrong badge kinds and transfers", async () => {
    const { badges, alice, bob, signBadge } = await loadFixture(deploy);
    await expect(badges.connect(alice).claimStreakBadge(11)).to.be.revertedWithCustomError(
      badges,
      "UnknownBadge"
    );
    await expect(
      badges.connect(alice).claimDuelBadge(1, await signBadge(alice, 1))
    ).to.be.revertedWithCustomError(badges, "UnknownBadge");
    await expect(badges.connect(alice).claimStreakBadge(99)).to.be.revertedWithCustomError(
      badges,
      "UnknownBadge"
    );
    await badges.connect(alice).claimDuelBadge(13, await signBadge(alice, 13));
    await expect(
      badges.connect(alice).transferFrom(alice.address, bob.address, 1)
    ).to.be.revertedWithCustomError(badges, "Soulbound");
  });
});
