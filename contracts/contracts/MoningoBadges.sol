// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

interface IMoningoStreak {
    function userStreaks(address user) external view returns (uint256);
}

/// @title MoningoBadges - soulbound achievement NFTs with fully on-chain SVG art.
/// @notice Streak badges (ids 1-4) are trustless: eligibility is read from Moningo.userStreaks.
///         Duel badges (ids 11-13) need a verifier signature, since win streaks are tracked off-chain.
contract MoningoBadges is ERC721, Ownable {
    using Strings for uint256;

    IMoningoStreak public immutable moningo;
    address public verifier;
    uint256 public nextTokenId = 1;

    mapping(address => mapping(uint256 => uint256)) public badgeToken; // user => badgeId => tokenId
    mapping(uint256 => uint256) public badgeOf; // tokenId => badgeId

    event BadgeMinted(address indexed user, uint256 indexed badgeId, uint256 tokenId);

    error UnknownBadge();
    error NotEarned();
    error AlreadyOwned();
    error BadSignature();
    error Soulbound();

    constructor(address moningo_, address verifier_) ERC721("Moningo Badges", "MNGB") Ownable(msg.sender) {
        moningo = IMoningoStreak(moningo_);
        verifier = verifier_;
    }

    /// @return name, threshold, isDuel, color
    function badgeInfo(uint256 id) public pure returns (string memory, uint256, bool, string memory) {
        if (id == 1) return ("10-Day Streak", 10, false, "#836EF9");
        if (id == 2) return ("50-Day Streak", 50, false, "#A0055D");
        if (id == 3) return ("100-Day Streak", 100, false, "#F59E0B");
        if (id == 4) return ("1000-Day Legend", 1000, false, "#22D3EE");
        if (id == 11) return ("Duel Hot Streak", 3, true, "#F97316");
        if (id == 12) return ("Duel Unstoppable", 5, true, "#EF4444");
        if (id == 13) return ("Duel Champion", 10, true, "#FACC15");
        revert UnknownBadge();
    }

    function claimStreakBadge(uint256 id) external returns (uint256) {
        (, uint256 threshold, bool isDuel, ) = badgeInfo(id);
        if (isDuel) revert UnknownBadge();
        if (moningo.userStreaks(msg.sender) < threshold) revert NotEarned();
        return _mintBadge(msg.sender, id);
    }

    function claimDuelBadge(uint256 id, bytes calldata signature) external returns (uint256) {
        (, , bool isDuel, ) = badgeInfo(id);
        if (!isDuel) revert UnknownBadge();
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(badgeDigest(msg.sender, id));
        if (ECDSA.recover(digest, signature) != verifier) revert BadSignature();
        return _mintBadge(msg.sender, id);
    }

    function badgeDigest(address user, uint256 id) public view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), block.chainid, "BADGE", user, id));
    }

    function _mintBadge(address to, uint256 id) private returns (uint256 tokenId) {
        if (badgeToken[to][id] != 0) revert AlreadyOwned();
        tokenId = nextTokenId++;
        badgeToken[to][id] = tokenId;
        badgeOf[tokenId] = id;
        _safeMint(to, tokenId);
        emit BadgeMinted(to, id, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        uint256 id = badgeOf[tokenId];
        (string memory name, uint256 threshold, bool isDuel, string memory color) = badgeInfo(id);
        string memory big = threshold.toString();
        string memory unit = isDuel ? "WINS IN A ROW" : "DAY STREAK";
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs><radialGradient id="g" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/>',
            '<stop offset=".35" stop-color="',
            color,
            '"/><stop offset="1" stop-color="#200052"/></radialGradient></defs>',
            '<rect width="400" height="400" fill="#0b0620"/>',
            '<polygon points="200,28 348,114 348,286 200,372 52,286 52,114" fill="url(#g)" stroke="#DDD7FE" stroke-width="6"/>',
            '<text x="200" y="210" font-family="Arial" font-size="96" font-weight="bold" fill="#fff" text-anchor="middle">',
            big,
            "</text>",
            '<text x="200" y="255" font-family="Arial" font-size="20" font-weight="bold" fill="#fff" text-anchor="middle" letter-spacing="3">',
            unit,
            "</text>",
            '<text x="200" y="120" font-family="Arial" font-size="22" font-weight="bold" fill="#fff" text-anchor="middle">MONINGO</text></svg>'
        );
        string memory json = string.concat(
            '{"name":"',
            name,
            '","description":"Soulbound Moningo achievement badge on Monad.",',
            '"attributes":[{"trait_type":"Badge","value":"',
            name,
            '"},{"trait_type":"Type","value":"',
            isDuel ? "Duel" : "Streak",
            '"},{"trait_type":"Threshold","value":',
            big,
            '}],"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function setVerifier(address v) external onlyOwner {
        verifier = v;
    }
}
