const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const STAKE = ethers.parseEther("0.5");
const nonce = ethers.id("match-1");

describe("MoningoDuel", () => {
  async function deploy() {
    const [owner, referee, alice, bob, eve] = await ethers.getSigners();
    const duel = await ethers.deployContract("MoningoDuel", [referee.address]);
    const id = await duel.matchIdOf(alice.address, bob.address, nonce);
    return { duel, owner, referee, alice, bob, eve, id };
  }

  async function joined() {
    const f = await deploy();
    await f.duel.connect(f.alice).join(nonce, f.bob.address, { value: STAKE });
    await f.duel.connect(f.bob).join(nonce, f.alice.address, { value: STAKE });
    return f;
  }

  it("match id is symmetric and both players land in the same match", async () => {
    const { duel, alice, bob, id } = await joined();
    expect(await duel.matchIdOf(bob.address, alice.address, nonce)).to.equal(id);
    const m = await duel.matches(id);
    expect(m.p1).to.equal(alice.address);
    expect(m.p2).to.equal(bob.address);
  });

  it("rejects wrong stake, self-match and double join", async () => {
    const { duel, alice, bob } = await loadFixture(deploy);
    await expect(
      duel.connect(alice).join(nonce, bob.address, { value: 1n })
    ).to.be.revertedWithCustomError(duel, "WrongStake");
    await expect(
      duel.connect(alice).join(nonce, alice.address, { value: STAKE })
    ).to.be.revertedWithCustomError(duel, "NotYourMatch");
    await duel.connect(alice).join(nonce, bob.address, { value: STAKE });
    await expect(
      duel.connect(alice).join(nonce, bob.address, { value: STAKE })
    ).to.be.revertedWithCustomError(duel, "AlreadyJoined");
  });

  it("a third party cannot take a seat (different match id)", async () => {
    const { duel, alice, bob, eve, id } = await loadFixture(deploy);
    await duel.connect(alice).join(nonce, bob.address, { value: STAKE });
    await duel.connect(eve).join(nonce, alice.address, { value: STAKE });
    expect((await duel.matches(id)).p2).to.equal(ethers.ZeroAddress);
  });

  it("winner gets 0.99 MON, fee accrues 0.01", async () => {
    const { duel, referee, bob, id } = await joined();
    const tx = duel.connect(referee).settle(id, bob.address);
    await expect(tx).to.changeEtherBalance(bob, ethers.parseEther("0.99"));
    await expect(tx).to.emit(duel, "Settled").withArgs(id, bob.address, ethers.parseEther("0.99"));
    expect(await duel.feesAccrued()).to.equal(ethers.parseEther("0.01"));
    await expect(duel.connect(referee).settle(id, bob.address)).to.be.revertedWithCustomError(
      duel,
      "MatchClosed"
    );
  });

  it("draw refunds both without fee", async () => {
    const { duel, referee, alice, bob, id } = await joined();
    await expect(duel.connect(referee).settle(id, ethers.ZeroAddress)).to.changeEtherBalances(
      [alice, bob],
      [STAKE, STAKE]
    );
    expect(await duel.feesAccrued()).to.equal(0);
  });

  it("only the referee settles, only players can win, and match must be full", async () => {
    const { duel, referee, alice, bob, eve, id } = await loadFixture(deploy);
    await duel.connect(alice).join(nonce, bob.address, { value: STAKE });
    await expect(duel.connect(referee).settle(id, alice.address)).to.be.revertedWithCustomError(
      duel,
      "NotReady"
    );
    await duel.connect(bob).join(nonce, alice.address, { value: STAKE });
    await expect(duel.connect(alice).settle(id, alice.address)).to.be.revertedWithCustomError(
      duel,
      "NotReferee"
    );
    await expect(duel.connect(referee).settle(id, eve.address)).to.be.revertedWithCustomError(
      duel,
      "BadWinner"
    );
  });

  it("referee can cancel a half-joined match; others only after timeout", async () => {
    const { duel, referee, alice, bob, eve, id } = await loadFixture(deploy);
    await duel.connect(alice).join(nonce, bob.address, { value: STAKE });
    await expect(duel.connect(eve).cancel(id)).to.be.revertedWithCustomError(duel, "TooEarly");
    await expect(duel.connect(referee).cancel(id)).to.changeEtherBalance(alice, STAKE);
    await expect(
      duel.connect(bob).join(nonce, alice.address, { value: STAKE })
    ).to.be.revertedWithCustomError(duel, "MatchClosed");
  });

  it("anyone can refund an unsettled full match after SETTLE_TIMEOUT", async () => {
    const { duel, referee, alice, bob, eve, id } = await joined();
    await expect(duel.connect(referee).cancel(id)).to.be.revertedWithCustomError(duel, "TooEarly");
    await time.increase(3601);
    await expect(duel.connect(eve).cancel(id)).to.changeEtherBalances([alice, bob], [STAKE, STAKE]);
  });

  it("owner withdraws only accrued fees", async () => {
    const { duel, owner, referee, alice, id } = await joined();
    await duel.connect(referee).settle(id, alice.address);
    await expect(duel.connect(owner).withdrawFees(owner.address)).to.changeEtherBalance(
      owner,
      ethers.parseEther("0.01")
    );
    await expect(duel.connect(alice).withdrawFees(alice.address)).to.be.revertedWithCustomError(
      duel,
      "OwnableUnauthorizedAccount"
    );
  });
});
