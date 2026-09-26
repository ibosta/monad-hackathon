// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Moningo - learn English daily, earn MON that grows with your streak, get NFT certificates.
/// @notice Daily: finish lessons -> backend signs today's digest -> completeDaily(sig) pays a reward
///         that grows with the streak (no stake needed). One claim per UTC day; missing a day resets
///         the streak. Certificate: startLevelTest (fee funds the pool) -> backend-graded exam ->
///         claimCertificate(level, sig) mints a soulbound on-chain SVG NFT with the CEFR level.
contract Moningo is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant EXAM_FEE = 0.05 ether;
    uint8 public constant MAX_LEVEL = 5; // 1=A1 .. 5=C1

    /// @notice Backend key that attests a user actually finished the day's lessons / exam.
    address public verifier;

    mapping(address => uint256) public userStreaks; // streak as of the last claim
    mapping(address => uint256) public lastClaimDay; // UTC day index of the last claim, 0 = never
    mapping(address => uint256) public certificateOf; // latest tokenId, 0 = none
    mapping(address => uint256) public examPaidAt; // 0 = no paid attempt pending
    mapping(address => uint8) public levelOf; // highest certified level

    uint256 public nextTokenId = 1;

    event DailyCompleted(address indexed user, uint256 streak, uint256 reward);
    event LevelTestStarted(address indexed user, uint256 timestamp);
    event CertificateMinted(address indexed user, uint256 indexed tokenId, uint8 level);
    event VerifierUpdated(address verifier);

    error AlreadyClaimedToday();
    error BadSignature();
    error WrongFee();
    error NoPaidExam();
    error BadLevel();
    error Soulbound();
    error TransferFailed();

    constructor(address _verifier) ERC721("Moningo English Certificate", "MONINGO") Ownable(msg.sender) {
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    /// @notice Anyone can top up the reward pool by sending MON.
    receive() external payable {}

    // ----------------------------------------------------------------- daily

    /// @notice Daily reward tiers: the longer the streak, the more MON per day.
    function rewardFor(uint256 streak) public pure returns (uint256) {
        if (streak >= 1000) return 0.03 ether;
        if (streak >= 365) return 0.025 ether;
        if (streak >= 100) return 0.02 ether;
        if (streak >= 30) return 0.015 ether;
        if (streak >= 7) return 0.01 ether;
        return 0.005 ether;
    }

    function today() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    /// @notice Streak still alive (claimed today or yesterday), otherwise 0.
    function currentStreak(address user) public view returns (uint256) {
        uint256 last = lastClaimDay[user];
        return last != 0 && last + 1 >= today() ? userStreaks[user] : 0;
    }

    /// @param signature Verifier signature over dailyDigest(msg.sender): bound to user and UTC day.
    function completeDaily(bytes calldata signature) external {
        uint256 day = today();
        if (lastClaimDay[msg.sender] == day) revert AlreadyClaimedToday();
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(dailyDigest(msg.sender));
        if (ECDSA.recover(digest, signature) != verifier) revert BadSignature();

        uint256 streak = lastClaimDay[msg.sender] + 1 == day ? userStreaks[msg.sender] + 1 : 1;
        userStreaks[msg.sender] = streak;
        lastClaimDay[msg.sender] = day;

        // An empty pool never blocks the streak; the reward is simply skipped.
        uint256 reward = rewardFor(streak);
        if (address(this).balance < reward) reward = 0;
        if (reward > 0) {
            (bool ok, ) = msg.sender.call{ value: reward }("");
            if (!ok) revert TransferFailed();
        }
        emit DailyCompleted(msg.sender, streak, reward);
    }

    /// @notice Pay the exam fee to unlock one certification attempt. Fee funds daily rewards.
    function startLevelTest() external payable {
        if (msg.value != EXAM_FEE) revert WrongFee();
        examPaidAt[msg.sender] = block.timestamp;
        emit LevelTestStarted(msg.sender, block.timestamp);
    }

    /// @param level CEFR level 1..5 (A1..C1) graded by the backend.
    /// @param signature Verifier signature over examDigest(msg.sender, level).
    function claimCertificate(uint8 level, bytes calldata signature) external returns (uint256 tokenId) {
        if (examPaidAt[msg.sender] == 0) revert NoPaidExam();
        if (level == 0 || level > MAX_LEVEL) revert BadLevel();
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(examDigest(msg.sender, level));
        if (ECDSA.recover(digest, signature) != verifier) revert BadSignature();

        examPaidAt[msg.sender] = 0;
        if (level > levelOf[msg.sender]) levelOf[msg.sender] = level;
        tokenId = nextTokenId++;
        certificateOf[msg.sender] = tokenId;
        _certLevel[tokenId] = level;
        _certStreak[tokenId] = userStreaks[msg.sender];
        _safeMint(msg.sender, tokenId);
        emit CertificateMinted(msg.sender, tokenId, level);
    }

    // ---------------------------------------------------------------- views

    /// @notice Message the backend signs (EIP-191 personal_sign over these 32 bytes) for today's claim.
    function dailyDigest(address user) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, "DAILY", user, today()));
    }

    /// @notice Message the backend signs for a graded level test. examPaidAt acts as nonce.
    function examDigest(address user, uint8 level) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, "EXAM", user, level, examPaidAt[user]));
    }

    /// @notice MON available for rewards.
    function rewardPool() public view returns (uint256) {
        return address(this).balance;
    }

    /// @return streak live streak, claimedToday, nextReward (today's reward if unclaimed, else tomorrow's),
    ///         certificateId, level, examPaid
    function getUser(
        address user
    )
        external
        view
        returns (
            uint256 streak,
            bool claimedToday,
            uint256 nextReward,
            uint256 certificateId,
            uint8 level,
            bool examPaid
        )
    {
        streak = currentStreak(user);
        claimedToday = lastClaimDay[user] == today();
        nextReward = rewardFor(streak + 1);
        return (streak, claimedToday, nextReward, certificateOf[user], levelOf[user], examPaidAt[user] != 0);
    }

    // ---------------------------------------------------------- certificate

    mapping(uint256 => uint256) private _certStreak;
    mapping(uint256 => uint8) private _certLevel;

    function levelName(uint8 level) public pure returns (string memory) {
        if (level == 1) return "A1";
        if (level == 2) return "A2";
        if (level == 3) return "B1";
        if (level == 4) return "B2";
        return "C1";
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        address holder = _requireOwned(tokenId);
        string memory addr = Strings.toHexString(holder);
        string memory streak = _certStreak[tokenId].toString();
        string memory lvl = levelName(_certLevel[tokenId]);
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">',
            '<rect width="600" height="400" rx="24" fill="#200052"/>',
            '<rect x="16" y="16" width="568" height="368" rx="16" fill="none" stroke="#836EF9" stroke-width="4"/>',
            '<text x="300" y="110" font-family="Arial" font-size="40" fill="#fff" text-anchor="middle" font-weight="bold">MONINGO</text>',
            '<text x="300" y="150" font-family="Arial" font-size="22" fill="#DDD7FE" text-anchor="middle">English Certificate</text>',
            '<circle cx="300" cy="215" r="42" fill="#836EF9"/>',
            '<text x="300" y="228" font-family="Arial" font-size="34" fill="#fff" text-anchor="middle" font-weight="bold">',
            lvl,
            '</text><text x="300" y="290" font-family="Arial" font-size="16" fill="#fff" text-anchor="middle">CEFR level verified on Monad | ',
            streak,
            " daily lessons</text>",
            '<text x="300" y="340" font-family="monospace" font-size="13" fill="#836EF9" text-anchor="middle">',
            addr,
            "</text></svg>"
        );
        string memory json = string.concat(
            '{"name":"Moningo Certificate #',
            tokenId.toString(),
            '","description":"Proof of completing daily English lessons on Moningo (Monad).",',
            '"attributes":[{"trait_type":"Level","value":"',
            lvl,
            '"},{"trait_type":"Daily lessons","value":',
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

    function withdrawPool(uint256 amount) external onlyOwner {
        (bool ok, ) = owner().call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }
}
