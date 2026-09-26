// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title MoningoPractice - level map economy: buy energy with MON, earn MON at checkpoints.
/// @notice Energy itself lives off-chain (regenerates over time); this contract takes payments for
///         extra energy (which fund the pool) and pays one-time checkpoint rewards signed by the backend.
contract MoningoPractice is Ownable {
    uint256 public constant ENERGY_PACK_PRICE = 0.01 ether;
    uint256 public constant ENERGY_PER_PACK = 5;
    uint256 public constant CHECKPOINT_EVERY = 10; // levels
    uint256 public constant CHECKPOINT_REWARD = 0.02 ether;

    address public verifier;
    mapping(address => mapping(uint256 => bool)) public checkpointClaimed;
    mapping(address => uint256) public energyBought; // total energy units ever bought

    event EnergyPurchased(address indexed user, uint256 packs, uint256 energy);
    event CheckpointClaimed(address indexed user, uint256 indexed checkpoint, uint256 reward);

    error WrongPayment();
    error BadCheckpoint();
    error AlreadyClaimed();
    error BadSignature();
    error PoolEmpty();
    error TransferFailed();

    constructor(address _verifier) Ownable(msg.sender) {
        verifier = _verifier;
    }

    receive() external payable {}

    function buyEnergy(uint256 packs) external payable {
        if (packs == 0 || msg.value != packs * ENERGY_PACK_PRICE) revert WrongPayment();
        energyBought[msg.sender] += packs * ENERGY_PER_PACK;
        emit EnergyPurchased(msg.sender, packs, packs * ENERGY_PER_PACK);
    }

    /// @param level the checkpoint level reached (10, 20, 30, ...)
    function claimCheckpoint(uint256 level, bytes calldata signature) external {
        if (level == 0 || level % CHECKPOINT_EVERY != 0) revert BadCheckpoint();
        if (checkpointClaimed[msg.sender][level]) revert AlreadyClaimed();
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(checkpointDigest(msg.sender, level));
        if (ECDSA.recover(digest, signature) != verifier) revert BadSignature();
        if (address(this).balance < CHECKPOINT_REWARD) revert PoolEmpty();
        checkpointClaimed[msg.sender][level] = true;
        (bool ok,) = msg.sender.call{value: CHECKPOINT_REWARD}("");
        if (!ok) revert TransferFailed();
        emit CheckpointClaimed(msg.sender, level, CHECKPOINT_REWARD);
    }

    function checkpointDigest(address user, uint256 level) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, "CHECKPOINT", user, level));
    }

    function setVerifier(address _verifier) external onlyOwner {
        verifier = _verifier;
    }

    function withdraw(uint256 amount) external onlyOwner {
        (bool ok,) = owner().call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
