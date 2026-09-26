// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Moningo - stake MON, learn English daily, earn MON and an NFT certificate.
/// @notice Flow: startStreak (stake 0.1 MON) -> finish lessons -> completeEnglishTask
///         (stake back + reward) -> after CERT_THRESHOLD tasks, claimCertificate (NFT).
contract Moningo is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant DAILY_STAKE = 0.1 ether;
    uint256 public constant REWARD = 0.01 ether;
    uint256 public constant CERT_THRESHOLD = 3;

    /// @notice Backend key that attests a user actually finished the day's lessons.
    address public verifier;

    mapping(address => uint256) public streakTimestamps; // 0 = no active stake
    mapping(address => uint256) public userStreaks;
    mapping(address => uint256) public certificateOf; // tokenId, 0 = none

    /// @notice MON currently held on behalf of users' active stakes (not rewardable).
    uint256 public totalLocked;
    uint256 public nextTokenId = 1;

    event StreakStarted(address indexed user, uint256 timestamp);
    event TaskCompleted(address indexed user, uint256 newStreak);
    event RewardPaid(address indexed user, uint256 amount);
    event StreakLost(address indexed user, uint256 forfeited);
    event CertificateMinted(address indexed user, uint256 indexed tokenId, uint256 streak);
    event VerifierUpdated(address verifier);

    error WrongStake();
    error StreakActive();
    error NoActiveStreak();
    error StreakExpired();
    error BadSignature();
    error NotEligible();
    error AlreadyCertified();
    error Soulbound();
    error TransferFailed();

    constructor(address _verifier) ERC721("Moningo English Certificate", "MONINGO") Ownable(msg.sender) {
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    /// @notice Anyone can top up the reward pool by sending MON.
    receive() external payable {}

    // ----------------------------------------------------------------- core

    function startStreak() external payable {
        if (msg.value != DAILY_STAKE) revert WrongStake();
        uint256 started = streakTimestamps[msg.sender];
        if (started != 0) {
            if (block.timestamp <= started + 1 days) revert StreakActive();
            // Previous stake expired unclaimed: it stays in the pool and the streak resets.
            totalLocked -= DAILY_STAKE;
            userStreaks[msg.sender] = 0;
            emit StreakLost(msg.sender, DAILY_STAKE);
        }
        streakTimestamps[msg.sender] = block.timestamp;
        totalLocked += DAILY_STAKE;
        emit StreakStarted(msg.sender, block.timestamp);
    }

    /// @param signature Verifier signature over taskDigest(msg.sender), issued by the backend
    ///        once the user's lessons are done. Single-use: the stake timestamp acts as nonce.
    function completeEnglishTask(bytes calldata signature) external {
        uint256 started = streakTimestamps[msg.sender];
        if (started == 0) revert NoActiveStreak();
        if (block.timestamp > started + 1 days) revert StreakExpired();
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(taskDigest(msg.sender));
        if (ECDSA.recover(digest, signature) != verifier) revert BadSignature();

        // Effects before interaction.
        streakTimestamps[msg.sender] = 0;
        totalLocked -= DAILY_STAKE;
        uint256 newStreak = ++userStreaks[msg.sender];

        uint256 payout = DAILY_STAKE;
        bool rewarded = rewardPool() >= REWARD + DAILY_STAKE; // pool computed before payout leaves
        if (rewarded) payout += REWARD;

        (bool ok,) = msg.sender.call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit TaskCompleted(msg.sender, newStreak);
        if (rewarded) emit RewardPaid(msg.sender, REWARD);
    }

    function claimCertificate() external returns (uint256 tokenId) {
        if (userStreaks[msg.sender] < CERT_THRESHOLD) revert NotEligible();
        if (certificateOf[msg.sender] != 0) revert AlreadyCertified();
        tokenId = nextTokenId++;
        certificateOf[msg.sender] = tokenId;
        _certStreak[tokenId] = userStreaks[msg.sender];
        _safeMint(msg.sender, tokenId);
        emit CertificateMinted(msg.sender, tokenId, userStreaks[msg.sender]);
    }

    // ---------------------------------------------------------------- views

    /// @notice Message the backend signs (EIP-191 personal_sign over these 32 bytes).
    function taskDigest(address user) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, user, streakTimestamps[user]));
    }

    /// @notice MON available for rewards (balance minus active stakes).
    function rewardPool() public view returns (uint256) {
        return address(this).balance - totalLocked;
    }

    function getUser(address user)
        external
        view
        returns (uint256 streak, uint256 stakedAt, bool active, uint256 certificateId)
    {
        stakedAt = streakTimestamps[user];
        active = stakedAt != 0 && block.timestamp <= stakedAt + 1 days;
        return (userStreaks[user], stakedAt, active, certificateOf[user]);
    }

    // ---------------------------------------------------------- certificate

    mapping(uint256 => uint256) private _certStreak;

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        address holder = _requireOwned(tokenId);
        string memory addr = Strings.toHexString(holder);
        string memory streak = _certStreak[tokenId].toString();
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">',
            '<rect width="600" height="400" rx="24" fill="#200052"/>',
            '<rect x="16" y="16" width="568" height="368" rx="16" fill="none" stroke="#836EF9" stroke-width="4"/>',
            '<text x="300" y="110" font-family="Arial" font-size="40" fill="#fff" text-anchor="middle" font-weight="bold">MONINGO</text>',
            '<text x="300" y="160" font-family="Arial" font-size="22" fill="#A0055D" text-anchor="middle">English Certificate</text>',
            '<text x="300" y="230" font-family="Arial" font-size="18" fill="#fff" text-anchor="middle">Completed ',
            streak,
            ' daily lessons on Monad</text>',
            '<text x="300" y="300" font-family="monospace" font-size="13" fill="#836EF9" text-anchor="middle">',
            addr,
            '</text></svg>'
        );
        string memory json = string.concat(
            '{"name":"Moningo Certificate #',
            tokenId.toString(),
            '","description":"Proof of completing daily English lessons on Moningo (Monad).",',
            '"attributes":[{"trait_type":"Lessons","value":',
            streak,
            '}],"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @dev Certificates are soulbound: mint only, no transfers.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    // ---------------------------------------------------------------- admin

    function setVerifier(address _verifier) external onlyOwner {
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    /// @notice Withdraw only surplus pool funds; user stakes are never touchable.
    function withdrawPool(uint256 amount) external onlyOwner {
        require(amount <= rewardPool(), "exceeds pool");
        (bool ok,) = owner().call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
